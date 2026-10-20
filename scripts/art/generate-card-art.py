"""Generate an icon and a framed card illustration for every special card and passive ability.

Usage: python3 scripts/art/generate-card-art.py RAW_DIR [slug ...] [--jobs 6] [--process-only]
  RAW_DIR         where raw model output is kept (outside the repo is fine)
  slug ...        only these subjects (e.g. extra-move collector); default: all
  --process-only  skip generation, re-run the key/crop/resize step on existing raw files
Writes public/sprites/cards/<slug>-icon.png (128x128) and <slug>-card.png (400x600), transparent.
The cards carry no text: the game draws names and descriptions in its own font.
Reads GEMINI_API_KEY from the environment (via scripts/art/gen_image.py).
Slugs and paths are mirrored in src/modules/cards/card-art.ts.
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from art_pipeline import KEY_TEXT, PUBLIC, REFERENCE_RULES, STYLE, build_style_refs, cut_out, fit_on_canvas, generate

OUT_DIR = PUBLIC / "sprites/cards"
ICON_SIZE = (128, 128)
CARD_SIZE = (400, 600)
KEY = "magenta"  # card art is full of greens (islands, forests); magenta is rare in it

FRAMES = {
    "action": "polished steel frame with deep blue enamel inlays and small silver rivets",
    "economy": "carved warm wood frame with gold trim and small gold coin studs",
    "combat": "dark iron frame with crimson red enamel inlays and small spikes at the corners",
    "ability": "weathered stone frame with teal glowing rune inlays",
}

# slug: (type, card illustration, icon subject)
SUBJECTS = {
    "extra-move": ("action", "a cheerful knight sprinting forward across a grassy island path, motion swooshes behind, a winged boot glowing above", "a winged leather boot"),
    "steal-resource": ("action", "a sneaky hooded thief tiptoeing away with a sack of gold coins and a log under the arm, under moonlight", "a thief's sack with a gold coin spilling out"),
    "sabotage": ("action", "a cracked hourglass wrapped in heavy chains with a padlock, on a rival's war table, sand frozen", "a cracked hourglass wrapped in chains"),
    "reinforce": ("economy", "fresh soldiers marching out of a castle gate under a raised blue war banner, no food sacks in sight", "a blue war banner with a soldier helmet at its base"),
    "scout": ("action", "a brass spyglass on a cliff with fog parting to reveal three distant islands", "a brass spyglass"),
    "overcome": ("combat", "a raised sword crowned by a glowing golden laurel wreath over a defeated monster's shadow", "a golden laurel wreath around an upright sword"),
    "wealthy": ("economy", "an overflowing treasure chest spilling gold coins, meat and wood logs, glowing warmly", "an open treasure chest full of gold"),
    "productive": ("economy", "a farm cart overflowing with a doubled harvest of meat, wood logs and gold, sparkles of plenty", "two overflowing sacks of harvest with a golden sparkle"),
    "efficient": ("economy", "a balance scale with half a ham on one pan outweighing a soldier helmet on the other", "half a ham on a small balance scale"),
    "master-builder": ("economy", "a crossed hammer and saw over a neat stack of wooden planks and a rolled blueprint", "a crossed hammer and saw"),
    "war-chief": ("combat", "a fierce chibi war chief in a horned helmet roaring, red war paint, crossed axes glowing", "a horned war helmet"),
    "decide-dice-roll": ("combat", "a gauntlet holding a glowing die and turning it to its six face, a monster silhouette behind", "a single glowing six-sided die"),
    "teleport": ("action", "a soldier stepping through a swirling teal and blue magic portal between two islands", "a swirling teal and blue magic portal"),
    "explorer": ("ability", "an explorer planting a flag on a newly found island, compass and map at their feet", "a flag planted on a small round island"),
    "collector": ("ability", "a smiling villager carrying a woven basket of meat, wood and gold back from the islands", "a woven basket of meat, wood and gold"),
}

CARD_PROMPT = """Fantasy game card illustration: {illustration}.
Card layout: a portrait playing card filling the canvas, with a {frame} around the whole card and rounded corners. The illustration fills the inside of the frame. No text, no letters, no numbers, no title banner, no description box.
Style: {style}
{reference_rules}
{key_text} The key colour must surround the whole card, outside its frame.
"""

ICON_PROMPT = """Game UI icon of {subject}.
Style: {style}
{reference_rules}
One single object, centered, filling about 85% of the canvas, slight three-quarter front view, readable at 24 pixels, with a small soft shadow under it.
{key_text} Any glow stays inside the object's outline. No text, no letters, no border, no frame, no grid lines.
"""


def card_prompt(slug: str) -> str:
    kind, illustration, _ = SUBJECTS[slug]
    return CARD_PROMPT.format(
        illustration=illustration, frame=FRAMES[kind], style=STYLE,
        reference_rules=REFERENCE_RULES, key_text=KEY_TEXT[KEY],
    )


def icon_prompt(slug: str) -> str:
    _, _, subject = SUBJECTS[slug]
    return ICON_PROMPT.format(subject=subject, style=STYLE, reference_rules=REFERENCE_RULES, key_text=KEY_TEXT[KEY])


def process(slug: str, raw_dir: Path) -> list[str]:
    lines = []
    for variant, size, margin, border_only in (("icon", ICON_SIZE, 6, False), ("card", CARD_SIZE, 4, True)):
        raw = raw_dir / f"{slug}-{variant}.png"
        if not raw.exists():
            lines.append(f"{raw.stem}: no raw image")
            continue
        # Cards key only the background around the frame, so magenta-ish pixels inside the art survive.
        image = cut_out(raw, KEY, border_only=border_only)
        if image is None:
            lines.append(f"{raw.stem}: empty after keying")
            continue
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        fit_on_canvas(image, size, margin).save(OUT_DIR / f"{slug}-{variant}.png")
        lines.append(f"{raw.stem}: saved")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("raw_dir")
    parser.add_argument("slugs", nargs="*")
    parser.add_argument("--jobs", type=int, default=6)
    parser.add_argument("--process-only", action="store_true")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    slugs = args.slugs or list(SUBJECTS)
    unknown = [slug for slug in slugs if slug not in SUBJECTS]
    if unknown:
        print(f"unknown slugs: {unknown}", file=sys.stderr)
        return 2

    if not args.process_only:
        refs = build_style_refs(raw_dir)
        jobs = [(raw_dir / f"{slug}-icon.png", icon_prompt(slug), "1:1") for slug in slugs]
        jobs += [(raw_dir / f"{slug}-card.png", card_prompt(slug), "2:3") for slug in slugs]
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            for line in pool.map(lambda job: generate(job[0], job[1], refs, job[2]), jobs):
                print(line, flush=True)
    for slug in slugs:
        for line in process(slug, raw_dir):
            print(line, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
