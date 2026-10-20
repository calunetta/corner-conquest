"""Generate one image with Nano Banana Pro via the Gemini API.

Usage: python3 scripts/art/gen_image.py OUT.png PROMPT.txt [--ref REF.png ...] [--aspect 21:9] [--size 2K]
Reads GEMINI_API_KEY from the environment. Never prints it.
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

MODEL = "gemini-3-pro-image-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("prompt_file")
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--aspect", default="21:9")
    ap.add_argument("--size", default="2K")
    a = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("GEMINI_API_KEY not set", file=sys.stderr)
        return 2

    with open(a.prompt_file, encoding="utf-8") as f:
        parts = [{"text": f.read()}]
    for ref in a.ref:
        with open(ref, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        parts.append({"inline_data": {"mime_type": "image/png", "data": data}})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": a.aspect, "imageSize": a.size},
        },
    }
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    resp = None
    for attempt in range(3):  # retry timeouts, rate limits and server errors
        try:
            with urllib.request.urlopen(req, timeout=480) as r:
                resp = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:2000]
            if e.code not in (429, 500, 502, 503, 504) or attempt == 2:
                print(f"HTTP {e.code}: {msg}", file=sys.stderr)
                return 1
            print(f"HTTP {e.code}, retrying", file=sys.stderr)
        except (TimeoutError, urllib.error.URLError) as e:
            if attempt == 2:
                print(f"failed: {e}", file=sys.stderr)
                return 1
            print(f"{e}, retrying", file=sys.stderr)
        time.sleep(10 * (attempt + 1))

    saved = False
    for cand in resp.get("candidates", []):
        for p in cand.get("content", {}).get("parts", []):
            inline = p.get("inlineData") or p.get("inline_data")
            if inline and not saved:
                with open(a.out, "wb") as f:
                    f.write(base64.b64decode(inline["data"]))
                saved = True
            elif "text" in p:
                print("model:", p["text"][:500])
    if not saved:
        print("no image returned:", json.dumps(resp)[:1500], file=sys.stderr)
        return 1
    print("saved", a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
