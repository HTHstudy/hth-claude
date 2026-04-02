# HTH Claude Code Plugins

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

## 플러그인 설치

```
/plugin install frontend@hth-plugins
```

> 설치 후 세션을 재시작해야 스킬이 적용됩니다.

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

## 플러그인 상세

### 1. frontend (프론트엔드 아키텍처)

레이어드 아키텍처 규칙을 자동 적용하고, 표준 프로젝트를 초기 세팅합니다.

- **Skills**: architecture (자동 적용 — 레이어 구조, import 방향, 네이밍 컨벤션)
- **Commands**: `/frontend:fe-init` (프로젝트 생성), `/frontend:apply-architecture` (기존 프로젝트 전환)
- **Architecture**: `app → pages → (widgets → features → entities →) shared`
- **Resources**: 레이어별 상세 규칙, shared/api 3계층 패턴, query/mutation factory 패턴
- **Docs**: [한국어](plugins/frontend/docs/ko/README.md) · [English](plugins/frontend/docs/en/README.md)

## 업데이트

- GitHub repo 기반 마켓플레이스는 세션 시작 시 자동으로 업데이트를 확인합니다.
- 수동 업데이트: `claude plugin update frontend@hth-plugins`

## 디렉토리 구조

```
hth-claude/
├── .claude-plugin/
│   └── marketplace.json                # 마켓플레이스 정의
├── plugins/
│   └── frontend/                       # 프론트엔드 플러그인
│       ├── .claude-plugin/plugin.json  # 플러그인 매니페스트
│       ├── skills/
│       │   └── architecture/           # 자동 적용 스킬
│       │       ├── SKILL.md
│       │       ├── layers/             # 레이어별 상세 규칙
│       │       └── rules/              # Slice 공통 규칙
│       ├── commands/                   # 사용자 호출 커맨드
│       │   ├── fe-init.md              # 새 프로젝트 생성
│       │   └── apply-architecture.md   # 기존 프로젝트 전환
│       └── docs/                       # 한국어/영어 문서
└── README.md
```
