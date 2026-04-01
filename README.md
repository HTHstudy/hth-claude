# Claude Code Marketplace

팀 내부 Claude Code 플러그인 마켓플레이스입니다.

## 구조

```
.claude-plugin/
  marketplace.json        # 마켓플레이스 메타 설정
plugins/
  <plugin-name>/
    .claude-plugin/
      plugin.json         # 플러그인 메타정보
    skills/               # 스킬 소스
    docs/                 # 문서
    README.md             # 플러그인 설명
```

## 등록된 플러그인

| 플러그인 | 설명 | 작성자 |
|---------|------|--------|
| [`frontend`](plugins/frontend) | 프론트엔드 레이어드 아키텍처 규칙 및 자동 적용 | 하태현 |

## 사용법

### 1. 레포지토리 클론

```bash
git clone <this-repo-url>
```

### 2. 스킬 설치

사용하려는 플러그인의 `skills/` 디렉토리를 프로젝트의 `.claude/skills/`에 복사합니다.

```bash
# 예: frontend 플러그인의 architecture 스킬 설치
cp -r plugins/frontend/skills/architecture <your-project>/.claude/skills/
```

### 3. 스킬 사용

- **자동 적용 스킬** (예: `architecture`) — 별도 호출 없이 Claude가 코드 작성 시 자동 적용
- **사용자 호출 스킬** (예: `fe-init`) — `/frontend:fe-init` 으로 호출

## 플러그인 추가 방법

1. `plugins/` 아래에 새 디렉토리 생성
2. `.claude-plugin/plugin.json` 작성:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "플러그인 설명",
  "author": {
    "name": "작성자",
    "email": "email@example.com"
  }
}
```

3. `skills/`, `docs/` 등 플러그인 소스 추가
4. `README.md` 작성
5. 루트 `.claude-plugin/marketplace.json`의 `plugins` 배열에 등록
6. PR 생성 후 팀 리뷰
