# Framie Client

Framie 프론트엔드. React 19 + Vite + TypeScript로 만든 인생네컷 스타일 촬영·공유 웹 앱.

---

## 주요 기능

- **스플래시 / 로그인 / 회원가입** — Supabase 기반 인증 연동
- **프레임 선택** — 2컷 · 3컷 · 4컷 템플릿
- **촬영(`/takephoto`)** — 카운트다운, 재촬영, 실시간 프레임 미리보기
- **프레임 커스텀(`/custom1`, `/custom2`)** — 공유 코드 입력 후 다른 사람 프레임 위에 합성 촬영
- **결과(`/photo/result`, `/custom/result`)** — 색상 선택, 컷별 수정(재촬영 / 직접 편집), 저장, 다운로드, 공유 코드 발급
- **마이페이지(`/mypage`)** — "내 프레임" / "사진" 탭 분리, 개별 컷 다운로드
- **401 자동 리다이렉트** — 토큰 만료 시 로그인 화면으로 이동
- **Paperlogy 웹 폰트 전역 적용** (Mac / Windows 공통)

---

## 기술 스택

| 분류 | 사용 기술 |
|------|----------|
| Framework | React 19, React Router v7 |
| Build | Vite 7, TypeScript 5.9 |
| 백엔드 연동 | `@supabase/supabase-js`, Fetch API (`src/lib/api.ts`) |
| 이미지 처리 | Canvas API (합성 · 누끼 오버레이) |
| 폰트 | Paperlogy (CDN 웹 폰트, `src/styles/fonts.css`) |

---

## 시작하기

### 사전 요구사항
- Node.js 20+
- API 서버(`framie_server`)와 이미지 서버(`framie_image_server`)가 실행 중이거나, 원격 API 주소

### 설치 & 실행

```bash
npm install
cp .env.example .env     # 실제 값으로 채워주세요
npm run dev              # http://localhost:5173
```

### 빌드

```bash
npm run build            # tsc -b && vite build
npm run preview          # 빌드 결과 로컬 미리보기
```

### 린트

```bash
npm run lint
```

---

## 환경 변수

`.env` 파일을 생성하고 아래 값을 채워주세요.

| 키 | 설명 | 예시 |
|----|------|------|
| `VITE_API_BASE_URL` | Framie API 서버 베이스 URL | `http://localhost:3000/api/v1` |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL (스토리지 직접 조회용) | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 | `eyJhbGci...` |

`VITE_API_BASE_URL`이 없으면 기본값 `http://localhost:3000/api/v1`을 사용합니다.

---

## 라우트

| 경로 | 화면 | 비고 |
|------|------|------|
| `/` | Splash | 로그인 상태 확인 후 `/index` 또는 `/login`으로 이동 |
| `/index` | 홈 | 프레임 선택, 커스텀 메뉴 진입 |
| `/login` · `/join` | 로그인 · 회원가입 | Supabase Auth |
| `/photo1` | 프레임 선택 (2/3/4컷) | |
| `/takephoto` | 촬영 | `state`로 `frameId`, `shotCount`, `overlayPhotos` 등 수신 |
| `/photo/result` | 결과 화면 | 색상 선택, 컷 수정, 저장, 다운로드 |
| `/custom1` · `/custom2` | 프레임 커스텀 / 공유 코드 입력 | |
| `/mypage` | 마이페이지 | 내 프레임 · 사진 탭 |

---

## 폴더 구조

```
framie/
├── public/
├── src/
│   ├── assets/              # 이미지 · 로고 · SVG
│   ├── lib/
│   │   ├── api.ts           # API 클라이언트, 401 자동 리다이렉트
│   │   └── supabase.ts      # Supabase 클라이언트
│   ├── pages/
│   │   ├── Splash.tsx       # 진입 분기
│   │   ├── Index.tsx        # 홈
│   │   ├── Login/, Join/    # 인증
│   │   ├── custom/          # 프레임 커스텀 플로우
│   │   ├── photo/           # 촬영 · 결과 · 에디터
│   │   └── mypage/          # 마이페이지
│   ├── styles/
│   │   └── fonts.css        # Paperlogy 전역 폰트
│   ├── App.tsx              # 라우팅
│   └── main.tsx             # 엔트리
└── vite.config.ts
```

---

## 주요 구현 노트

- **촬영 합성** — 카메라 프리뷰를 캔버스로 캡처 → 이미지 서버에 POST해 배경 제거 → 공유 코드로 들어온 경우 이전 사용자 사진을 좌/우 끝에 오버레이로 합성.
- **결과 이미지 합성** — `Result.tsx`의 `buildTransparentResultImage`가 투명 PNG 컷들을 프레임 색·흰 바탕 위에 클리핑해 최종 이미지 생성.
- **저장 경로** — Supabase Storage `photo-results/sessions/{sessionId}/shots/*.png` (개별 컷), `.../preview/*.png` (최종).
- **공유 코드** — 저장 시 백엔드가 발급한 코드를 결과 화면에 노출. 다른 사용자가 `/custom1`에서 코드 입력 시 해당 세션의 사진을 오버레이로 사용.
