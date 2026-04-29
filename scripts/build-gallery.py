"""
Build the gallery: read assets/gallery/originals/<series>/<image>, emit WebP
variants under assets/gallery/, and write assets/gallery/manifest.json.

Idempotent: skips items whose source file is older than the derived files.
Run from the project root:

    python3 scripts/build-gallery.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "assets" / "gallery" / "originals"
DERIVED = ROOT / "assets" / "gallery"
MANIFEST = DERIVED / "manifest.json"

WIDTHS = {"thumb": 800, "mid": 1400, "full": 2000}
WEBP_QUALITY = 78
WEBP_METHOD = 6

EXTS = {".jpg", ".jpeg", ".png"}

# Display-friendly labels per series slug. New folders default to titlecased slug.
SERIES_LABELS = {
    "aerialarts-2025":            "Aerial Arts · 2025",
    "agua-y-mezcal":              "Agua y Mezcal",
    "coreografia-mind":           "Coreografía · Mind",
    "sesion-hans":                "Sesión · Hans",
    "sesion-rawlight-polemaniamx":"RawLight × Polemania MX",
    "sesion-portaits":            "Retratos · Estudio",
    "vestuario-luna":             "Vestuario · Luna",
}

# Visual order in the gallery (slugs not in this list go to the end, alphabetical).
SERIES_ORDER = [
    "sesion-rawlight-polemaniamx",
    "aerialarts-2025",
    "agua-y-mezcal",
    "vestuario-luna",
    "sesion-hans",
    "sesion-portaits",
    "coreografia-mind",
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def needs_rebuild(source: Path, derived_paths: list[Path]) -> bool:
    if not all(p.exists() for p in derived_paths):
        return True
    src_mtime = source.stat().st_mtime
    return any(p.stat().st_mtime < src_mtime for p in derived_paths)


def process_image(source: Path, slug: str) -> dict:
    img = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    w0, h0 = img.size

    out = {"id": slug, "w": w0, "h": h0, "ratio": round(w0 / h0, 4)}
    derived_files = []
    for variant, target_w in WIDTHS.items():
        out_path = DERIVED / f"{slug}-{variant}.webp"
        out[variant] = out_path.relative_to(ROOT).as_posix()
        derived_files.append(out_path)

    if not needs_rebuild(source, derived_files):
        return out

    for variant, target_w in WIDTHS.items():
        w = min(target_w, w0)
        h = round(h0 * (w / w0))
        resized = img.resize((w, h), Image.LANCZOS)
        out_path = DERIVED / f"{slug}-{variant}.webp"
        resized.save(out_path, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
        print(f"    {out_path.name}  {w}x{h}  {out_path.stat().st_size/1024:.0f} KB")

    return out


def discover_series() -> list[tuple[str, Path]]:
    """Returns [(slug, dir_path)] for each subdirectory under originals/."""
    if not ORIGINALS.exists():
        sys.exit(f"originals folder not found: {ORIGINALS}")
    series = []
    for child in sorted(ORIGINALS.iterdir()):
        if not child.is_dir():
            continue
        series.append((slugify(child.name), child))
    return series


def order_key(slug: str) -> tuple:
    if slug in SERIES_ORDER:
        return (0, SERIES_ORDER.index(slug))
    return (1, slug)


def main() -> None:
    series_data = []
    series_dirs = discover_series()

    for series_slug, series_dir in series_dirs:
        files = sorted(
            p for p in series_dir.iterdir()
            if p.is_file() and p.suffix.lower() in EXTS
        )
        if not files:
            continue

        label = SERIES_LABELS.get(series_slug, series_dir.name.title())
        print(f"\n[{series_slug}] {label} — {len(files)} files")

        items = []
        for idx, source in enumerate(files, start=1):
            slug = f"{series_slug}-{idx:02d}"
            print(f"  {source.name} -> {slug}")
            items.append(process_image(source, slug))

        series_data.append({"slug": series_slug, "label": label, "items": items})

    series_data.sort(key=lambda s: order_key(s["slug"]))

    manifest = {"version": 1, "series": series_data}
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    total = sum(len(s["items"]) for s in series_data)
    print(f"\nManifest written: {MANIFEST.relative_to(ROOT)} — {total} items, {len(series_data)} series")

    expected = set()
    for s in series_data:
        for item in s["items"]:
            for variant in WIDTHS:
                expected.add(f"{item['id']}-{variant}.webp")

    removed = 0
    for path in DERIVED.glob("*.webp"):
        if path.name not in expected:
            path.unlink()
            removed += 1
    if removed:
        print(f"Cleaned {removed} orphan derivative(s)")


if __name__ == "__main__":
    main()
