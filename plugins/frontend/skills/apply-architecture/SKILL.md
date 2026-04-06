---
name: apply-architecture
description: 기존 프론트엔드 프로젝트에 레이어드 아키텍처를 적용한다. 폴더 재구조화, API 패턴, query/mutation 팩토리까지 단계별로 진행.
disable-model-invocation: true
---

# 기존 프로젝트에 레이어드 아키텍처 적용

현재 프로젝트 구조를 분석하고 레이어드 아키텍처로 전환한다.

## 사전 요구사항

이 스킬 실행 전 `/frontend:architecture` 스킬을 반드시 로드한다.

---

각 단계는 완료 후 빌드 가능한 상태를 유지한다. 중간에 중단되더라도 완료된 단계까지는 정상 동작한다.

## 실행 전 상태 확인

커맨드 실행 시 프로젝트의 현재 상태를 먼저 분석하여, 이미 적용된 항목을 판별한다:
- `app/`, `pages/`, `shared/` 구조가 존재하는가 → Phase 1 완료 여부
- `shared/api/base/`와 도메인별 3계층 구조가 존재하는가 → Phase 2 완료 여부
- `shared/query-factory/`, `shared/mutation-factory/`가 존재하는가 → Phase 3 완료 여부
- path alias, ESLint 규칙이 설정되어 있는가

분석 결과를 사용자에게 보고하고, 미완료 Phase부터 진행한다.

---

## Phase 목록

| Phase | 내용 | 상세 문서 |
|-------|------|-----------|
| Phase 1 | 구조 전환 — 폴더 구조 분석, 전환 계획, 파일 이동, import 수정 | [phase-1-structure.md](phases/phase-1-structure.md) |
| Phase 2 | shared/api 3계층 구조 적용 — 기존 API 코드를 도메인별 3계층으로 전환 | [phase-2-shared-api.md](phases/phase-2-shared-api.md) |
| Phase 3 | query/mutation 팩토리 적용 — TanStack Query 사용 프로젝트만 | [phase-3-query-mutation.md](phases/phase-3-query-mutation.md) |
| Phase 4 | 코드 정리 및 세분화 — shared 세그먼트 분류, page 분해, 선택 레이어 제안 | [phase-4-cleanup.md](phases/phase-4-cleanup.md) |
| Phase 5 | 최종 보고 — 전환 결과 요약, 미적용 항목, 후속 작업 제안 | [phase-5-report.md](phases/phase-5-report.md) |

각 Phase 시작 전에 반드시 사용자 확인을 받는다. 해당 Phase의 상세 문서를 읽고 진행한다.

---

## 주의사항

- 각 Phase 시작 전에 반드시 사용자 확인을 받는다.
- 파일 이동 시 `git mv`를 사용하여 히스토리를 보존한다.
- 선택 레이어(widgets, features, entities)를 강제하지 않는다.
- Next.js 프로젝트는 반드시 [nextjs.md](../architecture/integrations/nextjs.md)를 참조하여 루트 라우팅 폴더와 `src/` FSD 레이어를 분리한다.
- 전환 과정에서 네이밍 컨벤션(kebab-case 파일명, Named Export)을 적용한다.
- 각 Phase 완료 후 빌드가 정상인지 반드시 확인한다.
