"""Generate painterly game icons for the icon registry with Gemini.

Usage: python3 scripts/art/generate-registry-icons.py RAW_DIR [id ...] [--jobs 6] [--process-only]
  RAW_DIR         where raw model output is kept (outside the repo is fine)
  id ...          only these registry ids; default: every entry in SUBJECTS
  --process-only  skip generation, re-run the key/crop/resize step on existing raw files
Writes public/sprites/icons-generated/<id>.webp (128x128, transparent, soft edges).
Reads GEMINI_API_KEY from the environment (via scripts/art/gen_image.py).
Style references and keying: scripts/art/art_pipeline.py.
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from art_pipeline import KEY_TEXT, PUBLIC, build_style_refs, cut_out, fit_on_canvas, generate, save_webp

OUT_DIR = PUBLIC / "sprites/icons-generated"
ICON_PX = 128
MARGIN_PX = 6  # outlines never touch the edge

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

PROMPT = """Game UI icon of {subject}.
Style: 2D hand-drawn indie game art, clean dark ink outlines, smooth painterly shading, vibrant glowing lighting effects, crisp bold outlines, glossy cel-shading, vibrant colors, cute chibi proportions, Cult of the Lamb art style blended with the Tiny Swords look (pixelfrog). NOT pixel art: smooth curves and smooth gradients, no visible pixels, no dithering.
Reference image 1 is the game's world art and reference image 2 is the game's existing icons: match their colour palette, chunky friendly shapes, outline weight, top-left light and the small soft shadow under each object, so the icon sits naturally next to them. Use them only for look and palette; redraw everything in the hand-drawn painterly style above. Never copy, collage or include the reference images or any of their objects in the output: draw only the one requested object.
One single object, centered, filling about 85% of the canvas, slight three-quarter front view, readable at 24 pixels.
{key_text} Any glow stays inside the object's outline. No text, no letters except where the subject says so, no border, no frame, no grid lines.
"""


def key_for(icon_id: str) -> str:
    return "magenta" if icon_id in MAGENTA_KEY_IDS else "green"


def prompt_for(icon_id: str) -> str:
    return PROMPT.format(subject=SUBJECTS[icon_id], key_text=KEY_TEXT[key_for(icon_id)])


def process(icon_id: str, raw_dir: Path) -> str:
    raw = raw_dir / f"{icon_id}.png"
    if not raw.exists():
        return f"{icon_id}: no raw image"
    image = cut_out(raw, key_for(icon_id))
    if image is None:
        return f"{icon_id}: empty after keying"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    save_webp(fit_on_canvas(image, (ICON_PX, ICON_PX), MARGIN_PX), OUT_DIR / f"{icon_id}.webp")
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
        refs = build_style_refs(raw_dir)
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            jobs = [(raw_dir / f"{icon_id}.png", prompt_for(icon_id)) for icon_id in ids]
            for line in pool.map(lambda job: generate(job[0], job[1], refs, "1:1"), jobs):
                print(line, flush=True)
    for icon_id in ids:
        print(process(icon_id, raw_dir), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
