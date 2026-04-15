#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TARGET_SCRIPT = path.join(require('os').homedir(), '.claude', 'statusline-command.js');
const SETTINGS = path.join(require('os').homedir(), '.claude', 'settings.json');

try {
  // 1. Remove statusline script
  if (fs.existsSync(TARGET_SCRIPT)) {
    fs.unlinkSync(TARGET_SCRIPT);
  }

  // 2. Remove statusLine config from settings.json
  if (fs.existsSync(SETTINGS)) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch {
      console.error('⚠️  settings.json 파싱 실패 — statusLine 제거를 건너뜁니다.');
      console.log('✅ Statusline script removed. settings.json은 수동으로 확인하세요.');
      process.exit(0);
    }
    delete data.statusLine;
    fs.writeFileSync(SETTINGS, JSON.stringify(data, null, 2) + '\n');
  }

  console.log('✅ Statusline removed. Restart session to apply.');
} catch (err) {
  console.error(`❌ 제거 실패: ${err.message}`);
  process.exit(1);
}
