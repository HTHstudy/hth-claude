#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

// ============================================================
// 설정
// ============================================================
const BAR_WIDTH = 12;

// ============================================================
// 색상 (ANSI escape)
// ============================================================
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const GRAY = '\x1b[90m';
const SEP = `${GRAY}|${RESET}`;

// ============================================================
// 함수
// ============================================================

function get(obj, keyPath) {
  for (const k of keyPath.split('.')) {
    if (obj == null || typeof obj !== 'object') return undefined;
    obj = obj[k];
  }
  return obj;
}

function getText(data, keyPath) {
  const v = get(data, keyPath);
  return v != null ? String(v) : '';
}

function getNum(data, keyPath) {
  const v = get(data, keyPath);
  return v != null ? Number(v) || 0 : 0;
}

function getPct(data, keyPath) {
  const v = get(data, keyPath);
  if (v == null) return '';
  const n = Math.max(0, Math.min(100, Math.floor(Number(v))));
  return String(n);
}

function bar(pct) {
  let filled = Math.floor(pct * BAR_WIDTH / 100);
  if (pct > 0 && filled === 0) filled = 1;
  const empty = BAR_WIDTH - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatTokens(t) {
  if (t >= 1000000) return (t / 1000000).toFixed(1) + 'M';
  if (t >= 1000) return (t / 1000).toFixed(1) + 'K';
  return String(t);
}

function usageColor(pct) {
  if (pct >= 80) return RED;
  if (pct >= 50) return YELLOW;
  return WHITE;
}

function exec(cmd, cwd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// ============================================================
// stdin 읽기
// ============================================================
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const data = JSON.parse(input);

  // ============================================================
  // 데이터 추출
  // ============================================================
  const MODEL = getText(data, 'model.display_name') || 'Unknown';
  const DIR = getText(data, 'workspace.current_dir') || getText(data, 'cwd') || process.cwd();
  const CTX = getPct(data, 'context_window.used_percentage') || '0';
  const SES = getPct(data, 'rate_limits.five_hour.used_percentage') || '0';
  const WEEK = getPct(data, 'rate_limits.seven_day.used_percentage') || '0';
  const TOTAL_IN = getNum(data, 'context_window.total_input_tokens');
  const TOTAL_OUT = getNum(data, 'context_window.total_output_tokens');
  const COST = getNum(data, 'cost.total_cost_usd');

  const PROJECT = path.basename(DIR);
  const NOW = new Date().toTimeString().slice(0, 5);
  const TOTAL_TOKENS = TOTAL_IN + TOTAL_OUT;

  // ============================================================
  // Git 상태
  // ============================================================
  let BRANCH = '';
  let DIRTY = '';
  let GIT_STAT = '';

  if (exec('git rev-parse --git-dir', DIR)) {
    BRANCH = exec('git branch --show-current', DIR);

    const diffQuiet = exec('git diff --quiet', DIR);
    const diffCachedQuiet = exec('git diff --cached --quiet', DIR);
    // exec returns '' on error (non-zero exit), check if diff --quiet failed
    try {
      execSync('git diff --quiet', { cwd: DIR, stdio: 'ignore' });
      try {
        execSync('git diff --cached --quiet', { cwd: DIR, stdio: 'ignore' });
      } catch { DIRTY = '*'; }
    } catch { DIRTY = '*'; }

    const addedRaw = exec('git diff --cached --numstat', DIR);
    const modifiedRaw = exec('git diff --numstat', DIR);
    const ADDED = addedRaw ? addedRaw.split('\n').length : 0;
    const MODIFIED = modifiedRaw ? modifiedRaw.split('\n').length : 0;

    const parts = [];
    if (ADDED > 0) parts.push(`${GREEN}+${ADDED}${RESET}`);
    if (MODIFIED > 0) parts.push(`${YELLOW}~${MODIFIED}${RESET}`);
    if (parts.length) GIT_STAT = ` (${parts.join(' ')})`;
  }

  const GIT_COLOR = DIRTY ? YELLOW : GREEN;

  // ============================================================
  // 출력 조립
  // ============================================================
  const ctxN = Number(CTX);
  const sesN = Number(SES);
  const weekN = Number(WEEK);

  // Line 1: 프로젝트 | 브랜치 | 모델 | 시간
  let line1 = `📁 ${BLUE}${PROJECT}${RESET}`;
  if (BRANCH) line1 += ` ${SEP} 🌿 ${GIT_COLOR}${BRANCH}${DIRTY}${RESET}${GIT_STAT}`;
  line1 += ` ${SEP} ${CYAN}${MODEL}${RESET} ${SEP} ⏱️  ${WHITE}${NOW}${RESET}`;

  // Line 2: CTX | 5H | 7D 게이지
  let line2 = `${GRAY}CTX${RESET} ${usageColor(ctxN)}${bar(ctxN)}${RESET} ${WHITE}${CTX}%${RESET}`;
  line2 += ` ${SEP} ${GRAY}5H${RESET} ${usageColor(sesN)}${bar(sesN)}${RESET} ${WHITE}${SES}%${RESET}`;
  line2 += ` ${SEP} ${GRAY}7D${RESET} ${usageColor(weekN)}${bar(weekN)}${RESET} ${WHITE}${WEEK}%${RESET}`;

  // Line 3: 토큰 | 비용
  const line3 = `📈 ${WHITE}${formatTokens(TOTAL_TOKENS)} tokens${RESET} ${SEP} 💰 ${GREEN}$${COST.toFixed(2)}${RESET}`;

  console.log(line1);
  console.log(line2);
  console.log(line3);
});
