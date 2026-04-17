#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const TARGET_DIR = path.join(require('os').homedir(), '.claude');
const TARGET_SCRIPT = path.join(TARGET_DIR, 'statusline-command.js');
const SETTINGS = path.join(TARGET_DIR, 'settings.json');
const SOURCE_SCRIPT = path.join(SCRIPT_DIR, 'statusline-command.js');

try {
  // 1. Copy statusline script
  if (!fs.existsSync(SOURCE_SCRIPT)) {
    console.error(`❌ 소스 파일을 찾을 수 없습니다: ${SOURCE_SCRIPT}`);
    process.exit(1);
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.copyFileSync(SOURCE_SCRIPT, TARGET_SCRIPT);
  if (process.platform !== 'win32') fs.chmodSync(TARGET_SCRIPT, 0o755);

  // 2. Inject statusLine config into settings.json
  let data = {};
  if (fs.existsSync(SETTINGS)) {
    try {
      data = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch {
      console.error('⚠️  settings.json 파싱 실패 — 백업 후 새로 생성합니다.');
      fs.copyFileSync(SETTINGS, SETTINGS + '.bak');
      data = {};
    }
  }
  data.statusLine = {
    type: 'command',
    command: 'node ~/.claude/statusline-command.js',
    refreshInterval: 10
  };
  const tmp = SETTINGS + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, SETTINGS);

  console.log('✅ Statusline installed. Restart session to apply.');
} catch (err) {
  console.error(`❌ 설치 실패: ${err.message}`);
  process.exit(1);
}
