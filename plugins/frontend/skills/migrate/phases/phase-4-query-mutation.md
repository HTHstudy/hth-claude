# Phase 4: query/mutation 팩토리 적용

> TanStack Query를 사용하는 프로젝트에서만 진행한다. 사용하지 않으면 건너뛴다.

상세 규칙: [shared-query-factory.md](../../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../../architecture/layers/shared-mutation-factory.md)

### 10단계: 기존 쿼리/뮤테이션 분석

**Phase 3에서 생성한 `shared/api/` 구조를 먼저 확인한다.** 각 도메인의 `index.ts`에서 export하는 `DOMAIN_API` 객체 목록을 파악한다. 이 목록이 팩토리의 `queryFn`/`mutationFn`에 사용된다.

현재 TanStack Query 사용 패턴을 파악한다:
- `useQuery`, `useMutation` 호출 위치
- queryKey 관리 방식
- 기존 커스텀 훅 구조
- 각 쿼리/뮤테이션이 호출하는 `DOMAIN_API` 메서드 매핑

분석 결과를 사용자에게 보고하고 **확인받은 후** 진행한다.

### 11단계: query-factory 구성

`shared/query-factory/`를 생성한다:
- `default-query-keys.ts` — 도메인별 기본 쿼리 키 정의
- `[domain]-queries.ts` — 도메인별 쿼리 팩토리 (`queryOptions()` 반환)

키 계층: `allKeys()` → `listKeys()` / `detailKeys()` → 개별 쿼리

barrel(`index.ts`)은 사용하지 않는다.

### 12단계: mutation-factory 구성

`shared/mutation-factory/`를 생성한다:
- `default-mutation-keys.ts` — 도메인별 기본 mutation 키 정의
- `[domain]-mutations.ts` — 도메인별 mutation 팩토리 (`mutationOptions()` 반환)

복합 트랜잭션은 팩토리에 넣지 않는다. 커스텀 훅에서 조합한다.

### 13단계: 기존 호출부 전환

기존 `useQuery`, `useMutation` 호출을 팩토리 사용으로 변경한다:

```ts
// 변경 전
useQuery({ queryKey: ['product', 'list', params], queryFn: () => fetchProducts(params) })

// 변경 후
useQuery(productQueries.list(params))
```

#### 일괄 치환 전략

개별 파일을 하나씩 수정하지 않고, 매핑 테이블 기반으로 일괄 치환한다:

1. **매핑 테이블 작성**: 모든 기존 `useQuery`/`useMutation` 호출의 `기존 패턴 → 팩토리 호출` 매핑을 먼저 정리한다
2. **프로젝트 전체 대상 일괄 수정**: Agent에 위임할 경우, 전체 매핑을 한 번에 전달하여 누락을 방지한다
3. **누락 검증**: 치환 후 팩토리를 거치지 않는 직접 `useQuery`/`useMutation` 호출이 남아있지 않은지 grep으로 확인한다

### 사전 점검 (빌드 전) — eslint가 잡지 못하는 항목만

import 경로 오류는 eslint가 잡는다. 여기서는 **팩토리 패턴 마이그레이션 완료 여부**만 점검한다 (직접 호출은 문법적으로 유효하므로 eslint가 잡지 못함):

- **직접 useQuery/useMutation 잔여**: 팩토리를 거치지 않는 직접 호출
- **queryKey 하드코딩 잔여**: 팩토리 키를 사용하지 않는 하드코딩 queryKey

Grep 도구로 점검한다:
- 직접 useQuery 호출 잔여: pattern `useQuery\(\{`, glob `*.{ts,tsx}`, head_limit 20
- 직접 useMutation 호출 잔여: pattern `useMutation\(\{`, glob `*.{ts,tsx}`, head_limit 20
- queryKey 하드코딩 잔여: pattern `queryKey:`, glob `*.{ts,tsx}`, head_limit 20

#### 공통 점검 (tsc → eslint → 빌드)

Phase별 Grep 점검을 통과한 후 아래를 **순서대로** 실행한다. 빌드는 두 검사를 모두 통과한 후에만 수행한다.

```bash
# tsc 타입 검사
npx tsc --noEmit 2>&1 | head -50
```

tsc 에러가 있으면 수정한다.

```bash
# eslint 레이어 규칙 검증
npx eslint --no-warn-ignored --quiet --rule '{"no-restricted-imports": "error"}' 'src/**/*.{ts,tsx}' 2>&1 | head -30
```

eslint 에러가 있으면 수정한다. **두 검사를 모두 통과한 후** 빌드를 실행한다.

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: query/mutation 팩토리 패턴 적용"
```

사용자에게 Phase 4 완료를 알리고, Phase 5 진행 여부를 확인한다.
