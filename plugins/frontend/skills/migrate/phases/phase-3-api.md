# Phase 3: shared/api 3계층 구조 적용

> 기존 API 호출 코드가 있는 경우에만 진행한다. 없으면 건너뛴다.

상세 규칙: [shared-api.md](../../architecture/layers/shared-api.md) — 이 문서를 읽고 3계층 구조를 적용한다.

> **timing.log 기록:** 각 단계(6~8) 시작 시 `echo "step_N: $(date +%s)" >> .architecture-migration/timing.log` 실행. tsc/eslint 실패 시 `echo "phase_3_[tsc|eslint]_fail" >>`, 빌드 시 `echo "phase_3_build" >>`.

### 6단계: 기존 API 코드 분석

**migration-plan.md와 [shared-api.md](../../architecture/layers/shared-api.md)를 병렬로 동시에 읽는다.**

현재 API 관련 코드를 파악한다:
- API 호출 함수 위치와 패턴
- HTTP 클라이언트 설정 (Axios, fetch 등)
- 요청/응답 타입 정의 위치
- 도메인별 분류 가능 여부

분석 결과를 사용자에게 보고하고, 도메인 분류 계획을 **확인받은 후** 진행한다.

### 7단계: base 인프라 + 도메인 구조 생성

[shared-api.md](../../architecture/layers/shared-api.md)의 구조와 [http-client.md](../../architecture/rules/http-client.md)의 BaseHttpClient 템플릿을 따라 생성한다.

**병렬화:** base/ 생성과 각 도메인 구조 생성은 독립적이므로 **도메인별 Agent + base Agent를 동시에** 생성할 수 있다:

- **Agent 1 (base):** `shared/api/base/` 생성 — http-client.md의 BaseHttpClient 템플릿 + errors.ts + types.ts. 기존 HTTP 클라이언트 설정(인터셉터, 인증 등)이 있으면 중간 클래스로 분리
- **Agent 2+ (도메인):** 각 도메인의 3계층 구조 생성 — shared-api.md 규칙에 따라 index.ts, http-client.ts, endpoints/ 구성

각 Agent에게 shared-api.md + http-client.md의 구조 규칙과 해당 도메인의 기존 API 코드 위치를 전달한다.

### 8단계: 기존 API 호출부 수정

기존 코드에서 API를 직접 호출하던 부분을 `[DOMAIN]_API` 사용으로 변경한다.

#### 일괄 치환 전략

1. **매핑 테이블 작성**: 모든 기존 API 호출의 `기존 함수/경로 → DOMAIN_API.method` 매핑을 먼저 정리
2. **프로젝트 전체 대상 일괄 수정**: 전체 매핑을 한 번에 전달하여 누락 방지
3. **누락 검증**: 치환 후 기존 API 함수명이나 import 경로가 남아있지 않은지 grep으로 확인

### 사전 점검 (빌드 전)

마이그레이션 완료 여부만 점검한다 (import/export 오류는 eslint가 잡음):

- **기존 API 패턴 잔여**: 매핑 테이블의 각 기존 경로/함수명에 대해 Grep
  - 기존 import 경로 잔여: pattern `from ['\"].*[기존경로]`, glob `*.{ts,tsx}`, head_limit 20
  - 기존 함수 직접 호출 잔여: pattern `[기존함수명]\(`, glob `*.{ts,tsx}`, head_limit 20

#### 공통 점검 (tsc → eslint → 빌드)

```bash
npx tsc --noEmit 2>&1 | head -50
```

```bash
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

**두 검사를 모두 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

```bash
git add -A
git commit -m "refactor: shared/api 3계층 구조 적용"
```

**사용자에게 Phase 3 완료를 알리고, Phase 4 진행 여부를 확인한다.**
