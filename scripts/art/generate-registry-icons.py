"""Generate painterly game icons for the icon registry with Gemini.

Usage: python3 scripts/art/generate-registry-icons.py RAW_DIR [id ...] [--jobs 6] [--process-only]
  RAW_DIR         where raw model output is kept (outside the repo is fine)
  id ...          only these registry ids; default: every entry in SUBJECTS
  --process-only  skip generation, re-run the key/crop/resize step on existing raw files
Writes public/sprites/icons-generated/<id>.png (128x128, transparent, soft edges).
Reads GEMINI_API_KEY from the environment (via scripts/art/gen_image.py).

Style references are built from the game's own art in public/ (monsters, structures, decorations)
and from the icons uploaded as overrides in the icon editor. They set palette, proportions, outline
weight and subject design; the icons themselves are hand-drawn, not pixel art.
"""

import argparse
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
PUBLIC = REPO / "public"
OUT_DIR = PUBLIC / "sprites/icons-generated"
GEN_IMAGE = REPO / "scripts/art/gen_image.py"
ICON_PX = 128
CONTENT_PX = 116  # small margin so outlines never touch the edge
OUTLINE_RGB = (30, 26, 28)  # colour under transparent pixels, so resize fringes read as ink

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

SUBJECTS = {
    "loader-2": "a loading spinner: eight small golden orbs evenly spaced in a perfect circle, fading from bright to dim around the ring, nothing in the middle",
    "chevron-down": "a chunky V-shaped chevron arrow pointing straight down, made of carved wood, with a pointed tip and no rounded lobes",
    "chevron-up": "a chunky upward-pointing chevron arrow made of carved wood",
    "trophy": "a golden trophy cup with two handles on a small base",
    "check-circle": "a green check mark inside a round golden-rimmed badge",
    "award": "a gold medal rosette with two red ribbon tails",
    "sparkles": "three magic sparkle stars, one large and two small, yellow and white",
    "zap": "a yellow lightning bolt",
    "shield": "a knight's heater shield, blue and white with a steel rim",
    "play": "a green rounded triangle play button pointing right",
    "trending-up": "a green zig-zag arrow rising to the upper right",
    "check": "a single bold green check mark",
    "ban": "a red prohibition sign: a circle with a diagonal slash",
    "dices": "two white six-sided dice with black pips, one tilted",
    "x-circle": "a red X inside a round golden-rimmed badge",
    "hand-metal": "a raised steel knight's gauntlet fist",
    "arrow-left": "a chunky arrow pointing left, wooden shaft with a steel head",
    "clock": "a round wall clock with a golden rim and two hands",
    "crosshair": "a red targeting crosshair: a ring with four tick marks and a center dot",
    "skull": "a bone-white skull with dark eye sockets",
    "swords": "two crossed steel swords with brown hilts",
    "anchor": "an iron ship anchor with a ring at the top",
    "refresh-cw": "two curved green arrows chasing each other clockwise in a circle",
    "wifi-off": "a wifi signal of three arcs crossed by a red diagonal slash",
    "shopping-cart": "a small wooden merchant cart with two wheels, carrying goods",
    "album": "a fanned stack of three playing cards with golden backs",
    "university": "a small stone academy building with a triangular roof and columns",
    "scroll-text": "a rolled-open parchment scroll with lines of writing",
    "timer": "a golden stopwatch with a button on top",
    "image-icon": "a wooden picture frame showing a green hill and blue sky",
    "coins": "a stack of gold coins",
    "info": "a lowercase letter i inside a round parchment-colored badge",
    "layers": "three stacked square tiles, slightly offset",
    "hourglass": "a wooden hourglass with golden sand",
    "forward": "a chunky arrow curving to the right, like a skip-forward sign",
    "compass": "a brass navigation compass with a red needle",
    "shield-check": "a blue knight's shield with a green check mark on it",
    "hammer": "a wooden mallet hammer",
    "x": "a bold red X made of two crossed planks",
    "bot": "a small steel automaton golem head with glowing blue eyes",
    "crown": "a golden royal crown with red gems",
    "users": "two small peasant villagers side by side, head and shoulders",
    "help-circle": "a question mark inside a round parchment-colored badge",
    "settings": "a golden cog wheel",
    "book-open": "an open leather-bound book with blank pages",
    "power": "a power symbol: a broken circle with a vertical line, in red",
    "home": "a small cottage with a red roof and a wooden door",
    "zoom-in": "a magnifying glass with a plus sign in the lens",
    "zoom-out": "a magnifying glass with a minus sign in the lens",
    "rotate-ccw": "a curved arrow turning counter-clockwise",
    "alert-triangle": "a yellow warning triangle with a black exclamation mark",
    "log-out": "a wooden door with a green arrow pointing out of it to the right",
}

# Subjects that are green themselves: key them on magenta so the green survives keying.
MAGENTA_KEY_IDS = {"play", "shield-check", "check", "check-circle", "trending-up", "refresh-cw", "log-out"}

KEY_TEXT = {
    "green": "Solid flat chroma green #00FF00 background with no shading, gradient or glow on it. Do not use #00FF00 in the icon.",
    "magenta": "Solid flat chroma magenta #FF00FF background with no shading, gradient or glow on it. Do not use magenta or pink in the icon.",
}

PROMPT = """Game UI icon of {subject}.
Style: 2D hand-drawn indie game art, clean dark ink outlines, smooth painterly shading, vibrant glowing lighting effects, crisp bold outlines, glossy cel-shading, vibrant colors, cute chibi proportions, Cult of the Lamb art style blended with the Tiny Swords look (pixelfrog). NOT pixel art: smooth curves and smooth gradients, no visible pixels, no dithering.
Reference image 1 is the game's world art and reference image 2 is the game's existing icons: match their colour palette, chunky friendly shapes, outline weight, top-left light and the small soft shadow under each object, so the icon sits naturally next to them. Use them only for look and palette; redraw everything in the hand-drawn painterly style above. Never copy, collage or include the reference images or any of their objects in the output: draw only the one requested object.
One single object, centered, filling about 85% of the canvas, slight three-quarter front view, readable at 24 pixels.
{key_text} Any glow stays inside the object's outline. No text, no letters except where the subject says so, no border, no frame, no grid lines.
"""


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


def key_for(icon_id: str) -> str:
    return "magenta" if icon_id in MAGENTA_KEY_IDS else "green"


def generate(icon_id: str, raw_dir: Path, refs: list[Path]) -> str:
    raw = raw_dir / f"{icon_id}.png"
    if raw.exists():
        return f"{icon_id}: raw exists, skipped"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as prompt_file:
        prompt_file.write(PROMPT.format(subject=SUBJECTS[icon_id], key_text=KEY_TEXT[key_for(icon_id)]))
    cmd = [sys.executable, str(GEN_IMAGE), str(raw), prompt_file.name, "--aspect", "1:1", "--size", "1K"]
    for ref in refs:
        cmd += ["--ref", str(ref)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    status = "ok" if result.returncode == 0 else f"FAILED {result.stderr.strip()[-300:]}"
    return f"{icon_id}: {status}"


def remove_key(rgb: np.ndarray, key: str) -> np.ndarray:
    """Alpha mask: 0 where the pixel is the chroma key colour."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == "magenta":
        background = (r > 150) & (b > 150) & (np.minimum(r, b) - g > 60)
    else:
        background = (g > 150) & (g - np.maximum(r, b) > 60)
    return np.where(background, 0, 255).astype(np.uint8)


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


def process(icon_id: str, raw_dir: Path) -> str:
    raw = raw_dir / f"{icon_id}.png"
    if not raw.exists():
        return f"{icon_id}: no raw image"
    rgb = np.asarray(Image.open(raw).convert("RGB")).astype(int)
    key = key_for(icon_id)
    alpha = remove_key(rgb, key)
    despill(rgb, key)
    rgb[alpha == 0] = OUTLINE_RGB
    image = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
    bbox = image.getbbox()
    if not bbox:
        return f"{icon_id}: empty after keying"
    image = image.crop(bbox)
    scale = CONTENT_PX / max(image.size)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.LANCZOS)  # smooth, anti-aliased edges
    canvas = Image.new("RGBA", (ICON_PX, ICON_PX), (0, 0, 0, 0))
    canvas.paste(image, ((ICON_PX - size[0]) // 2, (ICON_PX - size[1]) // 2), image)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_DIR / f"{icon_id}.png")
    return f"{icon_id}: saved"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_dir")
    parser.add_argument("ids", nargs="*")
    parser.add_argument("--jobs", type=int, default=6)
    parser.add_argument("--process-only", action="store_true")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    ids = args.ids or list(SUBJECTS)
    unknown = [icon_id for icon_id in ids if icon_id not in SUBJECTS]
    if unknown:
        print(f"unknown ids: {unknown}", file=sys.stderr)
        return 2

    if not args.process_only:
        refs = [
            build_sheet(GAME_ART_REFS, 4, raw_dir / "_ref-game-art.png"),
            build_sheet(ICON_REFS, 5, raw_dir / "_ref-icons.png"),
        ]
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            for line in pool.map(lambda icon_id: generate(icon_id, raw_dir, refs), ids):
                print(line, flush=True)
    for icon_id in ids:
        print(process(icon_id, raw_dir), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
