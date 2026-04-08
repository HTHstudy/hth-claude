# Phase 3: query/mutation 팩토리 적용

> TanStack Query를 사용하는 프로젝트에서만 진행한다. 사용하지 않으면 건너뛴다.

상세 규칙: [shared-query-factory.md](../../architecture/layers/shared-query-factory.md), [shared-mutation-factory.md](../../architecture/layers/shared-mutation-factory.md)

### 10단계: 기존 쿼리/뮤테이션 분석

현재 TanStack Query 사용 패턴을 파악한다:
- `useQuery`, `useMutation` 호출 위치
- queryKey 관리 방식
- 기존 커스텀 훅 구조

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

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: query/mutation 팩토리 패턴 적용"
```

사용자에게 Phase 3 완료를 알리고, Phase 4 진행 여부를 확인한다.
