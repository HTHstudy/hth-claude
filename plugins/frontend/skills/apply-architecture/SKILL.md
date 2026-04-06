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

### 1. 비정상 종료 감지

`git status`로 커밋되지 않은 변경사항이 있는지 확인한다.

변경사항이 있으면 이전 세션에서 Phase 진행 중 종료된 것이다:
1. 사용자에게 상황을 보고한다: "이전 세션에서 Phase 진행 중 종료된 것으로 보입니다."
2. 변경사항을 버리고 해당 Phase를 재시작할지 확인한다
3. 사용자가 동의하면 `git checkout .`으로 미완성 변경사항을 정리한다
4. 이전 Phase까지의 커밋은 보존된다

### 2. 완료된 Phase 판별

두 가지 기준으로 판별한다:

**기준 A — 커밋 메시지** (`git log --oneline`):
- `refactor: 레이어드 아키텍처 폴더 구조 전환` → Phase 1 완료
- `refactor: shared/api 3계층 구조 적용` → Phase 2 완료
- `refactor: query/mutation 팩토리 패턴 적용` → Phase 3 완료
- `refactor: 코드 정리 및 shared 모듈 세분화` → Phase 4 완료

**기준 B — 프로젝트 구조** (수동 작업 감지용):
- `.architecture-migration/assessment.md` 존재 → Phase 0 완료
- `app/`, `pages/`, `shared/` 구조 존재 → Phase 1 완료 가능성
- `shared/api/base/` + 도메인별 3계층 구조 존재 → Phase 2 완료 가능성
- `shared/query-factory/`, `shared/mutation-factory/` 존재 → Phase 3 완료 가능성

**판별 로직:**
- 커밋 있음 → 해당 Phase 완료 확정
- 커밋 없음 + 구조 있음 → 사용자에게 확인 ("Phase N이 수동으로 진행된 것으로 보입니다. 완료된 것으로 간주할까요?")
- 둘 다 없음 → 미완료

분석 결과를 사용자에게 보고하고, 미완료 Phase부터 진행한다.

---

## Phase 목록

> 아래 문서 링크는 참조용이다. 각 Phase에 진입할 때만 해당 문서를 읽는다.

| Phase | 내용 | 상세 문서 |
|-------|------|-----------|
| Phase 0 | 사전 평가 — 프로젝트 규모·복잡도 분석, 전환 범위 결정 | [phase-0-assessment.md](phases/phase-0-assessment.md) |
| Phase 1 | 구조 전환 — 폴더 구조 분석, 전환 계획, 파일 이동, import 수정 | [phase-1-structure.md](phases/phase-1-structure.md) |
| Phase 2 | shared/api 3계층 구조 적용 — 기존 API 코드를 도메인별 3계층으로 전환 | [phase-2-shared-api.md](phases/phase-2-shared-api.md) |
| Phase 3 | query/mutation 팩토리 적용 — TanStack Query 사용 프로젝트만 | [phase-3-query-mutation.md](phases/phase-3-query-mutation.md) |
| Phase 4 | 코드 정리 및 세분화 — shared 세그먼트 분류, page 분해, 선택 레이어 제안 | [phase-4-cleanup.md](phases/phase-4-cleanup.md) |
| Phase 5 | 최종 보고 — 전환 결과 요약, 미적용 항목, 후속 작업 제안 | [phase-5-report.md](phases/phase-5-report.md) |

---

## 브랜치 생성

Phase 0 완료 후, Phase 1 시작 전에 작업용 브랜치를 생성한다:

1. 현재 브랜치 이름과 상태를 확인한다 (`git status`, `git branch`)
2. 커밋되지 않은 변경사항이 있으면 사용자에게 먼저 정리하도록 안내한다
3. 새 브랜치를 생성하고 체크아웃한다:

```bash
git checkout -b refactor/apply-architecture
```

- 같은 이름의 브랜치가 이미 존재하면 날짜를 붙인다: `refactor/apply-architecture-YYYYMMDD`

사용자에게 생성된 브랜치를 확인시킨 후 Phase 1을 시작한다.

---

## 컨텍스트 관리 원칙

Phase 상세 문서는 **해당 Phase에 진입할 때만** 읽는다. 모든 Phase 문서를 미리 읽지 않는다.

각 Phase 진행 흐름:
1. 사용자에게 다음 Phase 진행 여부를 확인한다
2. 사용자가 승인하면 해당 Phase의 상세 문서를 읽는다
3. 상세 문서의 단계를 따라 작업을 수행한다
4. Phase 완료 후, 빌드 검증 및 중간 커밋을 수행한다
5. 다음 Phase로 넘어가기 전에 이전 Phase 문서의 세부 내용에 의존하지 않는다

이렇게 하면 각 Phase에서 필요한 정보만 컨텍스트에 유지되어, 긴 마이그레이션에서도 정확한 지시를 따를 수 있다.

---

## 중간 커밋

각 Phase 완료 후, 빌드 검증이 성공하면 반드시 중간 커밋을 생성한다.

커밋 메시지 형식:

| Phase | 커밋 메시지 |
|-------|-------------|
| Phase 1 | `refactor: 레이어드 아키텍처 폴더 구조 전환` |
| Phase 2 | `refactor: shared/api 3계층 구조 적용` |
| Phase 3 | `refactor: query/mutation 팩토리 패턴 적용` |
| Phase 4 | `refactor: 코드 정리 및 shared 모듈 세분화` |

Phase 0은 분석만 수행하므로 커밋 불필요. Phase 5는 보고서만 생성하므로 커밋 불필요.

**커밋 절차:**
1. 빌드가 정상인지 확인한다
2. 변경된 파일을 모두 스테이징한다
3. 위 형식의 커밋 메시지로 커밋한다
4. 사용자에게 커밋 완료를 알린다

**Phase가 실패하면:**
- 해당 Phase의 변경사항을 `git checkout .`으로 되돌릴 수 있다
- 이전 Phase까지의 커밋은 보존된다
- 사용자에게 상황을 보고하고, 재시도 또는 중단을 선택하게 한다

---

## 주의사항

- 각 Phase 시작 전에 반드시 사용자 확인을 받는다.
- 파일 이동 시 `git mv`를 사용하여 히스토리를 보존한다.
- 선택 레이어(widgets, features, entities)를 강제하지 않는다.
- Next.js 프로젝트는 반드시 [nextjs.md](../architecture/integrations/nextjs.md)를 참조하여 루트 라우팅 폴더와 `src/` FSD 레이어를 분리한다.
- 전환 과정에서 네이밍 컨벤션(kebab-case 파일명, Named Export)을 적용한다.
- 각 Phase 완료 후 빌드가 정상인지 반드시 확인한다.
