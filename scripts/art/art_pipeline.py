"""Shared helpers for the Gemini art scripts in scripts/art/.

Style references are built from the game's own art in public/ (monsters, structures, decorations)
and from the icons uploaded as overrides in the icon editor. They set palette, proportions, outline
weight and subject design; the generated art itself is hand-drawn, not pixel art.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
PUBLIC = REPO / "public"
GEN_IMAGE = REPO / "scripts/art/gen_image.py"
OUTLINE_RGB = (30, 26, 28)  # colour under transparent pixels, so resize fringes read as ink

STYLE = (
    "2D hand-drawn indie game art, clean dark ink outlines, smooth painterly shading, vibrant glowing "
    "lighting effects, crisp bold outlines, glossy cel-shading, vibrant colors, cute chibi proportions, "
    "Cult of the Lamb art style blended with the Tiny Swords look (pixelfrog). NOT pixel art: smooth "
    "curves and smooth gradients, no visible pixels, no dithering."
)
REFERENCE_RULES = (
    "Reference image 1 is the game's world art and reference image 2 is the game's existing icons: match "
    "their colour palette, chunky friendly shapes, outline weight and top-left light, so the art sits "
    "naturally next to them. Use them only for look and palette; redraw everything in the hand-drawn "
    "painterly style above. Never copy, collage or include the reference images or any of their objects "
    "in the output."
)
KEY_TEXT = {
    "green": "Solid flat chroma green #00FF00 background with no shading, gradient or glow on it. Do not use #00FF00 in the art.",
    "magenta": "Solid flat chroma magenta #FF00FF background with no shading, gradient or glow on it. Do not use magenta or pink in the art.",
}

GAME_ART_REFS = [
    "monster/bear-lvl2-idle.gif",
    "monster/boss-minotaur-lvl4-idle.gif",
    "monster/boss-panda-lvl4-idle.gif",
    "monster/boss-spider-lvl4-idle.gif",
    "monster/giant-bat-lvl3-idle.gif",
    "monster/boss-bumblebee-lvl3-idle.gif",
    "sprites/castle_blue.png",
    "sprites/mine.png",
    "sprites/boat.gif",
    "sprites/autmn_tree.gif",
    "sprites/big_rock.gif",
    "sprites/sheep.gif",
    "sprites/lancer_idle.gif",
    "sprites/decorations/03.png",
    "sprites/decorations/05.png",
    "sprites/decorations/08.png",
]
# The icons uploaded as overrides in the icon editor, plus the game's resource icons.
ICON_REFS = [
    "sprites/icon-overrides/coins-1792255129235.png",
    "sprites/icon-overrides/hammer-1792255173236.png",
    "sprites/icon-overrides/settings-1792255201490.png",
    "sprites/icon-overrides/play-1792254962839.png",
    "sprites/icon-overrides/shield-1792254951460.png",
    "sprites/icon-overrides/swords-1792255080068.png",
    "sprites/icon-overrides/x-1792255187918.png",
    "sprites/icon-overrides/info-1792255137731.png",
    "sprites/icon_meat.png",
    "sprites/icon_wood.png",
]


def mid_frame(path: Path) -> Image.Image:
    """The middle frame of an animation (first frames are often empty), cropped to its content."""
    image = Image.open(path)
    image.seek(getattr(image, "n_frames", 1) // 2)
    image = image.convert("RGBA")
    bbox = image.getbbox()
    return image.crop(bbox) if bbox else image


def build_sheet(paths: list[str], cols: int, out: Path) -> Path:
    """Upscale each image smoothly into an equal cell, on the game's dark UI background."""
    cell = 256
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * cell), (40, 44, 56))
    for index, relative in enumerate(paths):
        image = mid_frame(PUBLIC / relative)
        scale = (cell - 16) / max(image.size)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.LANCZOS)
        x = (index % cols) * cell + (cell - image.width) // 2
        y = (index // cols) * cell + (cell - image.height) // 2
        sheet.paste(image, (x, y), image)
    sheet.save(out)
    return out


def build_style_refs(raw_dir: Path) -> list[Path]:
    return [
        build_sheet(GAME_ART_REFS, 4, raw_dir / "_ref-game-art.png"),
        build_sheet(ICON_REFS, 5, raw_dir / "_ref-icons.png"),
    ]


def generate(raw: Path, prompt: str, refs: list[Path], aspect: str) -> str:
    """One Gemini call; skips when the raw file already exists. Returns a status line."""
    if raw.exists():
        return f"{raw.stem}: raw exists, skipped"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as prompt_file:
        prompt_file.write(prompt)
    cmd = [sys.executable, str(GEN_IMAGE), str(raw), prompt_file.name, "--aspect", aspect, "--size", "1K"]
    for ref in refs:
        cmd += ["--ref", str(ref)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    status = "ok" if result.returncode == 0 else f"FAILED {result.stderr.strip()[-300:]}"
    return f"{raw.stem}: {status}"


def key_mask(rgb: np.ndarray, key: str) -> np.ndarray:
    """True where the pixel is the chroma key colour."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == "magenta":
        return (r > 150) & (b > 150) & (np.minimum(r, b) - g > 60)
    return (g > 150) & (g - np.maximum(r, b) > 60)


def border_connected(mask: np.ndarray) -> np.ndarray:
    """Keep only the parts of `mask` connected to the image border (key colour inside the art stays)."""
    # .copy(): an image from fromarray is read-only, and floodfill would silently write elsewhere.
    marks = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), "L").copy()
    height, width = mask.shape
    border = [(x, 0) for x in range(width)] + [(x, height - 1) for x in range(width)]
    border += [(0, y) for y in range(height)] + [(width - 1, y) for y in range(height)]
    for point in border:
        if marks.getpixel(point) == 255:
            ImageDraw.floodfill(marks, point, 128)
    return np.asarray(marks) == 128


def despill(rgb: np.ndarray, key: str) -> None:
    """Pull key-coloured fringes and tinted shadows back to neutral, in place."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == "magenta":
        fringe = np.minimum(r, b) - g > 20
        rgb[..., 0] = np.where(fringe, g, r)
        rgb[..., 2] = np.where(fringe, g, b)
    else:
        fringe = g > np.maximum(r, b) + 20
        rgb[..., 1] = np.where(fringe, np.maximum(r, b), g)


def cut_out(raw: Path, key: str, border_only: bool = False) -> Image.Image | None:
    """Raw model output → RGBA cropped to its content, background keyed out. None if nothing is left."""
    rgb = np.asarray(Image.open(raw).convert("RGB")).astype(int)
    background = key_mask(rgb, key)
    if border_only:
        background = border_connected(background)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    despill(rgb, key)
    rgb[alpha == 0] = OUTLINE_RGB
    image = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
    bbox = image.getbbox()
    return image.crop(bbox) if bbox else None


def fit_on_canvas(image: Image.Image, canvas_size: tuple[int, int], margin: int) -> Image.Image:
    """Scale `image` (smooth, anti-aliased) to fit inside the canvas minus `margin`, centred."""
    width, height = canvas_size
    scale = min((width - 2 * margin) / image.width, (height - 2 * margin) / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.LANCZOS)
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.paste(image, ((width - size[0]) // 2, (height - size[1]) // 2), image)
    return canvas
