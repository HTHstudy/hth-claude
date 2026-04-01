# Pages Layer

> `pages` 레이어의 상세 규칙이다. 기본 역할은 SKILL.md 참조.

---

## Slice 구조

- 하나의 Slice = 하나의 route 화면.
- Slice 이름은 route를 나타낸다: `home`, `product-detail`, `settings-profile`
- **nested route(`/settings`, `/settings/profile`)는 각각 독립된 Slice로 취급.** 부모-자식 관계라도 page 간 내부 모듈을 직접 공유하지 않는다.

```txt
# 단순한 경우               # 복잡해지면 분해
pages/                      pages/
├─ home.tsx                 └─ product-detail/
└─ about.tsx                   ├─ product-info.tsx
                               ├─ product-reviews.tsx
                               ├─ use-product-detail.ts
                               └─ index.tsx
```

---

## cross-import가 필요할 때

page 간 코드 공유가 필요하면, 공유할 코드를 더 넓은 범위로 이동:
- 복합 UI 블록 → `widgets`
- 인터랙션 단위 → `features`
- 도메인 UI / 표시 로직 → `entities`

---

## Do / Don't

**Do:** 가장 단순한 형태로 시작. 전용 상태/훅/컴포넌트를 직접 소유.
**Don't:** 한 번 쓴 컴포넌트를 바로 전역으로 이동하지 않는다. "나중에 쓸 것 같아서" 미리 추출 금지.
