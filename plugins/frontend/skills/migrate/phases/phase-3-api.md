# Phase 3: shared/api 3계층 구조 적용

> 기존 API 호출 코드가 있는 경우에만 진행한다. 없으면 건너뛴다.

상세 규칙: [shared-api.md](../../architecture/layers/shared-api.md) — 이 문서를 읽고 3계층 구조를 적용한다.

> **timing.log 기록:** 각 단계(6~8) 시작 시 `echo "step_N: $(date +%s)" >> .architecture-migration/timing.log` 실행. tsc/eslint 실패 시 `echo "phase_3_[tsc|eslint]_fail" >>`, 빌드 시 `echo "phase_3_build" >>`.

### 6단계: 기존 API 코드 분석

**migration-plan.md와 [shared-api.md](../../architecture/layers/shared-api.md), [http-client.md](../../architecture/rules/http-client.md)를 병렬로 동시에 읽는다.**

현재 API 관련 코드를 파악한다:
- API 호출 함수 위치와 패턴
- HTTP 클라이언트 설정 (Axios, fetch 등)
- 요청/응답 타입 정의 위치
- 도메인별 분류 가능 여부

분석 결과를 사용자에게 보고하고, 도메인 분류 계획을 **확인받은 후** 진행한다.

### 7단계: base 인프라 → 도메인 구조 생성

base는 모든 도메인이 import하므로 **base를 먼저 완성한 후 도메인 작업을 시작한다.** base 미완성 상태에서 도메인 sub-agent를 시작하면 sub-agent가 BaseHttpClient를 자체 생성하거나 시그니처를 추측해버릴 위험이 있다.

#### 7-1단계: base 인프라 (orchestrator가 직접 작업)

[http-client.md](../../architecture/rules/http-client.md)의 §2 BaseHttpClient, §3 errors.ts, §4 types.ts 템플릿을 출발점으로 `shared/api/base/`를 생성한다.

- **인터페이스는 유지한다** — 클래스명, `protected` 인터셉터 훅 4개(`onRequest`/`onRequestError`/`onResponse`/`onResponseError`), HTTP 래퍼 메서드 시그니처는 변경하지 않는다.
- **프로젝트에 맞게 조정 가능** — 기본값(timeout, headers), `HttpError` 필드, 공통 응답 타입은 기존 코드/요구사항에 맞게 확장·조정한다.
- 기존 axios 설정에 모든 도메인이 공유하는 인터셉터(인증, 모니터링, 세션 핸들링 등)가 있으면 [http-client.md §5.3](../../architecture/rules/http-client.md#53-중간-클래스--여러-도메인이-같은-인터셉터를-공유) 패턴으로 중간 클래스(`base/authenticated-http-client.ts` 등)로 분리한다.

#### 7-2단계: 도메인 구조 (도메인별 sub-agent 병렬)

7-1이 완성되어 base의 export 시그니처가 확정된 후, 도메인별로 Agent를 동시에 생성한다.

각 Agent prompt에 다음을 **명시 전달**한다:
1. **반드시 Read tool로 [shared-api.md](../../architecture/layers/shared-api.md)를 직접 읽고** §4 도메인별 구조와 §6 컨벤션을 따라 작성한다 (자체 추측 금지).
2. 7-1에서 완성한 base의 export 목록 — 상속 대상 클래스명(`BaseHttpClient` 또는 중간 클래스), `HttpError`, `DefaultResponse` 등과 import 경로(`../base/...`).
3. 해당 도메인이 담당하는 기존 API 코드 위치와 endpoints 매핑.
4. 작성할 파일: `[domain]-http-client.ts`, `endpoints/*.ts`, 필요 시 `model.ts`/`errors.ts`, `index.ts`.

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
