#!/bin/bash

# stdin으로 Claude Code JSON 메타데이터를 받아 3줄 상태바를 출력
input=$(cat)

# ============================================================
# 설정
# ============================================================
BAR_WIDTH=12

# ============================================================
# 색상 (ANSI-C quoting)
# ============================================================
RESET=$'\033[0m'
RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
BLUE=$'\033[34m'
CYAN=$'\033[36m'
WHITE=$'\033[37m'
GRAY=$'\033[90m'
SEP="${GRAY}|${RESET}"

# ============================================================
# 함수
# ============================================================

# JSON에서 텍스트 값 추출
get_text() {
  echo "$input" | jq -r "$1 // empty"
}

# JSON에서 숫자 값 추출 (null → 0)
get_num() {
  local value
  value=$(echo "$input" | jq -r "$1 // empty")
  [ -z "$value" ] || [ "$value" = "null" ] && printf '0' && return
  printf '%s' "$value"
}

# JSON에서 퍼센트 값 추출 (0~100 정수로 클램핑)
get_pct() {
  local value
  value=$(echo "$input" | jq -r "$1 // empty")
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

# 프로그레스 바 생성 (█ filled, ░ empty)
bar() {
  local pct=${1:-0}
  local width=${2:-$BAR_WIDTH}
  local filled=$((pct * width / 100))
  [ "$pct" -gt 0 ] && [ "$filled" -eq 0 ] && filled=1
  local empty=$((width - filled))
  local out=""
  [ "$filled" -gt 0 ] && printf -v FILL "%${filled}s" && out="${FILL// /█}"
  [ "$empty" -gt 0 ] && printf -v PAD "%${empty}s" && out="${out}${PAD// /░}"
  printf '%s' "$out"
}

# 토큰 수 포맷 (1234567 → 1.2M, 12345 → 12.3K)
format_tokens() {
  awk -v t="$1" 'BEGIN {
    if (t >= 1000000) printf "%.1fM", t / 1000000
    else if (t >= 1000) printf "%.1fK", t / 1000
    else printf "%d", t
  }'
}

# 사용률에 따른 색상 반환 (80%+ 빨강, 50%+ 노랑, 그 외 흰색)
usage_color() {
  local pct=${1:-0}
  if [ "$pct" -ge 80 ]; then printf '%s' "$RED"
  elif [ "$pct" -ge 50 ]; then printf '%s' "$YELLOW"
  else printf '%s' "$WHITE"
  fi
}

# ============================================================
# 데이터 추출
# ============================================================
MODEL=$(get_text '.model.display_name')
DIR=$(get_text '.workspace.current_dir // .cwd')
CTX=$(get_pct '.context_window.used_percentage')
SES=$(get_pct '.rate_limits.five_hour.used_percentage')
WEEK=$(get_pct '.rate_limits.seven_day.used_percentage')
TOTAL_IN=$(get_num '.context_window.total_input_tokens')
TOTAL_OUT=$(get_num '.context_window.total_output_tokens')
COST=$(get_num '.cost.total_cost_usd')

# 기본값
[ -z "$MODEL" ] && MODEL="Unknown"
[ -z "$DIR" ] && DIR="$(pwd)"
[ -z "$CTX" ] && CTX="0"
[ -z "$SES" ] && SES="0"
[ -z "$WEEK" ] && WEEK="0"

PROJECT="${DIR##*/}"
NOW=$(date +%H:%M)
TOTAL_TOKENS=$((TOTAL_IN + TOTAL_OUT))

# ============================================================
# Git 상태
# ============================================================
BRANCH=""
DIRTY=""
GIT_STAT=""

if git -C "$DIR" rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH=$(git -C "$DIR" branch --show-current 2>/dev/null)

  # 미커밋 변경 감지
  if ! git -C "$DIR" diff --quiet 2>/dev/null || ! git -C "$DIR" diff --cached --quiet 2>/dev/null; then
    DIRTY="*"
  fi

  # staged/unstaged 파일 수
  ADDED=$(git -C "$DIR" diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
  MODIFIED=$(git -C "$DIR" diff --numstat 2>/dev/null | wc -l | tr -d ' ')

  # 색상 분리: staged(초록), unstaged(노랑)
  GIT_PARTS=""
  [ "$ADDED" -gt 0 ] && GIT_PARTS="${GREEN}+${ADDED}${RESET}"
  [ "$MODIFIED" -gt 0 ] && [ -n "$GIT_PARTS" ] && GIT_PARTS="${GIT_PARTS} "
  [ "$MODIFIED" -gt 0 ] && GIT_PARTS="${GIT_PARTS}${YELLOW}~${MODIFIED}${RESET}"
  [ -n "$GIT_PARTS" ] && GIT_STAT=" (${GIT_PARTS})"
fi

# 브랜치 색상: clean(초록), dirty(노랑)
GIT_COLOR="$GREEN"
[ -n "$DIRTY" ] && GIT_COLOR="$YELLOW"

# ============================================================
# 출력 조립
# ============================================================

# Line 1: 프로젝트 | 브랜치 | 모델 | 시간
LINE1="📁 ${BLUE}${PROJECT}${RESET}"
[ -n "$BRANCH" ] && LINE1="${LINE1} ${SEP} 🌿 ${GIT_COLOR}${BRANCH}${DIRTY}${RESET}${GIT_STAT}"
LINE1="${LINE1} ${SEP} ${CYAN}${MODEL}${RESET} ${SEP} ⏱️ ${WHITE}${NOW}${RESET}"

# Line 2: CTX | 5H | 7D 게이지
LINE2="${GRAY}CTX${RESET} $(usage_color "$CTX")$(bar "$CTX")${RESET} ${WHITE}${CTX}%${RESET}"
LINE2="${LINE2} ${SEP} ${GRAY}5H${RESET} $(usage_color "$SES")$(bar "$SES")${RESET} ${WHITE}${SES}%${RESET}"
LINE2="${LINE2} ${SEP} ${GRAY}7D${RESET} $(usage_color "$WEEK")$(bar "$WEEK")${RESET} ${WHITE}${WEEK}%${RESET}"

# Line 3: 토큰 | 비용
LINE3="📈 ${WHITE}$(format_tokens "$TOTAL_TOKENS") tokens${RESET} ${SEP} 💰 ${GREEN}$(awk -v c="$COST" 'BEGIN { printf "$%.2f", c }')${RESET}"

printf '%s\n' "$LINE1"
printf '%s\n' "$LINE2"
printf '%s\n' "$LINE3"
