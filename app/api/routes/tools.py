from __future__ import annotations

import io
from typing import Tuple

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from PIL import Image, ImageOps

router = APIRouter(prefix="/api/tools", tags=["tools"])


# ----------------------------
# Image helpers
# ----------------------------

def to_rgb(img: Image.Image, background=(255, 255, 255)) -> Image.Image:
    """
    Ensure RGB output.
    If alpha exists, composite onto background so JPEG doesn't create dark halos.
    """
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, background + (255,))
        out = Image.alpha_composite(bg, rgba).convert("RGB")
        return out
    return img.convert("RGB")


def resize_with_mode(
    img: Image.Image,
    out_w: int,
    out_h: int,
    mode: str,
    background=(255, 255, 255),
) -> Image.Image:
    """
    mode:
      - "stretch": force exact WxH (may distort)
      - "contain": keep aspect, pad to WxH
      - "cover": keep aspect, crop to WxH (best for passport photos)
    """
    if out_w <= 0 or out_h <= 0:
        raise ValueError("width_px and height_px must be > 0")

    if mode == "stretch":
        return img.resize((out_w, out_h), resample=Image.Resampling.LANCZOS)

    if mode == "contain":
        img2 = ImageOps.contain(img, (out_w, out_h), method=Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (out_w, out_h), background)
        x = (out_w - img2.width) // 2
        y = (out_h - img2.height) // 2
        canvas.paste(img2, (x, y))
        return canvas

    if mode == "cover":
        return ImageOps.fit(
            img,
            (out_w, out_h),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )

    raise ValueError("mode must be one of: stretch, contain, cover")


def encode_jpeg(
    img: Image.Image,
    quality: int,
    subsampling: int,
    optimize: bool,
    progressive: bool,
) -> bytes:
    buf = io.BytesIO()
    img.save(
        buf,
        format="JPEG",
        quality=quality,
        subsampling=subsampling,  # 0=4:4:4 best, 2=4:2:0 smaller
        optimize=optimize,
        progressive=progressive,
    )
    return buf.getvalue()


def best_jpeg_under_cap(
    img_rgb: Image.Image,
    max_bytes: int,
    subsampling: int = 2,
    q_min: int = 10,
    q_max: int = 95,
    optimize: bool = True,
    progressive: bool = True,
) -> Tuple[bytes, int]:
    """
    Binary search quality to find highest quality with size <= max_bytes.
    """
    if max_bytes <= 0:
        raise ValueError("max_bytes must be > 0")

    # If even lowest quality is too big -> impossible with these pixels
    low = encode_jpeg(img_rgb, q_min, subsampling, optimize, progressive)
    if len(low) > max_bytes:
        return low, q_min

    # If max quality already fits -> done
    high = encode_jpeg(img_rgb, q_max, subsampling, optimize, progressive)
    if len(high) <= max_bytes:
        return high, q_max

    best = low
    best_q = q_min
    lo, hi = q_min, q_max

    while lo <= hi:
        mid = (lo + hi) // 2
        data = encode_jpeg(img_rgb, mid, subsampling, optimize, progressive)
        if len(data) <= max_bytes:
            best, best_q = data, mid
            lo = mid + 1
        else:
            hi = mid - 1

    return best, best_q


def pad_jpeg_with_comment(jpeg_bytes: bytes, target_bytes: int, max_bytes: int) -> bytes:
    """
    Add JPEG COM segments (FF FE) right after SOI (FF D8) to increase file size
    without changing decoded image pixels.
    """
    if len(jpeg_bytes) >= target_bytes:
        return jpeg_bytes

    if jpeg_bytes[:2] != b"\xFF\xD8":
        raise ValueError("Not a JPEG (missing SOI marker)")

    # Minimum COM segment adds 4 bytes overhead (marker + length field) even with 0 payload.
    # If we need < 4 bytes increase, we must overshoot by up to 3 bytes.
    need = target_bytes - len(jpeg_bytes)
    if need < 4:
        target_bytes = target_bytes + (4 - need)

    if target_bytes > max_bytes:
        raise ValueError("Cannot pad to min size without exceeding max size")

    out = bytearray()
    out += jpeg_bytes[:2]  # SOI

    remaining = target_bytes - len(jpeg_bytes)
    # remaining >= 4 here
    while remaining > 0:
        # segment total added = 2(marker) + 2(length field) + payload = payload + 4
        payload = min(65533, remaining - 4)  # ensure we can finish exactly
        seg_len = payload + 2  # length field value includes itself
        out += b"\xFF\xFE"  # COM marker
        out += seg_len.to_bytes(2, "big")
        if payload:
            out += b"\x00" * payload
        remaining -= (payload + 4)

    out += jpeg_bytes[2:]  # rest of original jpeg

    if len(out) > max_bytes:
        raise ValueError("Padding exceeded max size")

    return bytes(out)


@router.post("/resize-pixels")
async def resize_pixels(
    file: UploadFile = File(...),
    width_px: int = Form(...),
    height_px: int = Form(...),
    min_kb: int = Form(5),
    max_kb: int = Form(30),
    mode: str = Form("cover"),          # cover | contain | stretch
):
    """
    Resize to exact pixels and produce JPEG strictly within [min_kb, max_kb] if possible.
    """
    if max_kb <= 0:
        raise HTTPException(status_code=400, detail="max_kb must be > 0")
    if min_kb < 0:
        min_kb = 0
    if min_kb > max_kb:
        raise HTTPException(status_code=400, detail="min_kb cannot be > max_kb")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # fixes phone rotation
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        img = to_rgb(img)
        img = resize_with_mode(img, width_px, height_px, mode=mode)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    min_bytes = min_kb * 1024
    max_bytes = max_kb * 1024

    # Pass 1: good default (small + quality)
    # subsampling=2 (4:2:0), optimize/progressive = True
    data, q = best_jpeg_under_cap(
        img_rgb=img,
        max_bytes=max_bytes,
        subsampling=2,
        optimize=True,
        progressive=True,
    )

    # If still too big even at low quality -> cannot satisfy cap at these pixels
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot reach <= {max_kb}KB with these pixel dimensions. "
                f"Try smaller pixels or increase max KB. Current ~{len(data)/1024:.1f}KB."
            ),
        )

    # If too small (< min), try increasing size without harming image:
    # - use subsampling=0 (4:4:4) and disable optimize/progressive (may increase size)
    if len(data) < min_bytes:
        data2, q2 = best_jpeg_under_cap(
            img_rgb=img,
            max_bytes=max_bytes,
            subsampling=0,
            optimize=False,
            progressive=False,
        )
        if len(data2) <= max_bytes and len(data2) > len(data):
            data, q = data2, q2

    # If still < min, pad with JPEG comment bytes (no visual change)
    if len(data) < min_bytes:
        try:
            data = pad_jpeg_with_comment(data, target_bytes=min_bytes, max_bytes=max_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    headers = {
        "Content-Disposition": 'attachment; filename="resized.jpg"',
        "X-Output-Bytes": str(len(data)),
        "X-Output-KB": f"{len(data)/1024:.3f}",
        "X-JPEG-Quality": str(q),
    }
    return Response(content=data, media_type="image/jpeg", headers=headers)
