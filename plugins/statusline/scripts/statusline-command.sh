#!/bin/bash

input=$(cat)

get_text() {
  local expr="$1"
  echo "$input" | jq -r "$expr // empty"
}

get_num() {
  local expr="$1"
  local value
  value=$(echo "$input" | jq -r "$expr // empty")
  [ -z "$value" ] || [ "$value" = "null" ] && printf '0' && return
  printf '%s' "$value"
}

get_pct() {
  local expr="$1"
  local value
  value=$(echo "$input" | jq -r "$expr // empty")

  if [ -z "$value" ] || [ "$value" = "null" ]; then
    printf ''
    return
  fi

  awk -v v="$value" 'BEGIN {
    n = int(v + 0)
    if (n < 0) n = 0
    if (n > 100) n = 100
    printf "%d", n
  }'
}

# --- Data ---
MODEL=$(get_text '.model.display_name')
DIR=$(get_text '.workspace.current_dir // .cwd')
CTX=$(get_pct '.context_window.used_percentage')
SES=$(get_pct '.rate_limits.five_hour.used_percentage')
WEEK=$(get_pct '.rate_limits.seven_day.used_percentage')

TOTAL_IN=$(get_num '.context_window.total_input_tokens')
TOTAL_OUT=$(get_num '.context_window.total_output_tokens')
CTX_SIZE=$(get_num '.context_window.context_window_size')
COST=$(get_num '.cost.total_cost_usd')

[ -z "$MODEL" ] && MODEL="Unknown"
[ -z "$DIR" ] && DIR="$(pwd)"
[ -z "$CTX" ] && CTX="0"

PROJECT="${DIR##*/}"

# --- Git ---
BRANCH=""
DIRTY=""
GIT_STAT=""
if git -C "$DIR" rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)
  if ! git -C "$DIR" diff --quiet 2>/dev/null || ! git -C "$DIR" diff --cached --quiet 2>/dev/null; then
    DIRTY="*"
  fi
  ADDED=$(git -C "$DIR" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
  MODIFIED=$(git -C "$DIR" diff --numstat 2>/dev/null | wc -l | tr -d ' ')
  [ "$ADDED" -gt 0 ] || [ "$MODIFIED" -gt 0 ] && GIT_STAT=" (+${ADDED} ~${MODIFIED})"
fi

# --- Helpers ---
bar() {
  local pct=${1:-0}
  local width=${2:-8}
  local filled=$((pct * width / 100))
  [ "$pct" -gt 0 ] && [ "$filled" -eq 0 ] && filled=1
  local empty=$((width - filled))
  local out=""

  if [ "$filled" -gt 0 ]; then
    printf -v FILL "%${filled}s"
    out="${FILL// /▓}"
  fi

  if [ "$empty" -gt 0 ]; then
    printf -v PAD "%${empty}s"
    out="${out}${PAD// /░}"
  fi

  printf '%s' "$out"
}

format_tokens() {
  local tokens="$1"
  awk -v t="$tokens" 'BEGIN {
    if (t >= 1000000) printf "%.1fM", t / 1000000
    else if (t >= 1000) printf "%.1fK", t / 1000
    else printf "%d", t
  }'
}

usage_color() {
  local pct=${1:-0}
  if [ "$pct" -ge 80 ]; then
    printf '\033[31m'   # red
  elif [ "$pct" -ge 50 ]; then
    printf '\033[33m'   # yellow
  else
    printf '\033[37m'   # white
  fi
}

# --- Colors ---
RESET='\033[0m'
BLUE='\033[34m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
GRAY='\033[90m'
WHITE='\033[37m'

SEP="${GRAY}|${RESET}"

GIT_COLOR="$GREEN"
[ -n "$DIRTY" ] && GIT_COLOR="$YELLOW"

NOW=$(date +%H:%M)

# --- Line 1: Project + Environment ---
LINE1="📁 ${BLUE}${PROJECT}${RESET}"
if [ -n "$BRANCH" ]; then
  LINE1="${LINE1} ${SEP} 🌿 ${GIT_COLOR}${BRANCH}${DIRTY}${GIT_STAT}${RESET}"
fi
LINE1="${LINE1} ${SEP} ${CYAN}${MODEL}${RESET} ${SEP} ⏱ ${WHITE}${NOW}${RESET}"

# --- Line 2: Usage gauges ---
LINE2="${GRAY}CTX${RESET} $(usage_color "$CTX")$(bar "$CTX" 8)${RESET} ${WHITE}${CTX}%${RESET}"

if [ -n "$SES" ]; then
  LINE2="${LINE2} ${SEP} ${GRAY}5H${RESET} $(usage_color "$SES")$(bar "$SES" 8)${RESET} ${WHITE}${SES}%${RESET}"
fi

if [ -n "$WEEK" ]; then
  LINE2="${LINE2} ${SEP} ${GRAY}7D${RESET} $(usage_color "$WEEK")$(bar "$WEEK" 8)${RESET} ${WHITE}${WEEK}%${RESET}"
fi

# --- Line 3: Tokens + Cost ---
TOTAL_TOKENS=$((TOTAL_IN + TOTAL_OUT))
FORMATTED_TOKENS=$(format_tokens "$TOTAL_TOKENS")
FORMATTED_COST=$(awk -v c="$COST" 'BEGIN { printf "$%.2f", c }')

LINE3="🔢 ${WHITE}${FORMATTED_TOKENS} tokens${RESET} ${SEP} 💰 ${GREEN}${FORMATTED_COST}${RESET}"

printf '%b\n' "$LINE1"
printf '%b\n' "$LINE2"
printf '%b\n' "$LINE3"
