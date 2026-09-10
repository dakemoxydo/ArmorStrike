#!/usr/bin/env bash
# Usage: bash scripts/screenshot.sh screenshots/iter-12-dust.png [wait_ms]
set -euo pipefail
OUT="${1:?usage: screenshot.sh <out.png> [wait_ms]}"
WAIT_MS="${2:-5000}"
URL="${URL:-http://localhost:5178}"
mkdir -p "$(dirname "$OUT")"
EXE=""
for c in \
  "${CHROME_PATH:-}" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "$LOCALAPPDATA/Google/Chrome/Application/chrome.exe"; do
  [ -n "$c" ] && [ -f "$c" ] && EXE="$c" && break
done
[ -n "$EXE" ] || { echo "No Edge/Chrome found" >&2; exit 1; }
if command -v cygpath >/dev/null 2>&1; then
  WIN_OUT="$(cygpath -w "$(pwd)/$OUT")"
else
  WIN_OUT="$(pwd)/$OUT"
fi
# SwiftShader, а НЕ --disable-gpu: three.js нужен WebGL, иначе кадр чёрный.
"$EXE" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1280,720 --virtual-time-budget="$WAIT_MS" \
  --screenshot="$WIN_OUT" "$URL" >/dev/null 2>&1
echo "Screenshot saved to $OUT"
