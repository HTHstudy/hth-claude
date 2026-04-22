---
name: create
description: 레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다. React(Vite) 또는 Next.js App Router 선택 가능.
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js" *)
---

# 프론트엔드 프로젝트 생성

레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다.

## 사전 요구사항

이 스킬 실행 전 `frontend:architecture` 스킬을 반드시 로드한다.

---

## 실행 단계

### 1단계: 프로젝트 정보 확인

AskUserQuestion 도구를 사용하여 아래 세 질문을 **한 번에** 수행한다:

1. **프로젝트 이름**
   - question: "프로젝트 이름을 입력해주세요. (Other를 선택하여 직접 입력)"
   - header: "Name"
   - options:
     - label: "my-app", description: "기본 프로젝트 이름"
     - label: "frontend", description: "기본 프로젝트 이름"
2. **프레임워크 선택**
   - question: "어떤 프레임워크를 사용할까요?"
   - header: "Framework"
   - options:
     - label: "React (Vite + React Router)", description: "Vite, React, React Router, TypeScript, Tailwind"
     - label: "Next.js App Router", description: "Next.js, App Router, TypeScript, Tailwind"
3. **패키지 매니저 선택**
   - question: "어떤 패키지 매니저를 사용할까요?"
   - header: "PM"
   - options:
     - label: "yarn", description: "Yarn"
     - label: "npm", description: "npm"
     - label: "pnpm", description: "pnpm"

사용자 응답을 받은 뒤:

- 프로젝트 이름과 동일한 디렉토리가 현재 경로에 이미 존재하는지 확인한다.
- 존재하면 사용자에게 다른 이름을 요청한다.
- 프레임워크 매핑: `React (Vite + React Router)` → `react-vite`, `Next.js App Router` → `nextjs-app-router`
- 선택된 패키지 매니저를 템플릿의 모든 설치/실행 명령에 사용한다

### 2단계: 템플릿 실행

선택된 프레임워크의 템플릿 문서를 읽고, 해당 문서의 단계를 따라 진행한다.

| 선택 | 템플릿                                                 |
| ---- | ------------------------------------------------------ |
| 1    | [react-vite.md](templates/react-vite.md)               |
| 2    | [nextjs-app-router.md](templates/nextjs-app-router.md) |

---

## 공통 주의사항

- 의존성 설치 전 `${CLAUDE_PLUGIN_ROOT}/scripts/resolve-versions.js`를 프로젝트 디렉토리에서 실행하여 버전 조회를 수행한다. 설치 완료 후 `.resolved-versions.json`을 삭제한다.
- **버전 조회 실패 시:** 스크립트가 exit code 2를 반환하면 `.resolved-versions.json`의 `errors` 배열을 확인한다. 실패한 패키지는 사용자에게 보고하고, npmjs.com에서 릴리스 날짜가 14일 이상 경과한 안정 버전을 직접 확인하여 `.resolved-versions.json`의 `packages`에 수동으로 추가하도록 안내한다. 최신 버전을 무조건 사용하지 않는다 — 공급망 공격 방지가 이 스크립트의 목적이다.
- `widgets/`, `features/`, `entities/` 디렉토리를 생성하지 않는다. 필요할 때만 도입하는 선택 레이어다.
- 프레임워크 템플릿의 기본 파일(기본 CSS, 플레이스홀더 콘텐츠 등)을 제거한다.
- 템플릿 실행 완료 후 ESLint 아키텍처 규칙이 모두 포함되었는지 확인한다:
  - `no-restricted-imports` (레이어 방향 + Slice 내부 접근 차단)
  - `import/no-default-export` (+ 프레임워크 예외 파일 override)
  - `@typescript-eslint/consistent-type-imports`
  - 규칙이 누락되었으면 [eslint-config.md](../architecture/rules/eslint-config.md)의 전체 템플릿을 적용한다.

## 팁

API 응답이 통일된 형식(예: 모든 API가 `{ data: T }`를 반환)을 따른다면, `shared/api/base/types.ts`에 공통 응답 타입을 정의한다:

```ts
export type DefaultResponse<T> = {
  data: T;
};
```
