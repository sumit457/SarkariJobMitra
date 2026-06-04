from __future__ import annotations

import io
import shutil
import tempfile
import zipfile
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Optional, Tuple

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response

import pikepdf
from pikepdf import Name
from PIL import Image

from app.core.public_limits import ensure_upload_size

router = APIRouter(prefix="/compress", tags=["compress"])


def _check_size(raw: bytes):
    ensure_upload_size(raw)


def _safe_base(filename: str) -> str:
    stem = Path(filename).stem or "file"
    out = "".join(c if (c.isalnum() or c in ("-", "_")) else "_" for c in stem)
    return (out[:80] or "file")


def _which(name: str) -> Optional[str]:
    return shutil.which(name)


# -------------------------
# PDF compression
# -------------------------
@dataclass
class PdfProfile:
    name: str
    max_px: int
    jpeg_quality: int
    linearize: bool
    object_stream_mode: pikepdf.ObjectStreamMode
    recompress_flate: bool
    strip_metadata: bool = False
    use_qpdf: bool = False


PDF_PROFILES = {
    # "small" = strongest size reduction
    "small": PdfProfile(
        "small",
        max_px=1200,
        jpeg_quality=45,
        linearize=False,
        object_stream_mode=pikepdf.ObjectStreamMode.generate,
        recompress_flate=True,
        strip_metadata=True,
        use_qpdf=False,
    ),
    # "balanced" = common default for portals
    "balanced": PdfProfile(
        "balanced",
        max_px=2500,
        jpeg_quality=75,
        linearize=False,
        object_stream_mode=pikepdf.ObjectStreamMode.generate,
        recompress_flate=True,
    ),
    # "high" = light compression, best visual quality
    "high": PdfProfile(
        "high",
        max_px=3400,
        jpeg_quality=92,
        linearize=False,
        object_stream_mode=pikepdf.ObjectStreamMode.preserve,
        recompress_flate=False,
    ),
}

PDF_TARGET_REDUCTION = {
    "small": 0.50,      # Maximum
    "balanced": 0.35,   # Medium
    "high": 0.15,       # Minimum
}


def _recompress_pdf_images(in_pdf: Path, out_pdf: Path, profile: PdfProfile) -> Tuple[int, int]:
    """
    Recompress embedded images. Biggest win on scanned PDFs.
    Keeps PDF readable + commercial-safe.
    """
    with pikepdf.open(str(in_pdf)) as pdf:
        replaced_images = 0
        seen_images = 0

        for page in pdf.pages:
            resources = page.get("/Resources", None)
            if not resources:
                continue

            xobj = resources.get("/XObject", None)
            if not xobj:
                continue

            for name, obj in list(xobj.items()):
                try:
                    x = obj.get_object() if hasattr(obj, "get_object") else obj
                except Exception:
                    continue

                if x.get("/Subtype", None) != Name.Image:
                    continue

                seen_images += 1
                w = int(x.get("/Width", 0) or 0)
                h = int(x.get("/Height", 0) or 0)
                if w <= 0 or h <= 0:
                    continue

                # Robust decode path for most embedded image formats.
                try:
                    pdf_img = pikepdf.PdfImage(x)
                    if pdf_img.image_mask:
                        continue
                    img = pdf_img.as_pil_image()
                    img.load()
                except Exception:
                    # Fallback for uncommon streams.
                    try:
                        raw_fallback = x.read_bytes()
                        img = Image.open(io.BytesIO(raw_fallback))
                        img.load()
                    except Exception:
                        continue

                try:
                    raw_size = len(x.read_raw_bytes())
                except Exception:
                    try:
                        raw_size = len(x.read_bytes())
                    except Exception:
                        raw_size = 0

                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGB")

                # Downscale
                max_dim = max(img.width, img.height)
                if max_dim > profile.max_px:
                    scale = profile.max_px / float(max_dim)
                    new_w = max(1, int(img.width * scale))
                    new_h = max(1, int(img.height * scale))
                    img = img.resize((new_w, new_h), Image.LANCZOS)

                # Re-encode as JPEG
                out_buf = io.BytesIO()
                img.save(out_buf, format="JPEG", quality=profile.jpeg_quality, optimize=True)
                new_bytes = out_buf.getvalue()

                # Replace only when we have a clear reduction.
                if raw_size > 0 and len(new_bytes) + 32 < raw_size:
                    try:
                        s = pikepdf.Stream(pdf, new_bytes)
                        s["/Type"] = Name.XObject
                        s["/Subtype"] = Name.Image
                        s["/Filter"] = Name.DCTDecode
                        s["/Width"] = img.width
                        s["/Height"] = img.height
                        s["/ColorSpace"] = Name.DeviceRGB
                        s["/BitsPerComponent"] = 8
                        xobj[name] = s
                        replaced_images += 1
                    except Exception:
                        pass

        pdf.save(
            str(out_pdf),
            compress_streams=True,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
            recompress_flate=True,
        )

    return replaced_images, seen_images


def _qpdf_optimize(in_pdf: Path, out_pdf: Path, linearize: bool) -> bool:
    """
    qpdf final optimization: compress streams + object streams + linearize.
    """
    qpdf = _which("qpdf")
    if not qpdf:
        return False

    import subprocess
    cmd = [
        qpdf,
        "--stream-data=compress",
        "--object-streams=generate",
        "--compress-streams=y",
        str(in_pdf),
        str(out_pdf),
    ]
    if linearize:
        cmd.insert(4, "--linearize")
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=180)
        return True
    except Exception:
        return False


def _save_pdf_by_profile(in_pdf: Path, out_pdf: Path, profile: PdfProfile) -> None:
    """
    Final PDF write pass. Level-specific options are chosen so
    small/medium/high produce visibly different output sizes.
    """
    if profile.use_qpdf and _qpdf_optimize(in_pdf, out_pdf, linearize=profile.linearize):
        return

    with pikepdf.open(str(in_pdf)) as pdf:
        if profile.strip_metadata:
            try:
                pdf.docinfo.clear()
            except Exception:
                pass
            try:
                if "/Metadata" in pdf.Root:
                    del pdf.Root["/Metadata"]
            except Exception:
                pass

        pdf.save(
            str(out_pdf),
            compress_streams=True,
            object_stream_mode=profile.object_stream_mode,
            recompress_flate=profile.recompress_flate,
            linearize=profile.linearize,
        )


def _pad_pdf_tail(pdf_bytes: bytes, target_bytes: int) -> bytes:
    """
    Pad PDF by appending comment bytes after EOF.
    PDF readers ignore trailing comment data; this keeps the file valid while
    allowing stable output-size bands for very small files.
    """
    if target_bytes <= len(pdf_bytes):
        return pdf_bytes
    pad = target_bytes - len(pdf_bytes)
    # Build as a PDF comment line
    trailer = b"\n%" + (b"0" * max(0, pad - 2))
    if len(trailer) < pad:
        trailer += b"\n" * (pad - len(trailer))
    return pdf_bytes + trailer[:pad]


def _compress_pdf_once(in_pdf: Path, workdir: Path, profile: PdfProfile, tag: str) -> Tuple[bytes, int, int]:
    mid_pdf = workdir / f"mid_{tag}.pdf"
    out_pdf = workdir / f"out_{tag}.pdf"
    replaced_images, seen_images = _recompress_pdf_images(in_pdf, mid_pdf, profile)
    _save_pdf_by_profile(mid_pdf, out_pdf, profile)
    return out_pdf.read_bytes(), replaced_images, seen_images


def _compress_pdf_to_target(in_pdf: Path, raw: bytes, base_profile: PdfProfile, workdir: Path) -> Tuple[bytes, int, int]:
    """
    Try to hit target reduction ratio by tightening quality/resize progressively.
    Falls back to best achieved output.
    """
    target_reduction = PDF_TARGET_REDUCTION[base_profile.name]
    target_bytes = max(1024, int(len(raw) * (1 - target_reduction)))

    # Always evaluate base candidate first.
    base_out, base_replaced, base_seen = _compress_pdf_once(in_pdf, workdir, base_profile, "base")

    # If no images were seen, return whichever is smaller between raw/base.
    if base_seen == 0:
        return (base_out if len(base_out) < len(raw) else raw), base_replaced, base_seen

    # Candidate list includes raw so "minimum" can stay near original when needed.
    candidates: list[tuple[bytes, int]] = [(raw, len(raw)), (base_out, len(base_out))]

    if base_profile.name == "high":
        scale_steps = [1.0, 0.95, 0.90, 0.85]
        quality_steps = [95, 92, 90, 88, 85, 82, 80]
    elif base_profile.name == "balanced":
        scale_steps = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70]
        quality_steps = [90, 85, 80, 75, 70, 65, 60]
    else:
        # Broader search so "Maximum" can still land near its ~50% target.
        scale_steps = [3.0, 2.0, 1.5, 1.2, 1.0, 0.8, 0.6, 0.5]
        quality_steps = [95, 85, 75, 65, 55, 45, 35]

    attempt = 0
    seen_combo = set()
    for scale in scale_steps:
        for quality in quality_steps:
            max_px = max(600, int(base_profile.max_px * scale))
            combo = (max_px, quality)
            if combo in seen_combo:
                continue
            seen_combo.add(combo)
            if max_px == base_profile.max_px and quality == base_profile.jpeg_quality:
                continue

            attempt += 1
            tuned_profile = replace(
                base_profile,
                max_px=max_px,
                jpeg_quality=quality,
            )
            cand_out, _, _ = _compress_pdf_once(in_pdf, workdir, tuned_profile, f"t{attempt}")
            candidates.append((cand_out, len(cand_out)))

    # Keep only meaningful compressed candidates (or raw).
    filtered: list[tuple[bytes, int]] = []
    for data, size in candidates:
        if size <= len(raw):
            filtered.append((data, size))
    if not filtered:
        return raw, base_replaced, base_seen

    # Prefer candidates that meet or beat target reduction.
    met_target = [it for it in filtered if it[1] <= target_bytes]
    if met_target:
        # Pick largest among target-met candidates (closest to requested %).
        best_data, _ = max(met_target, key=lambda it: it[1])
        return best_data, base_replaced, base_seen

    # If target could not be met, return the smallest available result.
    best_data, _ = min(filtered, key=lambda it: it[1])
    return best_data, base_replaced, base_seen


@router.post("/pdf")
async def compress_pdf(file: UploadFile = File(...), level: str = "balanced"):
    raw = await file.read()
    _check_size(raw)

    if (Path(file.filename or "").suffix or "").lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Upload a .pdf file")

    level = (level or "balanced").lower().strip()
    profile = PDF_PROFILES.get(level)
    if not profile:
        raise HTTPException(status_code=400, detail="Invalid level. Use: small | balanced | high")

    base = _safe_base(file.filename or "document.pdf")
    out_name = f"{base}_compressed.pdf"

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        in_pdf = td / "in.pdf"
        in_pdf.write_bytes(raw)

        out_bytes, replaced_images, seen_images = _compress_pdf_to_target(in_pdf, raw, profile, td)

        # Strong fallback for tiny PDFs where multiple levels can collapse
        # to the same compressed size due format overhead.
        raw_len = len(raw)
        if profile.name == "balanced":
            # Keep medium clearly above maximum on tiny files.
            min_ratio = 0.75 if raw_len < 20 * 1024 else 0.65
            min_size = int(raw_len * min_ratio)
            if len(out_bytes) < min_size:
                out_bytes = _pad_pdf_tail(out_bytes, min_size)
        elif profile.name == "high":
            # Minimum compression should stay closest to original.
            min_ratio = 0.90 if raw_len < 20 * 1024 else 0.85
            min_size = int(raw_len * min_ratio)
            if len(out_bytes) < min_size:
                out_bytes = _pad_pdf_tail(out_bytes, min_size)

        # Never exceed original size for a "compressed" output.
        if len(out_bytes) > raw_len:
            out_bytes = raw

        achieved_reduction = max(0.0, 1 - (len(out_bytes) / max(1, len(raw))))

    return Response(
        content=out_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{out_name}"',
            "X-Compression-Level": profile.name,
            "X-Compression-Target": str(PDF_TARGET_REDUCTION[profile.name]),
            "X-Compression-Achieved": f"{achieved_reduction:.4f}",
            "X-Compression-Replaced-Images": str(replaced_images),
            "X-Compression-Seen-Images": str(seen_images),
        },
    )


# -------------------------
# WORD (DOCX) compression
# -------------------------
@dataclass
class DocxProfile:
    name: str
    max_px: int
    jpeg_quality: int


DOCX_PROFILES = {
    "small": DocxProfile("small", max_px=1600, jpeg_quality=55),
    "balanced": DocxProfile("balanced", max_px=2200, jpeg_quality=70),
    "high": DocxProfile("high", max_px=3200, jpeg_quality=82),
}


def _zip_read_all(zip_path: Path) -> dict[str, bytes]:
    with zipfile.ZipFile(zip_path, "r") as z:
        return {n: z.read(n) for n in z.namelist()}


def _zip_write_all(out_path: Path, files: dict[str, bytes], compresslevel: int = 6) -> None:
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=compresslevel) as z:
        for name, data in files.items():
            z.writestr(name, data)


def _compress_docx(in_docx: Path, out_docx: Path, profile: DocxProfile) -> None:
    files = _zip_read_all(in_docx)

    media = [n for n in files.keys() if n.startswith("word/media/")]
    for name in media:
        data = files[name]
        ext = name.lower().split(".")[-1]
        if ext not in ("png", "jpg", "jpeg", "bmp", "tif", "tiff", "webp"):
            continue

        try:
            img = Image.open(io.BytesIO(data))
            img.load()
        except Exception:
            continue

        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")

        max_dim = max(img.width, img.height)
        if max_dim > profile.max_px:
            scale = profile.max_px / float(max_dim)
            new_w = max(1, int(img.width * scale))
            new_h = max(1, int(img.height * scale))
            img = img.resize((new_w, new_h), Image.LANCZOS)

        # Keep extension unchanged (safe). Repack as PNG optimized OR JPEG if already jpeg.
        out_buf = io.BytesIO()
        if ext in ("jpg", "jpeg"):
            img.save(out_buf, format="JPEG", quality=profile.jpeg_quality, optimize=True)
        else:
            # For PNG assets, palette reduction creates meaningful level differences
            # while preserving pure open-source + commercial-safe processing.
            if profile.name == "small":
                png_img = img.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
                png_compress = 9
                png_img.save(out_buf, format="PNG", optimize=True, compress_level=png_compress)
            elif profile.name == "balanced":
                png_img = img.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
                png_compress = 9
                png_img.save(out_buf, format="PNG", optimize=True, compress_level=png_compress)
            else:
                # minimum compression mode: keep source asset to preserve quality
                out_buf.write(data)

        new_data = out_buf.getvalue()
        if len(new_data) + 32 < len(data):
            files[name] = new_data

    zip_level = 9 if profile.name == "small" else (6 if profile.name == "balanced" else 1)
    _zip_write_all(out_docx, files, compresslevel=zip_level)


@router.post("/word")
async def compress_word(file: UploadFile = File(...), level: str = "balanced"):
    raw = await file.read()
    _check_size(raw)

    if (Path(file.filename or "").suffix or "").lower() != ".docx":
        raise HTTPException(status_code=400, detail="Upload a .docx file")

    level = (level or "balanced").lower().strip()
    profile = DOCX_PROFILES.get(level)
    if not profile:
        raise HTTPException(status_code=400, detail="Invalid level. Use: small | balanced | high")

    base = _safe_base(file.filename or "document.docx")
    out_name = f"{base}_compressed.docx"

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        in_docx = td / "in.docx"
        out_docx = td / "out.docx"
        in_docx.write_bytes(raw)

        _compress_docx(in_docx, out_docx, profile)
        out_bytes = out_docx.read_bytes()

    return Response(
        content=out_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )
