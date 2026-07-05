#!/usr/bin/env python3
"""Generate the shared Webdevful template logo family.

The portfolio logo pattern is:
  cursive "web" source mark + vertical divider + template name

LPF also uses a browser-tab identity preview lockup:
  cursive "W" source mark + vertical divider + template name

The actual browser favicon files are square PNG tabs with the cursive W inside.
The horizontal favicon-tab PNGs are still required because they document and
preview the tab identity, but browsers consume the square favicon files from
the page head.
"""

from __future__ import annotations

import argparse
import base64
import os
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT_DIR / "public" / "assets" / "header" / "webdevful-logo-white.svg"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "public" / "images"

WHITE = (255, 255, 255, 255)
DARK = (23, 52, 47, 255)
BRAND_RED = (232, 80, 91, 255)


def title_from_folder(folder: str) -> str:
    words = [part for part in re.split(r"[-_\s]+", folder) if part]
    return " ".join(word[:1].upper() + word[1:] for word in words) or "Template"


def slug_from_name(name: str) -> str:
    parts = [part for part in re.split(r"[^a-zA-Z0-9]+", name.lower()) if part]
    return "-".join(parts)


def canonical_project_slug_folder(root: Path) -> str:
    """Return the public slug folder, including standalone LPF /repo checkouts."""
    if root.name != "repo":
        return root.name

    parent_slug = root.parent.name
    if parent_slug and parent_slug not in {"01-Product-Repos", "repo"}:
        return parent_slug

    return root.name


def resolve_template_name(explicit_name: str | None, allow_override: bool) -> str:
    folder_name = canonical_project_slug_folder(ROOT_DIR)
    folder_title = title_from_folder(folder_name)
    template_name = explicit_name or os.environ.get("WEBDEVFUL_TEMPLATE_NAME") or folder_title

    if slug_from_name(template_name) != slug_from_name(folder_name) and not allow_override:
        raise ValueError(
            "Template name must match the project folder slug. "
            f"Project root '{ROOT_DIR}' resolves to slug '{folder_name}' and title "
            f"'{folder_title}', but received '{template_name}'. "
            "Rename the project folder first, then regenerate the logo. "
            "Use --allow-name-override only for an explicitly approved exception."
        )

    return template_name


def load_source_mark(path: Path) -> Image.Image:
    if path.suffix.lower() == ".png":
        return Image.open(path).convert("RGBA")

    svg = path.read_text(encoding="utf-8")
    match = re.search(r"base64,([^\"']+)", svg, re.DOTALL)
    if not match:
        raise ValueError(f"No embedded base64 image found in {path}")

    raw = base64.b64decode(re.sub(r"\s+", "", match.group(1)))
    return Image.open(BytesIO(raw)).convert("RGBA")


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > 8 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("Source mark crop is empty")
    return bbox


def isolate_web_mark(source: Image.Image, crop_ratio: float) -> Image.Image:
    crop_right = int(source.width * crop_ratio)
    web_region = source.crop((0, 0, crop_right, source.height))
    web_region = web_region.crop(alpha_bbox(web_region))
    return web_region


def isolate_w_mark(source: Image.Image, crop_ratio: float) -> Image.Image:
    crop_right = int(source.width * crop_ratio)
    w_region = source.crop((0, 0, crop_right, source.height))
    w_region = w_region.crop(alpha_bbox(w_region))
    return w_region


def colorize_alpha(source: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    alpha = source.getchannel("A")
    colored = Image.new("RGBA", source.size, color)
    colored.putalpha(alpha)
    return colored


def load_name_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Avenir Next.ttc",
        "/System/Library/Fonts/Avenir.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def fit_name_font(name: str, max_width: int, start_size: int) -> ImageFont.ImageFont:
    for size in range(start_size, 27, -1):
        font = load_name_font(size)
        if int(font.getlength(name)) <= max_width:
            return font
    return load_name_font(28)


def fit_name_font_by_height(name: str, target_height: int, max_size: int = 220) -> ImageFont.ImageFont:
    """Size the landing-page name so its cap height matches the cursive mark.

    WLFS lockup intent: the name is as tall as the `web`/`W` mark on the other
    side of the divider. Size by glyph height (not by fitting a fixed width), so
    long names keep the documented height and the canvas grows wider instead of
    shrinking the name.
    """
    chosen = load_name_font(28)
    for size in range(28, max_size + 1):
        font = load_name_font(size)
        bbox = font.getbbox(name)
        height = bbox[3] - bbox[1]
        if height > target_height:
            break
        chosen = font
    return chosen


def render_logo(
    template_name: str,
    source_logo: Path,
    output_path: Path,
    color: tuple[int, int, int, int],
    crop_ratio: float,
) -> None:
    source = load_source_mark(source_logo)
    web_mark = isolate_web_mark(source, crop_ratio)

    canvas_height = 160
    margin_x = 30
    web_height = 104
    divider_gap = 34
    text_gap = 34
    divider_width = 4
    divider_height = 112
    # WLFS: the landing-page name is sized to match the cursive `web` mark
    # height (the "other side of the logo"), not shrunk to fit a fixed width.
    name_target_height = 92

    web_width = round(web_mark.width * (web_height / web_mark.height))
    web_mark = web_mark.resize((web_width, web_height), Image.Resampling.LANCZOS)
    web_mark = colorize_alpha(web_mark, color)

    font = fit_name_font_by_height(template_name, name_target_height)
    text_bbox = font.getbbox(template_name)
    text_width = int(font.getlength(template_name))
    text_height = text_bbox[3] - text_bbox[1]

    canvas_width = margin_x + web_width + divider_gap + divider_width + text_gap + text_width + margin_x
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    web_x = margin_x
    web_y = (canvas_height - web_height) // 2 + 2
    canvas.alpha_composite(web_mark, (web_x, web_y))

    divider_x = web_x + web_width + divider_gap
    divider_y = (canvas_height - divider_height) // 2
    draw.rounded_rectangle(
        (divider_x, divider_y, divider_x + divider_width, divider_y + divider_height),
        radius=2,
        fill=color,
    )

    text_x = divider_x + divider_width + text_gap
    text_y = (canvas_height - text_height) // 2 - text_bbox[1]
    draw.text((text_x, text_y), template_name, fill=color, font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"Generated {output_path}")


def render_favicon_tab_logo(
    template_name: str,
    source_logo: Path,
    output_path: Path,
    color: tuple[int, int, int, int],
    crop_ratio: float,
) -> None:
    source = load_source_mark(source_logo)
    w_mark = isolate_w_mark(source, crop_ratio)

    canvas_height = 128
    margin_x = 24
    tab_size = 92
    mark_max_width = round(tab_size * 0.72)
    mark_max_height = round(tab_size * 0.54)
    divider_gap = 24
    text_gap = 24
    divider_width = 4
    divider_height = 84
    max_text_width = 420

    scale = min(mark_max_width / w_mark.width, mark_max_height / w_mark.height)
    mark_width = round(w_mark.width * scale)
    mark_height = round(w_mark.height * scale)
    w_mark = w_mark.resize((mark_width, mark_height), Image.Resampling.LANCZOS)
    w_mark = colorize_alpha(w_mark, WHITE)

    font = fit_name_font(template_name, max_text_width, 58)
    text_bbox = font.getbbox(template_name)
    text_width = int(font.getlength(template_name))
    text_height = text_bbox[3] - text_bbox[1]

    canvas_width = margin_x + tab_size + divider_gap + divider_width + text_gap + text_width + margin_x
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    tab_x = margin_x
    tab_y = (canvas_height - tab_size) // 2
    draw.rounded_rectangle(
        (tab_x, tab_y, tab_x + tab_size, tab_y + tab_size),
        radius=round(tab_size * 0.18),
        fill=BRAND_RED,
    )
    mark_x = tab_x + (tab_size - mark_width) // 2
    mark_y = tab_y + (tab_size - mark_height) // 2 + round(tab_size * 0.03)
    canvas.alpha_composite(w_mark, (mark_x, mark_y))

    divider_x = tab_x + tab_size + divider_gap
    divider_y = (canvas_height - divider_height) // 2
    draw.rounded_rectangle(
        (divider_x, divider_y, divider_x + divider_width, divider_y + divider_height),
        radius=2,
        fill=BRAND_RED,
    )

    text_x = divider_x + divider_width + text_gap
    text_y = (canvas_height - text_height) // 2 - text_bbox[1]
    draw.text((text_x, text_y), template_name, fill=color, font=font)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"Generated {output_path}")


def render_favicon_mark(
    source_logo: Path,
    output_path: Path,
    color: tuple[int, int, int, int],
    crop_ratio: float,
    size: int,
) -> None:
    source = load_source_mark(source_logo)
    w_mark = isolate_w_mark(source, crop_ratio)

    max_width = round(size * 0.72)
    max_height = round(size * 0.54)
    scale = min(max_width / w_mark.width, max_height / w_mark.height)
    mark_width = round(w_mark.width * scale)
    content_height = round(w_mark.height * scale)
    w_mark = w_mark.resize((mark_width, content_height), Image.Resampling.LANCZOS)
    w_mark = colorize_alpha(w_mark, WHITE)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    radius = max(2, round(size * 0.18))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BRAND_RED)

    x = (size - mark_width) // 2
    y = (size - content_height) // 2 + round(size * 0.03)
    canvas.alpha_composite(w_mark, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "PNG", optimize=True)
    print(f"Generated {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Webdevful template logo PNG assets.")
    parser.add_argument(
        "--template-name",
        default=None,
        help=(
            "Optional display name placed after the divider. Defaults to the "
            "project folder slug, e.g. folder 'tapa-hotel' renders 'Tapa Hotel'. "
            "Standalone LPF repos ending in '/repo' resolve from the parent slug."
        ),
    )
    parser.add_argument(
        "--allow-name-override",
        action="store_true",
        help="Allow --template-name or WEBDEVFUL_TEMPLATE_NAME to differ from the folder-derived name.",
    )
    parser.add_argument(
        "--source-logo",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Webdevful source SVG/PNG containing the cursive web mark.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for logo.png and logo_white.png.",
    )
    parser.add_argument(
        "--web-crop-ratio",
        type=float,
        default=0.46,
        help=(
            "Fraction of the source image width containing only the cursive web mark. "
            "Keep this tight so the source divider is not cropped into the generated mark."
        ),
    )
    parser.add_argument(
        "--w-crop-ratio",
        type=float,
        default=0.24,
        help=(
            "Fraction of the source image width containing only the cursive W mark "
            "for LPF favicon-tab assets."
        ),
    )
    args = parser.parse_args()

    if not args.source_logo.exists():
        raise FileNotFoundError(
            f"Missing source logo: {args.source_logo}. "
            "Expected tools/assets/webdevful-logo-white.svg or pass --source-logo."
        )

    template_name = resolve_template_name(args.template_name, args.allow_name_override)

    render_logo(template_name, args.source_logo, args.output_dir / "logo_white.png", WHITE, args.web_crop_ratio)
    render_logo(template_name, args.source_logo, args.output_dir / "logo.png", DARK, args.web_crop_ratio)
    render_favicon_tab_logo(template_name, args.source_logo, args.output_dir / "favicon-tab_white.png", WHITE, args.w_crop_ratio)
    render_favicon_tab_logo(template_name, args.source_logo, args.output_dir / "favicon-tab.png", DARK, args.w_crop_ratio)
    render_favicon_mark(args.source_logo, args.output_dir / "favicon.png", DARK, args.w_crop_ratio, 512)
    render_favicon_mark(args.source_logo, args.output_dir / "favicon-32x32.png", DARK, args.w_crop_ratio, 32)
    render_favicon_mark(args.source_logo, args.output_dir / "favicon-16x16.png", DARK, args.w_crop_ratio, 16)


if __name__ == "__main__":
    main()
