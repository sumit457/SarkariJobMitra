from __future__ import annotations

import io
from typing import Optional, Tuple, Literal

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageOps

router = APIRouter(prefix="/image-tools", tags=["image-tools"])



# ----------------------------
# Math / correctness notes
# ----------------------------
# KB -> bytes:
#   bytes = KB * 1024
#
# cm -> pixels given DPI:
#   inches = cm / 2.54
#   pixels = round(inches * DPI) = round(cm * DPI / 2.54)
#
# We:
# 1) Fix EXIF rotation
# 2) Convert to RGB (alpha composited)
# 3) Resize based on fit mode
# 4) Encode JPEG with binary-search on quality to be <= maxBytes
# 5) If output is < minBytes, we pad via JPEG COM segments (valid JPEG, pixels unchanged)
# ----------------------------


def _to_rgb(img: Image.Image, background=(255, 255, 255)) -> Image.Image:
    """Convert to RGB; if alpha exists, composite on white to avoid dark halos in JPEG."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, background + (255,))
        return Image.alpha_composite(bg, rgba).convert("RGB")
    return img.convert("RGB")


def _resize_cover(img: Image.Image, w: int, h: int) -> Image.Image:
    return ImageOps.fit(img, (w, h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def _resize_contain_pad(img: Image.Image, w: int, h: int, background=(255, 255, 255)) -> Image.Image:
    fitted = ImageOps.contain(img, (w, h), method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (w, h), background)
    x = (w - fitted.width) // 2
    y = (h - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    return canvas


def _resize_stretch(img: Image.Image, w: int, h: int) -> Image.Image:
    return img.resize((w, h), resample=Image.Resampling.LANCZOS)


def _resize_keep_aspect_within(img: Image.Image, w: int, h: int) -> Image.Image:
    """
    Keep aspect ratio and fit inside WxH WITHOUT padding.
    Output dims may be <= WxH.
    Scale factor:
      s = min(w/W, h/H)
      W' = round(W*s), H' = round(H*s)
    """
    W, H = img.size
    s = min(w / W, h / H)
    W2 = max(1, int(round(W * s)))
    H2 = max(1, int(round(H * s)))
    return img.resize((W2, H2), resample=Image.Resampling.LANCZOS)


def _encode_jpeg(img: Image.Image, quality: int, subsampling: int, optimize: bool) -> bytes:
    """
    progressive=False for max compatibility (some portals reject progressive JPEG).
    subsampling: 2=4:2:0 (standard smaller), 0=4:4:4 (bigger, better chroma)
    """
    buf = io.BytesIO()
    img.save(
        buf,
        format="JPEG",
        quality=quality,
        subsampling=subsampling,
        optimize=optimize,
        progressive=False,
    )
    return buf.getvalue()


def _best_jpeg_under_cap(img_rgb: Image.Image, max_bytes: int) -> Tuple[bytes, int]:
    """
    Binary search JPEG quality to get highest quality with len(bytes) <= max_bytes.
    """
    if max_bytes <= 0:
        raise ValueError("max_bytes must be > 0")

    q_min, q_max = 10, 95

    low = _encode_jpeg(img_rgb, q_min, subsampling=2, optimize=True)
    if len(low) > max_bytes:
        return low, q_min

    high = _encode_jpeg(img_rgb, q_max, subsampling=2, optimize=True)
    if len(high) <= max_bytes:
        return high, q_max

    best, best_q = low, q_min
    lo, hi = q_min, q_max
    while lo <= hi:
        mid = (lo + hi) // 2
        data = _encode_jpeg(img_rgb, mid, subsampling=2, optimize=True)
        if len(data) <= max_bytes:
            best, best_q = data, mid
            lo = mid + 1
        else:
            hi = mid - 1

    return best, best_q


def _pad_jpeg_with_comment(jpeg_bytes: bytes, target_bytes: int, max_bytes: int) -> bytes:
    """
    Pad JPEG using COM segments (FF FE) right after SOI (FF D8).
    Increases file size without changing decoded pixels.
    """
    if len(jpeg_bytes) >= target_bytes:
        return jpeg_bytes
    if jpeg_bytes[:2] != b"\xFF\xD8":
        raise ValueError("Not a valid JPEG (missing SOI marker)")

    need = target_bytes - len(jpeg_bytes)
    if need < 4:
        target_bytes += (4 - need)

    if target_bytes > max_bytes:
        raise ValueError("Cannot pad to target without exceeding max size")

    out = bytearray()
    out += jpeg_bytes[:2]  # SOI

    remaining = target_bytes - len(jpeg_bytes)
    while remaining > 0:
        payload = min(65533, remaining - 4)
        seg_len = payload + 2
        out += b"\xFF\xFE"
        out += seg_len.to_bytes(2, "big")
        if payload:
            out += b"\x00" * payload
        remaining -= (payload + 4)

    out += jpeg_bytes[2:]
    if len(out) > max_bytes:
        raise ValueError("Padding exceeded max size")

    return bytes(out)


def _cm_to_px(cm: float, dpi: int) -> int:
    # px = round(cm * dpi / 2.54)
    return max(1, int(round(cm * dpi / 2.54)))


FitMode = Literal["original", "crop", "pad", "stretch"]


@router.post("/image-resize")
async def image_resize(
    file: UploadFile = File(...),

    # Which UI tab user chose:
    tool: Literal["kb", "dimensions"] = Form("kb"),

    # KB sizing mode:
    kb_mode: Literal["exact", "range"] = Form("range"),
    target_kb: Optional[int] = Form(None),
    min_kb: int = Form(5),
    max_kb: int = Form(30),

    # Dimension options:
    keep_original_dimensions: bool = Form(True),
    unit: Literal["px", "cm"] = Form("px"),
    width: Optional[float] = Form(None),    # float supports cm as well
    height: Optional[float] = Form(None),
    dpi: int = Form(300),

    # Fit buttons:
    fit: FitMode = Form("original"),
):
    """
    One endpoint for your whole UI:

    - tool="kb": user mainly wants correct file size; can keep original dimensions or resize too.
    - tool="dimensions": user wants width/height (px or cm); can also apply KB exact/range.
    """

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    img = _to_rgb(img)

    # ----------------------------
    # Decide output dimensions
    # ----------------------------
    out_img = img

    if not keep_original_dimensions:
        if width is None or height is None:
            raise HTTPException(status_code=400, detail="width and height required when not keeping original dimensions")

        if dpi <= 0:
            raise HTTPException(status_code=400, detail="dpi must be > 0")

        if unit == "px":
            w_px = int(round(width))
            h_px = int(round(height))
        else:
            # cm -> px using px = round(cm * dpi / 2.54)
            w_px = _cm_to_px(float(width), dpi)
            h_px = _cm_to_px(float(height), dpi)

        if w_px <= 0 or h_px <= 0:
            raise HTTPException(status_code=400, detail="width/height must be > 0")

        if fit == "original":
            # keep aspect inside given box, no pad
            out_img = _resize_keep_aspect_within(img, w_px, h_px)
        elif fit == "crop":
            out_img = _resize_cover(img, w_px, h_px)
        elif fit == "pad":
            out_img = _resize_contain_pad(img, w_px, h_px)
        elif fit == "stretch":
            out_img = _resize_stretch(img, w_px, h_px)
        else:
            raise HTTPException(status_code=400, detail="Invalid fit mode")

    # ----------------------------
    # Decide KB targets
    # ----------------------------
    if kb_mode == "exact":
        if target_kb is None:
            raise HTTPException(status_code=400, detail="target_kb required for exact mode")
        min_bytes = max_bytes = target_kb * 1024
    else:
        if max_kb <= 0:
            raise HTTPException(status_code=400, detail="max_kb must be > 0")
        if min_kb < 0:
            min_kb = 0
        if min_kb > max_kb:
            raise HTTPException(status_code=400, detail="min_kb cannot be > max_kb")
        min_bytes = min_kb * 1024
        max_bytes = max_kb * 1024

    # ----------------------------
    # Encode to JPEG with best quality under cap
    # ----------------------------
    data, q = _best_jpeg_under_cap(out_img, max_bytes=max_bytes)

    # If impossible to be <= max_bytes at these pixels:
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot reach <= {max_bytes/1024:.0f}KB with these dimensions. "
                f"Try smaller dimensions or higher KB limit. Current ~{len(data)/1024:.1f}KB."
            ),
        )

    # If too small, try bigger encoding first (4:4:4 no optimize), then pad
    if len(data) < min_bytes:
        data2 = _encode_jpeg(out_img, quality=q, subsampling=0, optimize=False)
        if len(data2) <= max_bytes and len(data2) > len(data):
            data = data2

    if len(data) < min_bytes:
        data = _pad_jpeg_with_comment(data, target_bytes=min_bytes, max_bytes=max_bytes)

    headers = {
        "Content-Disposition": 'attachment; filename="resized.jpg"',
        "X-Output-Bytes": str(len(data)),
        "X-Output-KB": f"{len(data)/1024:.3f}",
        "X-JPEG-Quality": str(q),
        "X-Output-Width": str(out_img.size[0]),
        "X-Output-Height": str(out_img.size[1]),
    }
    return Response(content=data, media_type="image/jpeg", headers=headers)
