# HTH Claude Code Plugins

> **Repository**: https://github.com/HTHstudy/hth-claude

## 개요

Claude Code 플러그인으로 구성된 팀 내부 마켓플레이스입니다.
필요한 플러그인만 선택 설치할 수 있으며, GitHub repo 기반 마켓플레이스를 통해 자동 업데이트를 지원합니다.

## 사전 준비

### Claude Code 설치

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

## 마켓플레이스 등록

```
/plugin marketplace add HTHstudy/hth-claude
```

## 팀 프로젝트에 자동 등록

팀 프로젝트의 `.claude/settings.json`에 아래를 추가하면, 팀원이 프로젝트를 클론받았을 때 마켓플레이스가 자동으로 등록됩니다:

```json
{
  "extraKnownMarketplaces": {
    "hth-plugins": {
      "source": {
        "source": "github",
        "repo": "HTHstudy/hth-claude"
      }
    }
  }
}
```

## 플러그인 설치 (개별)

```
/plugin install frontend@hth-plugins
/plugin install statusline@hth-plugins
```

> 설치 후 세션을 재시작해야 스킬이 적용됩니다.

## 플러그인 상세

### 1. frontend (프론트엔드 아키텍처)

레이어드 아키텍처 규칙을 자동 적용하고, 표준 프로젝트를 초기 세팅합니다. React(Vite)와 Next.js(App Router / Pages Router) 모두 지원합니다.

- **Skills**:
  - `architecture` — 프론트엔드 코드 작성·리뷰·리팩토링 시 레이어 아키텍처 규칙 자동 적용 (Next.js 감지 시 추가 규칙 자동 로드)
  - `create` — 레이어드 아키텍처 기반 새 프로젝트 생성 (`/frontend:create`)
  - `migrate` — 기존 프로젝트를 레이어드 아키텍처로 단계별 전환 (`/frontend:migrate`)
- **Architecture**: `app → pages → (widgets → features → entities →) shared`
- **Resources**: 레이어별 상세 규칙, shared/api 3계층 패턴, query/mutation factory 패턴, Next.js FSD 적용 가이드
- **Docs**: [한국어](plugins/frontend/docs/ko/README.md) · [English](plugins/frontend/docs/en/README.md)

### 2. statusline (커스텀 상태바)

3줄 구성의 커스텀 상태바 프리셋을 설치합니다. 10초마다 자동 갱신.

| 표시 | 의미 |
|------|------|
| 📁 `hth-claude` | 현재 프로젝트명 |
| 🌿 `main*` (+N ~N) | 브랜치, 미커밋 변경(`*`), staged/unstaged 파일 수 |
| `Opus 4.6 (1M context)` | 현재 사용 중인 모델명 |
| ⏱ `14:23` | 현재 시각 |
| **CTX** `▓▓▓▓▓░░░ 62%` | 컨텍스트 윈도우 사용률 |
| **5H** `▓▓▓░░░░░ 38%` | 5시간 rate limit 사용률 |
| **7D** `▓▓▓▓▓▓░░ 73%` | 7일 rate limit 사용률 |
| 🔢 `482.7K tokens` | 세션 누적 토큰 수 |
| 💰 `$12.84` | 세션 누적 비용 (USD) |

**출력 예시**

```
📁 hth-claude | 🌿 main* (+3 ~2) | Opus 4.6 (1M context) | ⏱ 14:23
CTX ▓▓▓▓▓░░░ 62% | 5H ▓▓▓░░░░░ 38% | 7D ▓▓▓▓▓▓░░ 73%
🔢 482.7K tokens | 💰 $12.84
```

- **Skills**:
  - `setup-statusline` — 상태바 설치 (`/statusline:setup-statusline`)
  - `remove-statusline` — 상태바 제거 (`/statusline:remove-statusline`)

## 업데이트

- GitHub repo 기반 마켓플레이스는 세션 시작 시 자동으로 업데이트를 확인합니다.
- 수동 업데이트: `claude plugin update frontend@hth-plugins`

## 디렉토리 구조

```
hth-claude/
├── .claude-plugin/
│   └── marketplace.json                # 마켓플레이스 정의
├── plugins/
│   ├── statusline/                     # 상태바 플러그인
│   │   ├── .claude-plugin/plugin.json
│   │   ├── scripts/
│   │   │   ├── statusline-command.js   # 상태바 스크립트
│   │   │   ├── install.js             # 설치 스크립트
│   │   │   └── uninstall.js           # 제거 스크립트
│   │   └── skills/
│   │       ├── setup-statusline/       # 설치 스킬
│   │       └── remove-statusline/      # 제거 스킬
│   └── frontend/                       # 프론트엔드 플러그인
│       ├── .claude-plugin/plugin.json  # 플러그인 매니페스트
│       ├── scripts/
│       │   └── resolve-versions.js     # 버전 검증 스크립트
│       ├── skills/
│       │   ├── architecture/           # 자동 적용 스킬
│       │   │   ├── SKILL.md
│       │   │   ├── integrations/       # 프레임워크별 적용 가이드
│       │   │   │   ├── nextjs.md
│       │   │   │   └── nextjs-rsc-tanstack-query.md
│       │   │   ├── layers/             # 레이어별 상세 규칙
│       │   │   │   ├── app.md
│       │   │   │   ├── pages.md
│       │   │   │   ├── shared.md
│       │   │   │   ├── shared-api.md
│       │   │   │   ├── shared-query-factory.md
│       │   │   │   ├── shared-mutation-factory.md
│       │   │   │   └── optional-layers.md
│       │   │   └── rules/              # 공통 규칙 및 템플릿
│       │   │       ├── rules.md
│       │   │       ├── eslint-config.md
│       │   │       ├── eslint-flat-config.md
│       │   │       ├── eslint-legacy-config.md
│       │   │       └── http-client.md
│       │   ├── create/                 # 새 프로젝트 생성 스킬
│       │   │   ├── SKILL.md
│       │   │   └── templates/
│       │   │       ├── react-vite.md
│       │   │       └── nextjs-app-router.md
│       │   └── migrate/                # 기존 프로젝트 전환 스킬
│       │       ├── SKILL.md
│       │       └── phases/
│       │           ├── phase-0-plan.md
│       │           ├── phase-1-structure.md
│       │           ├── phase-2-rules.md
│       │           ├── phase-3-api.md
│       │           ├── phase-4-query.md
│       │           └── phase-5-verify.md
│       └── docs/                       # 한국어/영어 문서
└── README.md
```
