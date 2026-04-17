---
name: migrate
description: 기존 프론트엔드 프로젝트에 레이어드 아키텍처를 적용한다. architecture 스킬 기반 2중 검증(계획 + 검증).
disable-model-invocation: true
allowed-tools: Bash(npx tsc *) Bash(npx eslint *) Bash(echo *>> .architecture-migration/timing.log)
---

# 기존 프로젝트에 레이어드 아키텍처 적용

현재 프로젝트 구조를 분석하고 레이어드 아키텍처로 전환한다.

## 설계 원칙

- **규칙의 단일 출처:** architecture 스킬이 "올바른 상태"를 정의한다. Phase 문서에 규칙을 복제하지 않는다.
- **2중 검증:** Phase 0에서 architecture 기반으로 계획, Phase 5에서 architecture 기반으로 검증.
- **Phase 문서 = 실행 전략만:** 각 Phase 문서는 "어떻게 전환하는가"(EXECUTION)와 "마이그레이션 전용 규칙"(ADDED)만 포함한다.

## 사전 요구사항

| Phase | 로드 대상 |
|-------|-----------|
| Phase 0 | `/frontend:architecture` SKILL.md 전체 + Next.js면 [nextjs.md](../architecture/integrations/nextjs.md) |
| Phase 1 | 로드 불필요. Phase 0의 migration-plan.md + mapping.tsv를 따른다. |
| Phase 2 | [eslint-config.md](../architecture/rules/eslint-config.md)만 |
| Phase 3 | [shared-api.md](../architecture/layers/shared-api.md)만 |
| Phase 4 | [shared-query-factory.md](../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../architecture/layers/shared-mutation-factory.md) |
| Phase 5 | `/frontend:architecture` SKILL.md 전체 (Phase 0과 동일) |

---

각 단계는 완료 후 빌드 가능한 상태를 유지한다.

## 실행 전 상태 확인

커맨드 실행 시 프로젝트의 현재 상태를 먼저 분석한다:

### 1. 비정상 종료 감지

`git status`로 커밋되지 않은 변경사항을 확인한다.

변경사항이 있으면:
1. 사용자에게 보고: "이전 세션에서 Phase 진행 중 종료된 것으로 보입니다."
2. 변경사항을 버리고 해당 Phase를 재시작할지 확인
3. 동의하면 `git checkout . && git clean -fd`로 정리
4. 이전 Phase 커밋은 보존

### 2. 완료된 Phase 판별

**기준 A — 커밋 메시지** (`git log --oneline`):
- `refactor: 레이어드 아키텍처 폴더 구조 전환` → Phase 1 완료
- `refactor: ESLint 규칙 및 Named Export 적용` → Phase 2 완료
- `refactor: shared/api 3계층 구조 적용` → Phase 3 완료
- `refactor: query/mutation 팩토리 패턴 적용` → Phase 4 완료
- `chore: 마이그레이션 완료 보고 및 정리` → Phase 5 완료

**기준 B — 프로젝트 구조** (수동 작업 감지용):
- `.architecture-migration/assessment.md` 존재 → Phase 0 완료
- `app/`, `pages/`, `shared/` 구조 존재 → Phase 1 완료 가능성
- ESLint 설정에 `no-restricted-imports` 규칙 존재 → Phase 2 완료 가능성
- `shared/api/base/` + 도메인별 3계층 구조 → Phase 3 완료 가능성
- `shared/query-factory/` 존재 → Phase 4 완료 가능성

**판별 로직:**
- 커밋 있음 → 해당 Phase 완료 확정
- 커밋 없음 + 구조 있음 → 사용자에게 확인
- 둘 다 없음 → 미완료

---

## Phase 목록

| Phase | 내용 | 상세 문서 |
|-------|------|-----------|
| Phase 0 | 분석 + 계획 — architecture 스킬 기반 프로젝트 분석, 전환 계획 수립 | [phase-0-plan.md](phases/phase-0-plan.md) |
| Phase 1 | 구조 전환 — 파일 이동, import 수정 | [phase-1-structure.md](phases/phase-1-structure.md) |
| Phase 2 | 코드 규칙 — ESLint 설정, Named Export, import type | [phase-2-rules.md](phases/phase-2-rules.md) |
| Phase 3 | API 3계층 — 기존 API 코드를 도메인별 3계층으로 전환 | [phase-3-api.md](phases/phase-3-api.md) |
| Phase 4 | Query/Mutation 팩토리 — TanStack Query 프로젝트만 | [phase-4-query.md](phases/phase-4-query.md) |
| Phase 5 | 검증 + 보고 — architecture 스킬 기반 준수 점검, 보고서 | [phase-5-verify.md](phases/phase-5-verify.md) |

---

## 브랜치 생성

Phase 0 완료 후, Phase 1 시작 전에 작업용 브랜치를 생성한다:

```bash
git checkout -b refactor/migrate
```

같은 이름의 브랜치가 이미 존재하면 날짜를 붙인다: `refactor/migrate-YYYYMMDD`

---

## 컨텍스트 관리 원칙

Phase 상세 문서는 **해당 Phase에 진입할 때만** 읽는다.

각 Phase 진행 흐름:
1. 사용자에게 다음 Phase 진행 여부를 확인
2. 해당 Phase의 상세 문서 + 사전 요구사항 문서를 읽는다
3. 작업 수행
4. 빌드 검증 및 중간 커밋
5. 다음 Phase로 진행

**Phase 스킵:** Phase 3, 4는 조건부(API 코드 유무, TanStack Query 사용 여부). 해당 조건이 없으면 사용자에게 안내하고 다음 Phase로 진행한다.

---

## 중간 커밋

| Phase | 커밋 메시지 |
|-------|-------------|
| Phase 1 | `refactor: 레이어드 아키텍처 폴더 구조 전환` |
| Phase 2 | `refactor: ESLint 규칙 및 Named Export 적용` |
| Phase 3 | `refactor: shared/api 3계층 구조 적용` |
| Phase 4 | `refactor: query/mutation 팩토리 패턴 적용` |
| Phase 5 | `chore: 마이그레이션 완료 보고 및 정리` |

---

## 주의사항

- 각 Phase 시작 전에 반드시 사용자 확인을 받는다.
- 파일 이동 시 `git mv`를 사용하여 히스토리를 보존한다.
- Next.js 프로젝트는 반드시 [nextjs.md](../architecture/integrations/nextjs.md)를 참조한다.
- 각 Phase 완료 후 빌드가 정상인지 반드시 확인한다.

---

## 작업 효율 측정

모든 Phase에서 `.architecture-migration/timing.log`에 아래 항목을 기록한다:

1. **단계 시작 타임스탬프**: 각 단계(N단계) 작업 시작 시
   ```bash
   echo "step_N: $(date +%s)" >> .architecture-migration/timing.log
   ```

2. **사전 점검 실패**: tsc 또는 eslint 실패 시
   ```bash
   echo "phase_N_tsc_fail" >> .architecture-migration/timing.log
   echo "phase_N_eslint_fail" >> .architecture-migration/timing.log
   ```

3. **빌드 시도**: 빌드 실행 시
   ```bash
   echo "phase_N_build" >> .architecture-migration/timing.log
   ```

---

## 토큰/속도 최적화 원칙

### 일괄 치환 기준
- **대량 import 치환**: 10개 이상 파일 × 5개 이상 패턴 → `sed -i ''` 사용
- **Bash는 git 명령, 디렉토리 생성, 대량 import 치환에만 사용**

### 파일 읽기 최소화
- 대용량 섹션은 필요한 부분만 읽는다 (offset/limit 활용)
- Write 도구 사용 전 반드시 Read를 먼저 실행

### 빌드 전 사전 점검 필수

**1단계: Phase별 Grep 점검** — tsc/eslint가 잡지 못하는 항목만. 각 Phase 문서의 "사전 점검" 섹션 참조.

**2단계: tsc 타입 검사:**
```bash
npx tsc --noEmit 2>&1 | head -50
```

**3단계: eslint 레이어 규칙 검증 (Phase 2 이후만):**
```bash
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

> Phase 1은 tsc만, Phase 2부터는 tsc + eslint. 목표: Phase당 빌드 최대 2회.

### 일괄 처리 전략
- **검색**: Grep 도구 (output_mode: files_with_matches)
- **소수 치환** (10파일 미만): Read → Edit (replace_all: true)
- **대량 치환** (10파일 이상): sed 일괄
- **검증**: Grep으로 잔여 패턴 확인
