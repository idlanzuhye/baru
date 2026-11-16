#!/usr/bin/env bash
# beatreel setup. Safe to run again.   usage: bash setup.sh [--sfx]
#   A Python 3.10+ virtualenv in .venv with the packages, the Kokoro voice model (~340 MB, cached in ~/.cache/beatreel/tts), GSAP (npm), the icon sets
#   (~30 MB), and checks for ffmpeg, node/npx and a headless Chrome. --sfx also installs earshot (sound effects).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CACHE="${BEATREEL_CACHE:-$HOME/.cache/beatreel}"

echo "python ..."
# Python 3.10+ (macOS ships 3.9 as python3). Everything goes into .venv inside this folder.
PY=""
for c in "${BEATREEL_PYTHON:-}" python3.13 python3.12 python3.11 python3.10 /opt/homebrew/bin/python3 /usr/local/bin/python3 python3; do
  [ -n "$c" ] && command -v "$c" >/dev/null 2>&1 || continue
  if "$c" -c 'import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] < (3, 14) else 1)' 2>/dev/null; then PY="$(command -v "$c")"; break; fi
done
if [ -z "$PY" ]; then
  echo "ERROR: beatreel needs Python 3.10 - 3.13 (found: $(python3 --version 2>&1))." >&2
  echo "  macOS:  brew install python@3.12     (or the installer from https://www.python.org/downloads/)" >&2
  echo "  Linux:  sudo apt install python3.12 python3.12-venv   (or your distro's equivalent)" >&2
  echo "Then run bash setup.sh again." >&2
  exit 1
fi
echo "  using $PY ($("$PY" --version))"
[ -x "$HERE/.venv/bin/python" ] || "$PY" -m venv "$HERE/.venv"
"$HERE/.venv/bin/python" -m pip install -q --upgrade pip
echo "python packages ..."
"$HERE/.venv/bin/python" -m pip install -q -r "$HERE/requirements.txt"

echo "voice model ..."
TTS="${BEATREEL_TTS:-$CACHE/tts}"; mkdir -p "$TTS"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "$TTS/$f" ] || curl -fL --retry 3 -o "$TTS/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done

echo "gsap ..."
( cd "$HERE" && npm install --no-audit --no-fund -s )

echo "icons ..."
ICONS="${BEATREEL_ICONS:-$CACHE/icons}"; mkdir -p "$ICONS"
[ -d "$ICONS/node_modules/@iconify-json/logos" ] || npm i -s --no-audit --no-fund --prefix "$ICONS" \
  @iconify-json/logos @iconify-json/simple-icons @iconify-json/devicon @iconify-json/lucide @iconify-json/tabler @iconify-json/fluent-emoji-flat \
  || echo "WARN: icon install failed; icons will be fetched on first use" >&2

if [ "${1:-}" = "--sfx" ]; then
  echo "earshot (sound effects) ..."
  E="$CACHE/earshot"
  if [ ! -x "$E/.venv/bin/earshot" ]; then
    rm -rf "$E"; git clone -q --depth 1 https://github.com/Leonxlnx/earshot.git "$E"
    ( cd "$E" && "$PY" -m venv .venv && .venv/bin/pip install -q -e . ) || echo "WARN: earshot install failed; reels render without sound effects" >&2
  fi
fi

command -v ffmpeg >/dev/null || echo "WARN: ffmpeg is missing (macOS: brew install ffmpeg; Debian/Ubuntu: apt install ffmpeg)" >&2
command -v npx >/dev/null || echo "WARN: node/npx is missing (https://nodejs.org); HyperFrames renders through npx" >&2
found=""
for c in "${HYPERFRAMES_BROWSER_PATH:-}" "${PLAYWRIGHT_BROWSERS_PATH:-/nonexistent}"/chromium_headless_shell-*/chrome-*/chrome-headless-shell \
         "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-*/chrome-headless-shell "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-*/chrome-headless-shell; do
  [ -n "$c" ] && [ -x "$c" ] && found="$c"
done
if [ -z "$found" ]; then
  echo "headless chrome ..."
  npx -y playwright install chromium-headless-shell || echo "WARN: could not install a headless Chrome; HyperFrames will try to fetch one" >&2
fi
echo "done. Try: ./beatreel make examples/coffee/coffee.json"
