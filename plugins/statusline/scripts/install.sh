#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/.claude"
TARGET_SCRIPT="$TARGET_DIR/statusline-command.sh"
SETTINGS="$TARGET_DIR/settings.json"

mkdir -p "$TARGET_DIR"

# 1. Copy statusline script
cp "$SCRIPT_DIR/statusline-command.sh" "$TARGET_SCRIPT"
chmod +x "$TARGET_SCRIPT"

# 2. Inject statusLine config into settings.json
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

jq '.statusLine = {
  "type": "command",
  "command": "bash ~/.claude/statusline-command.sh",
  "refreshInterval": 10
}' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"

echo "✅ Statusline installed. Restart session to apply."
