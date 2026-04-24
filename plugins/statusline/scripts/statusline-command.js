#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

// ============================================================
// 설정
// ============================================================
const BAR_WIDTH = 10;

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
  const n = Math.max(0, Math.min(100, Math.ceil(Number(v))));
  return String(n);
}

function bar(pct) {
  const filled = Math.ceil(pct * BAR_WIDTH / 100);
  const empty = BAR_WIDTH - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
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

// 리셋까지 남은 시간(d/h/m) — 5H·7D 공용
function formatRemaining(resetsAt, nowSec) {
  if (!resetsAt) return '';
  const remain = resetsAt - nowSec;
  if (remain <= 0) return 'ready';
  const d = Math.floor(remain / 86400);
  const h = Math.floor((remain % 86400) / 3600);
  const m = Math.floor((remain % 3600) / 60);
  if (d > 0) return `${d}d${h}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
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
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  // ============================================================
  // 데이터 추출
  // ============================================================
  const MODEL = getText(data, 'model.display_name') || 'Unknown';
  const DIR = getText(data, 'workspace.current_dir') || getText(data, 'cwd') || process.cwd();
  const CTX = getPct(data, 'context_window.used_percentage') || '0';
  const SES = getPct(data, 'rate_limits.five_hour.used_percentage') || '0';
  const WEEK = getPct(data, 'rate_limits.seven_day.used_percentage') || '0';
  const SES_RESETS_AT = getNum(data, 'rate_limits.five_hour.resets_at');
  const WEEK_RESETS_AT = getNum(data, 'rate_limits.seven_day.resets_at');
  const TOTAL_IN = getNum(data, 'context_window.total_input_tokens');
  const TOTAL_OUT = getNum(data, 'context_window.total_output_tokens');
  const COST = getNum(data, 'cost.total_cost_usd');

  const PROJECT = path.basename(DIR);
  const NOW = new Date().toTimeString().slice(0, 5);
  const NOW_SEC = Math.floor(Date.now() / 1000);
  const TOTAL_TOKENS = TOTAL_IN + TOTAL_OUT;

  // ============================================================
  // Git 상태 — `git status --porcelain --branch` 한 번으로 통합
  // ============================================================
  let BRANCH = '';
  let DIRTY = '';
  let GIT_STAT = '';

  if (exec('git rev-parse --git-dir', DIR)) {
    const status = exec('git status --porcelain --branch', DIR);
    const lines = status ? status.split('\n') : [];

    const head = lines[0] || '';
    if (head.startsWith('## ')) {
      const rest = head.slice(3);
      const noCommits = rest.match(/^No commits yet on (\S+)/);
      if (noCommits) BRANCH = noCommits[1];
      else if (rest.startsWith('HEAD ')) BRANCH = 'detached';
      else {
        const m = rest.match(/^([^.\s]+)/);
        if (m) BRANCH = m[1];
      }
    }

    let staged = 0, modified = 0, untracked = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const X = line[0], Y = line[1];
      if (X === '?' && Y === '?') untracked++;
      else {
        if (X !== ' ' && X !== '?') staged++;
        if (Y === 'M' || Y === 'D') modified++;
      }
    }

    if (staged || modified || untracked) DIRTY = '*';

    const parts = [];
    if (staged > 0) parts.push(`${GREEN}+${staged}${RESET}`);
    if (modified > 0) parts.push(`${YELLOW}!${modified}${RESET}`);
    if (untracked > 0) parts.push(`${GRAY}?${untracked}${RESET}`);
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

  // Line 2: CTX | 토큰 | 비용 (세션 지표)
  let line2 = `${GRAY}CTX${RESET} ${usageColor(ctxN)}${bar(ctxN)}${RESET} ${usageColor(ctxN)}${CTX}%${RESET}`;
  line2 += ` ${SEP} 📈 ${WHITE}${formatTokens(TOTAL_TOKENS)} tokens${RESET}`;
  line2 += ` ${SEP} 💰 ${GREEN}$${COST.toFixed(2)}${RESET}`;

  // Line 3: 5H | 7D 게이지 + 리셋 남은 시간 (레이트 리밋)
  const sesTimer = formatRemaining(SES_RESETS_AT, NOW_SEC);
  const weekTimer = formatRemaining(WEEK_RESETS_AT, NOW_SEC);
  let line3 = `${GRAY}5H${RESET} ${usageColor(sesN)}${bar(sesN)}${RESET} ${usageColor(sesN)}${SES}%${RESET}`;
  if (sesTimer) line3 += ` ${GRAY}⏳${sesTimer}${RESET}`;
  line3 += ` ${SEP} ${GRAY}7D${RESET} ${usageColor(weekN)}${bar(weekN)}${RESET} ${usageColor(weekN)}${WEEK}%${RESET}`;
  if (weekTimer) line3 += ` ${GRAY}⏳${weekTimer}${RESET}`;

  console.log(line1);
  console.log(line2);
  console.log(line3);
});
