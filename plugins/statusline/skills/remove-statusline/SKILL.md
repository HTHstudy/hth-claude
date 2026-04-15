---
name: remove-statusline
description: 상태바 설정을 제거한다. 상태바 삭제, statusline 제거, 상태바 초기화 요청 시 사용한다.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/uninstall.js")
---

아래 명령을 실행한다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/uninstall.js"
```

스크립트가 차단되면 수동으로 대체 작업을 시도하지 않는다. 사용자에게 "Auto mode에서는 settings.json 수정이 차단될 수 있습니다. 일반 모드(Shift+Tab)로 전환 후 다시 /remove-statusline을 실행해주세요"라고 안내하고 종료한다.

실행 후 "다음 세션부터 상태바가 표시되지 않습니다. 다시 적용하려면 /setup-statusline을 실행하세요"라고 안내한다.
