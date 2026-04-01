# frontend

프론트엔드 플러그인 - 레이어드 아키텍처 규칙 및 아키텍처 적용

## 개요

프론트엔드 코드 작성 시 일관된 레이어드 아키텍처를 자동 적용하는 플러그인입니다.
팀 전체가 동일한 구조와 규칙으로 코드를 생성할 수 있도록 지원합니다.

## 스킬 목록

| 스킬           | 유형        | 설명                                                                 |
| -------------- | ----------- | -------------------------------------------------------------------- |
| `architecture` | 자동 적용   | 프론트엔드 코드 작성·리뷰·리팩토링 시 레이어 아키텍처 규칙 자동 적용 |
| `fe-init`      | 사용자 호출 | Vite + React + TypeScript 기반 레이어드 아키텍처 프로젝트 초기 세팅  |

## 설치

```bash
/plugin install frontend
```

## 사용법

### 아키텍처 규칙 (자동)

별도 호출 없이, 프론트엔드 코드 작업 시 Claude가 자동으로 적용합니다:

- 레이어 구조: `app → pages → (widgets → features → entities →) shared`
- import 방향 규칙 (역방향 금지)
- Slice 분해·추출 원칙
- 네이밍 컨벤션 (kebab-case)
- ESLint 엔트리포인트 강제

### 프로젝트 생성

```
/frontend:fe-init
```

Vite + React + TypeScript 기반으로 아키텍처가 적용된 새 프로젝트를 생성합니다.

## 아키텍처 구조

```
src/
├─ main.tsx        ← 엔트리포인트 (app 외부)
├─ app/            ← 라우팅, Provider, 전역 스타일/레이아웃
├─ pages/          ← route 기준 화면 모듈 (핵심 레이어)
├─ widgets/        ← (선택) 복합 UI 블록
├─ features/       ← (선택) 사용자 인터랙션 단위
├─ entities/       ← (선택) 도메인 표현
└─ shared/         ← 기반 도구 (API, config, routes, UI, lib, hooks)
```

## 문서

- [한국어 문서](docs/ko/README.md)
- [English docs](docs/en/README.md)
