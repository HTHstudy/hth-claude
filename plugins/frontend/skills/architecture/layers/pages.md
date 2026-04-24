# Pages Layer

> `pages` 레이어의 상세 규칙이다. 기본 역할은 SKILL.md 참조.

---

## Slice 구조

- 하나의 Slice = 하나의 route 화면.
- Slice 이름은 route를 나타낸다: `home`, `product-detail`, `settings-profile`
- **nested route는 각각 독립된 Slice로 취급.** 부모-자식 관계라도 page 간 내부 모듈을 직접 공유하지 않는다. Slice 이름은 kebab-case로 평면화한다 (예: `/admin/users` → `admin-users`).
- 하위 종속이 없으면 단일 파일 Slice(`product-detail.tsx`) — 그 파일 자체가 entrypoint. 하위 종속이 생기면 폴더 Slice(`product-detail/index.tsx`)로 승격.
- 라우터는 page의 Named Export를 entrypoint 경로(`@pages/product-detail`)로 가져간다.
- Slice 공개 인터페이스·분해·추출 규칙 → [slice.md](../rules/slice.md)

```txt
# 단순한 경우                    # 복잡해지면 폴더로 승격
pages/                          pages/
├─ home.tsx                     ├─ home.tsx
├─ about.tsx                    ├─ about.tsx
└─ product-detail.tsx           └─ product-detail/
                                   ├─ product-info.tsx
                                   ├─ product-reviews.tsx
                                   ├─ use-product-detail.ts
                                   └─ index.tsx

# nested route — 각각 독립 Slice로 평면화
pages/
├─ admin.tsx              ← /admin
├─ admin-users.tsx        ← /admin/users
└─ admin-orders.tsx       ← /admin/orders
```

---

## cross-import가 필요할 때

page 간 코드 공유가 필요하면 상위 공통 범위로 이동한다. 이동 대상 분류와 조건 → [slice.md §3](../rules/slice.md#3-추출-규칙).

---

## Do / Don't

**Do:** 가장 단순한 형태로 시작. 전용 상태/훅/컴포넌트를 직접 소유.
**Don't:** "나중에 쓸 것 같아서" 미리 추출 금지. 추출 조건 → [slice.md §3](../rules/slice.md#3-추출-규칙).
