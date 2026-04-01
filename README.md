# HTH Claude Code Plugins

## 개요

Claude Code 플러그인으로 구성된 팀 내부 마켓플레이스입니다.
필요한 플러그인만 선택 설치할 수 있으며, GitHub repo 기반 마켓플레이스를 통해 자동 업데이트를 지원합니다.

## 사전 준비

### 1. Claude Code 설치

```bash
npm install -g @anthropic-ai/claude-code
```

## 마켓플레이스 등록

```
/plugin marketplace add HTHstudy/hth-claude
```

또는 프로젝트 `.claude/settings.json`에 추가:

```json
{
  "extraKnownMarketplaces": {
    "hth-plugins": "HTHstudy/hth-claude"
  }
}
```

## 플러그인 설치

```bash
/plugin install frontend@hth-plugins
```

## 플러그인 상세

### 1. frontend (프론트엔드 아키텍처)

레이어드 아키텍처 규칙을 자동 적용하고, 표준 프로젝트를 초기 세팅합니다.

- **Skills**: architecture (자동 적용 — 레이어 구조, import 방향, 네이밍 컨벤션), `/frontend:fe-init` (Vite + React + TS 프로젝트 초기 세팅)
- **Architecture**: `app → pages → (widgets → features → entities →) shared`
- **Resources**: 레이어별 상세 규칙, shared/api 3계층 패턴, query/mutation factory 패턴
- **Docs**: [한국어](plugins/frontend/docs/ko/README.md) · [English](plugins/frontend/docs/en/README.md)

## 자동 업데이트

- GitHub repo 기반 마켓플레이스는 세션 시작 시 자동으로 업데이트를 확인합니다.
- 수동 업데이트: `claude plugin update` 명령

## 디렉토리 구조

```
hth-claude/
├── .claude-plugin/
│   └── marketplace.json              # 플러그인 참조
├── plugins/
│   └── frontend/                     # 프론트엔드 아키텍처
│       ├── .claude-plugin/plugin.json
│       ├── skills/architecture/      # 레이어드 아키텍처 규칙 (자동 적용)
│       ├── skills/fe-init/           # 프로젝트 초기 세팅
│       └── docs/                     # 한국어/영어 문서
└── README.md
```
