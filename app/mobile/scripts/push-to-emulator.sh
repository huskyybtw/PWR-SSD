#!/usr/bin/env bash
# Pushes test receipts / bank statements to a running Android emulator.
#   images (*.jpg|*.jpeg|*.png|*.webp) -> /sdcard/Pictures/TestReceipts/
#   documents (*.pdf)                  -> /sdcard/Download/
# Usage: ./scripts/push-to-emulator.sh [-s <serial>] [source-dir]
set -euo pipefail
# Git Bash on Windows would rewrite /sdcard/... into Windows paths.
export MSYS_NO_PATHCONV=1

# pwd -W gives a Windows path in Git Bash (adb.exe needs it); plain pwd elsewhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && (pwd -W 2>/dev/null || pwd))"
SERIAL=""
if [[ "${1:-}" == "-s" ]]; then SERIAL="$2"; shift 2; fi
SOURCE="${1:-$SCRIPT_DIR/../assets/images/test-data}"

ADB="$(command -v adb || true)"
if [[ -z "$ADB" ]]; then
  for sdk in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk" "$HOME/Library/Android/sdk"; do
    if [[ -n "$sdk" && -x "$sdk/platform-tools/adb" ]]; then ADB="$sdk/platform-tools/adb"; break; fi
  done
fi
[[ -n "$ADB" ]] || { echo "adb not found (install platform-tools or add to PATH)" >&2; exit 1; }

if [[ -z "$SERIAL" ]]; then
  mapfile -t DEVICES < <("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')
  [[ ${#DEVICES[@]} -gt 0 ]] || { echo "No device/emulator connected." >&2; exit 1; }
  [[ ${#DEVICES[@]} -eq 1 ]] || { echo "Several devices: ${DEVICES[*]} - use -s <serial>" >&2; exit 1; }
  SERIAL="${DEVICES[0]}"
fi
echo "Target device: $SERIAL"

IMG_DIR=/sdcard/Pictures/TestReceipts
DOC_DIR=/sdcard/Download
"$ADB" -s "$SERIAL" shell mkdir -p "$IMG_DIR" "$DOC_DIR"

count=0
shopt -s nullglob nocaseglob
for f in "$SOURCE"/*.{jpg,jpeg,png,webp,pdf}; do
  name="$(basename "$f")"
  case "${name,,}" in
    *.pdf) target="$DOC_DIR/$name" ;;
    *)     target="$IMG_DIR/$name" ;;
  esac
  echo "  $name -> $target"
  "$ADB" -s "$SERIAL" push "$f" "$target" >/dev/null
  count=$((count + 1))
done
[[ $count -gt 0 ]] || { echo "No images or PDFs in $SOURCE" >&2; exit 1; }

"$ADB" -s "$SERIAL" shell content call --method scan_volume --uri content://media --arg external_primary >/dev/null || true
echo "Done. Pushed $count file(s)."
