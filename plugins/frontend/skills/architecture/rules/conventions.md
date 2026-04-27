# Conventions

> 이 아키텍처와 별개로 적용되는 일반 TS/JS 코드 컨벤션. 대부분 ESLint로 자동 검증 가능하다. 아키텍처 고유 규약은 [SKILL.md](../SKILL.md)와 layer/rules 문서를 참조.

---

## 1. 파일명

- kebab-case 사용
- 예: `page-header.tsx`, `use-page-filters.ts`, `get-product-list.ts`

**이유:** macOS 기본 파일시스템(대소문자 무시) ↔ Linux(대소문자 구분) 차이로 인한 `import` 실패를 원천 차단. 개발 환경에서는 동작하다가 CI/프로덕션에서 깨지는 패턴 방지.

**ESLint:** `check-file/filename-naming-convention`

---

## 2. 파일 vs 폴더 승격

한 파일에 하위 종속(컴포넌트·함수·훅 등)이 생기면 폴더로 승격하고 entrypoint(`index.*`)를 둔다.

- 하위 종속 없음 → 단일 파일 (`button.tsx`)
- 하위 종속 있음 → 폴더 + `index.tsx` 또는 `index.ts` (`modal/index.tsx`)

기준은 **하위 종속 유무**다. 파일 길이는 기준이 아니다. Slice 여부와도 무관하게 적용되는 일반 분해 규약.

---

## 3. Export

- **Named Export를 기본**으로 사용한다
- Default Export는 프레임워크가 요구하는 경우에만 허용 (Next.js의 `page.tsx`, `_app.tsx`, `route.ts` 등)

**이유:** IDE rename·find-references가 안정적으로 동작. Default Export는 호출부마다 임의 이름을 부여할 수 있어 같은 함수가 프로젝트 곳곳에서 다른 이름으로 import되어 rename 리팩토링이 새는 문제가 생긴다. import 라인에서 어떤 심볼을 가져오는지가 명시된다는 가독성 이점도 있다.

**ESLint:** `import/no-default-export` (프레임워크 요구 파일은 override)

---

## 4. Type Import

타입은 반드시 `type` 키워드로 import한다.

```ts
import type { Foo } from './foo';
import { type Bar, baz } from './baz';
```

**이유:** 런타임 번들에서 타입 참조를 완전히 제거. 빌드 도구가 값/타입 구분 없이 결정적으로 drop 가능 → 번들 사이즈 감소. 타입만 참조하는 경로가 런타임 의존처럼 취급되어 순환 의존이 만들어지는 현상도 줄어든다.

**ESLint:** `@typescript-eslint/consistent-type-imports`

---

## 5. `index.tsx` vs `index.ts`

확장자는 **JSX 포함 여부**로 결정한다.

- JSX가 포함되면(직접 작성하든 re-export 대상에 포함되든) → `.tsx`
- JSX가 전혀 없으면 → `.ts`

폴더 entrypoint뿐 아니라 모든 파일에 적용되는 언어 컨벤션. 파일이 어떤 단위(컴포넌트, 라이브러리, API 도메인)냐와는 무관하다.

대표 예:
- `product-detail/index.tsx` — JSX 조합 구현 → `.tsx`
- `shared/api/product/index.ts` — barrel(API 객체·타입 re-export, JSX 없음) → `.ts`

---

## 6. 순환 의존 금지

레이어·Slice·Segment·모듈 어느 단위에서도 순환 import를 만들지 않는다.

**이유:** 모듈 초기화 순서가 결정되지 않는다. 한쪽이 아직 평가되지 않은 상태에서 참조되면 `undefined` export가 발생하고, 이런 버그는 빌드 환경·import 순서·지연 평가 여부에 따라 재현이 들쭉날쭉하다. 의존 그래프 추적도 어려워진다.

**ESLint:** `import/no-cycle`
