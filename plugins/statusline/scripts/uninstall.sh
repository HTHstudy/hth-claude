#!/bin/bash
set -e

TARGET_SCRIPT="$HOME/.claude/statusline-command.sh"
SETTINGS="$HOME/.claude/settings.json"

# 1. Remove statusline script
if [ -f "$TARGET_SCRIPT" ]; then
  rm "$TARGET_SCRIPT"
fi

# 2. Remove statusLine config from settings.json
if [ -f "$SETTINGS" ]; then
  jq 'del(.statusLine)' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
fi

echo "✅ Statusline removed. Restart session to apply."
