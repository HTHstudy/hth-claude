---
name: fe-init
description: 레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다. React(Vite) 또는 Next.js App Router 선택 가능.
---

# 프론트엔드 프로젝트 생성

레이어드 아키텍처가 적용된 새 프론트엔드 프로젝트를 생성한다.

## 사전 요구사항

이 스킬 실행 전 `/frontend:architecture` 스킬을 반드시 로드한다.

---

## 실행 단계

### 1단계: 프로젝트 정보 확인

AskUserQuestion 도구를 사용하여 아래 두 질문을 **한 번에** 수행한다:

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

사용자 응답을 받은 뒤:

- 프로젝트 이름과 동일한 디렉토리가 현재 경로에 이미 존재하는지 확인한다.
- 존재하면 사용자에게 다른 이름을 요청한다.
- 프레임워크 매핑: `React (Vite + React Router)` → `react-vite`, `Next.js App Router` → `nextjs-app-router`

### 2단계: 템플릿 실행

선택된 프레임워크의 템플릿 문서를 읽고, 해당 문서의 단계를 따라 진행한다.

| 선택 | 템플릿                                                 |
| ---- | ------------------------------------------------------ |
| 1    | [react-vite.md](templates/react-vite.md)               |
| 2    | [nextjs-app-router.md](templates/nextjs-app-router.md) |

---

## 공통 주의사항

- `widgets/`, `features/`, `entities/` 디렉토리를 생성하지 않는다. 필요할 때만 도입하는 선택 레이어다.
- 프레임워크 템플릿의 기본 파일(기본 CSS, 플레이스홀더 콘텐츠 등)을 제거한다.

## 팁

API 응답이 통일된 형식(예: 모든 API가 `{ data: T }`를 반환)을 따른다면, `shared/api/base/types.ts`에 공통 응답 타입을 정의한다:

```ts
export type DefaultResponse<T> = {
  data: T;
};
```
