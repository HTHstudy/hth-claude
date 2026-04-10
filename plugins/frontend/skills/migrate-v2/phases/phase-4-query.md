# Phase 4: query/mutation 팩토리 적용

> TanStack Query를 사용하는 프로젝트에서만 진행한다. 사용하지 않으면 건너뛴다.

상세 규칙: [shared-query-factory.md](../../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../../architecture/layers/shared-mutation-factory.md) — 이 문서들을 읽고 팩토리 패턴을 적용한다.

### 9단계: 기존 쿼리/뮤테이션 분석

Phase 3에서 생성한 `shared/api/` 구조를 먼저 확인한다. 각 도메인의 `DOMAIN_API` 객체 목록을 파악한다.

현재 TanStack Query 사용 패턴을 파악한다:
- `useQuery`, `useMutation` 호출 위치
- queryKey 관리 방식
- 기존 커스텀 훅 구조
- 각 쿼리/뮤테이션이 호출하는 `DOMAIN_API` 메서드 매핑

분석 결과를 사용자에게 보고하고 **확인받은 후** 진행한다.

### 10단계: factory 생성

query-factory와 mutation-factory는 독립적이므로 **Agent 2개를 동시에** 생성하여 병렬 처리한다:

- **Agent 1 (query):** shared-query-factory.md를 따라 `shared/query-factory/` 생성
- **Agent 2 (mutation):** shared-mutation-factory.md를 따라 `shared/mutation-factory/` 생성

각 Agent에게 해당 참조 문서와 도메인 목록 + `DOMAIN_API` 매핑을 전달한다.

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
