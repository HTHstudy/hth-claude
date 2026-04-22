# Phase 5: 검증 + 보고

> Phase 1~4에서 구조 전환, 규칙 적용, 도메인 패턴이 완료된 상태이다. 이 Phase에서는 architecture 스킬을 다시 로드하여 전반적 준수 여부를 점검하고, 최종 보고서를 작성한다.

### 12단계: architecture 스킬 기반 준수 점검

`frontend:architecture` 스킬을 다시 로드한다. Phase 0과 동일한 범위:
- 레이어 역할
- 네이밍 및 폴더 규칙
- import 방향 규칙
- 추출 이동 기준
- 판단 순서

architecture 스킬의 **모든 규칙 섹션**을 기준으로 현재 코드를 점검한다. 구체적 점검 항목은 architecture 스킬에서 도출한다 — 이 문서에 하드코딩하지 않는다.

> **참고:** 12단계에서 `frontend:architecture` 스킬을 전체 로드하면, 스킬의 "경로 상수 파일 감지" 행동 규칙이 자동으로 실행된다. Phase 3이 스킵된 경우에도 `shared/routes/paths.ts`는 이 단계에서 검증된다.

**병렬화:** 레이어별로 병렬 Grep을 실행하여 점검한다:
- **app 레이어**: architecture 스킬의 app 역할 기준 점검
- **pages 레이어**: architecture 스킬의 pages 역할 기준 점검
- **shared 레이어**: 각 모듈별 import 사용처를 병렬 Grep으로 분석

위반 사항이 있으면 수정한다. 수정 계획을 사용자에게 제시하고 확인받은 후 진행한다.

### 13단계: 선택 레이어 도입 제안

architecture 스킬의 "추출 이동 기준" + "판단 순서"를 기준으로 분석한다.

코드 중복을 분석하여 선택 레이어(widgets/features/entities) 도입을 제안한다. 제안만 하고, 도입 여부는 사용자가 결정한다.

### 14단계: 최종 보고서

**작업 효율:**

`.architecture-migration/timing.log`를 분석하여 아래 표를 작성한다:

| Phase | 소요 시간 | 빌드 시도 | 사전 점검 실패 |
|-------|-----------|-----------|---------------|
| 0     | N분       | -         | -             |
| 1     | N분       | N회       | tsc N회       |
| 2     | N분       | N회       | tsc N회, eslint N회 |
| 3     | N분       | N회       | tsc N회, eslint N회 |
| 4     | N분       | N회       | tsc N회, eslint N회 |
| 합계  | N분       | N회       | N회           |

> 사용자 대기 시간(Phase 전환 확인)은 제외.
> 스킵한 Phase는 표에서 제외.

**적용 완료 항목:**
- 변경된 폴더 구조 (before → after 트리)
- 이동된 파일 수와 주요 변경 사항
- 적용된 설정 (path alias, ESLint 규칙, 빌드 도구 등)
- 적용된 패턴 (API 3계층, query/mutation 팩토리 등)

**미적용 또는 수동 확인 필요 항목:**
- 자동 분류가 애매해서 현재 위치에 남긴 파일과 이유
- 추후 코드가 늘어나면 추출을 검토할 후보
- 기타 수동 확인이 필요한 사항

**다음 작업 제안:**

- 코드 리뷰 후 머지 대상 브랜치
- 스킵한 Phase가 있으면 실행 시점 제안
- 12단계(architecture 준수 점검)와 13단계(선택 레이어 분석)에서 발견된 후속 작업

### 정리

- `.architecture-migration/` 디렉토리를 삭제한다
- `.gitignore`에 추가했던 `.architecture-migration/` 항목을 제거한다
- 정리 후 커밋:

```bash
git add -A
git commit -m "chore: 마이그레이션 완료 보고 및 정리"
```
