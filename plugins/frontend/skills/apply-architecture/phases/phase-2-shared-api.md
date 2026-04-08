# Phase 2: shared/api 3계층 구조 적용

> 기존 API 호출 코드가 있는 경우에만 진행한다. 없으면 건너뛴다.

상세 규칙: [shared-api.md](../../architecture/layers/shared-api.md)

### 6단계: 기존 API 코드 분석

현재 API 관련 코드를 파악한다:
- API 호출 함수 위치와 패턴
- HTTP 클라이언트 설정 (Axios, fetch 등)
- 요청/응답 타입 정의 위치
- 도메인별 분류 가능 여부

분석 결과를 사용자에게 보고하고, 도메인 분류 계획을 **확인받은 후** 진행한다.

### 7단계: base 인프라 생성

`shared/api/base/`에 공통 인프라를 구성한다:
- `base-http-client.ts` — Axios 래퍼, 인터셉터, 인증 토큰 주입
- `types.ts` — 공통 응답 타입 (예: `DefaultResponse<T>`)
- `errors.ts` — 공통 에러 클래스 (필요 시)

기존 HTTP 클라이언트 설정이 있으면 이를 base로 통합한다.

### 8단계: 도메인별 API 구조 전환

각 도메인에 대해 3계층 구조를 적용한다:

```
shared/api/[domain]/
├─ index.ts                    # [DOMAIN]_API 객체 export
├─ model.ts                    # 공유 도메인 타입 (필요 시만)
├─ [domain]-http-client.ts     # 도메인 HTTP 클라이언트
└─ endpoints/
   └─ [action]-[resource].ts   # 엔드포인트별 파일 (함수 + req/res 타입)
```

전환 규칙:
- 엔드포인트별로 API 함수와 요청/응답 타입을 한 파일에 둔다
- `index.ts`에서 `[DOMAIN]_API` 객체로 묶어 export
- 도메인 내부는 상대경로, 외부는 `@shared/api/[domain]` entrypoint로 import
- endpoint에서는 `response.data`만 꺼내 반환. 그 외 데이터 변환 금지
- 2개 이상의 endpoint가 공유하는 도메인 타입이 있을 때만 `model.ts` 생성

### 9단계: 기존 API 호출부 수정

기존 코드에서 API를 직접 호출하던 부분을 `[DOMAIN]_API` 사용으로 변경한다.

#### 일괄 치환 전략

개별 파일을 하나씩 수정하지 않고, 매핑 테이블 기반으로 일괄 치환한다:

1. **매핑 테이블 작성**: 모든 기존 API 호출의 `기존 함수/경로 → DOMAIN_API.method` 매핑을 먼저 정리한다
2. **프로젝트 전체 대상 일괄 수정**: Agent에 위임할 경우, 전체 매핑을 한 번에 전달하여 누락을 방지한다
3. **누락 검증**: 치환 후 기존 API 함수명이나 import 경로가 남아있지 않은지 grep으로 확인한다

### 사전 점검 (빌드 전)

빌드 실행 전에 아래 항목을 grep으로 점검하고 일괄 수정한다:

- **기존 API import 잔여**: Phase 2에서 제거/이동한 기존 API 함수명이나 import 경로가 남아있지 않은지
- **DOMAIN_API import 누락**: 새 API 객체를 사용하는 파일에 import 문이 정상인지
- **타입 import**: API 타입을 `import type`으로 가져오는지

```bash
# 기존 API 함수/경로 잔여 확인 (매핑 테이블의 기존 경로 기준)
grep -rn "from ['\"].*기존API경로" src/ --include="*.ts" --include="*.tsx" | head -20

# DOMAIN_API import 정합성
grep -rn "DOMAIN_API\." src/ --include="*.ts" --include="*.tsx" -l | while read f; do
  grep -L "import.*DOMAIN_API" "$f"
done
```

### 빌드 검증 후 커밋

빌드가 정상이면 중간 커밋을 생성한다:

```bash
git add -A
git commit -m "refactor: shared/api 3계층 구조 적용"
```

**사용자에게 Phase 2 완료를 알리고, Phase 3 진행 여부를 확인한다.**
