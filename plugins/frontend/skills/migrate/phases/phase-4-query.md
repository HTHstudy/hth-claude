# Phase 4: query/mutation 팩토리 적용

> TanStack Query를 사용하는 프로젝트에서만 진행한다. 사용하지 않으면 건너뛴다.

상세 규칙: [shared-query-factory.md](../../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../../architecture/layers/shared-mutation-factory.md) — 이 문서들을 읽고 팩토리 패턴을 적용한다.

> **timing.log 기록:** 각 단계(9~11) 시작 시 `echo "step_N: $(date +%s)" >> .architecture-migration/timing.log` 실행. tsc/eslint 실패 시 `echo "phase_4_[tsc|eslint]_fail" >>`, 빌드 시 `echo "phase_4_build" >>`.

### 9단계: 기존 쿼리/뮤테이션 분석

Phase 3에서 생성한 `shared/api/` 구조를 먼저 확인한다. 각 도메인의 `DOMAIN_API` 객체 목록을 파악한다.

현재 TanStack Query 사용 패턴을 파악한다:
- `useQuery`, `useMutation` 호출 위치
- queryKey 관리 방식
- 기존 커스텀 훅 구조
- 각 쿼리/뮤테이션이 호출하는 `DOMAIN_API` 메서드 매핑

분석 결과를 사용자에게 보고하고 **확인받은 후** 진행한다.

### 10단계: factory 생성

query-factory와 mutation-factory는 서로 import하지 않는 독립 segment이므로 **Agent 2개를 동시에** 생성하여 병렬 처리한다.

각 Agent prompt에 다음을 **명시 전달**한다:
- **반드시 Read tool로 해당 .md를 직접 읽고**, §3 `default-*-keys.ts` 형식과 §4 도메인 파일 구조·컨벤션(`as const`, `*Keys` 접미사, TanStack Query v5 `queryOptions`/`mutationOptions` API)을 따라 작성한다 (자체 추측 금지).
- 도메인 목록과 Phase 3에서 생성된 `[DOMAIN]_API` 매핑.
- 작성할 파일: `default-*-keys.ts`(공통) + `[domain]-queries.ts` 또는 `[domain]-mutations.ts`(도메인별).

| Agent | 참조 문서 | 생성 대상 |
|-------|----------|----------|
| Agent 1 (query) | [shared-query-factory.md](../../architecture/layers/shared-query-factory.md) | `shared/query-factory/` |
| Agent 2 (mutation) | [shared-mutation-factory.md](../../architecture/layers/shared-mutation-factory.md) | `shared/mutation-factory/` |

### 11단계: 기존 호출부 전환

기존 `useQuery`, `useMutation` 호출을 팩토리 사용으로 변경한다:

```ts
// 변경 전
useQuery({ queryKey: ['product', 'list', params], queryFn: () => fetchProducts(params) })

// 변경 후
useQuery(productQueries.list(params))
```

#### 일괄 치환 전략

1. **매핑 테이블 작성**: 모든 `useQuery`/`useMutation` 호출의 `기존 패턴 → 팩토리 호출` 매핑
2. **프로젝트 전체 대상 일괄 수정**: 전체 매핑을 한 번에 전달하여 누락 방지
3. **누락 검증**: 팩토리를 거치지 않는 직접 호출이 남아있지 않은지 확인

### 사전 점검 (빌드 전)

팩토리 패턴 마이그레이션 완료 여부만 점검 (직접 호출은 문법적으로 유효하므로 eslint가 잡지 못함):

- 직접 useQuery 호출 잔여: pattern `useQuery\(\{`, glob `*.{ts,tsx}`, head_limit 20
- 직접 useMutation 호출 잔여: pattern `useMutation\(\{`, glob `*.{ts,tsx}`, head_limit 20
- queryKey 하드코딩 잔여: pattern `queryKey:`, glob `*.{ts,tsx}`, head_limit 20

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
git commit -m "refactor: query/mutation 팩토리 패턴 적용"
```

**사용자에게 Phase 4 완료를 알리고, Phase 5 진행 여부를 확인한다.**
