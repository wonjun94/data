# 떠날지도 (MVP)

AI(Gemini)가 추린 여행 후보를 동행 2~6명이 함께 고르고, 확정한 장소를 구글 ‘내 지도’용 KML로 내보내는 웹 앱입니다.
Next.js(App Router) + Supabase(계정·DB·실시간) + Vercel 배포, 모두 무료 플랜으로 돌아갑니다.

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 지구본 시작 화면: 도시 검색, 추천 42곳 핀, 테마 칩, 일수·예산·태그 고르고 방 만들기, 내 방 목록 |
| `/trip/[id]` | 후보 보드: 분류 필터, 좋아요 순 정렬, 좋아요·별로·코멘트, 직접 추가, 더 추천받기, 초대 링크·참여 승인(방장) |
| `/trip/[id]/export` | 확정 장소 지도 미리보기, KML·CSV 내려받기, ‘내 지도’ 가져오기 3단계 안내 |
| `/login` | 닉네임 + 비밀번호 로그인·회원가입 |
| `/join/[code]` | 초대 링크: 로그인(또는 가입) → 참여 신청 → 승인 대기 (승인되면 자동 이동) |
| `/admin` | 관리자 전용: 계정 목록·삭제·비밀번호 초기화, 좋아요·댓글 검색·삭제 |

## 계정과 관리자

- 이메일 없이 **닉네임 + 비밀번호(6자 이상)**로 가입합니다. 닉네임은 겹칠 수 없고, 방에서도 이 닉네임으로 보입니다.
- **관리자 계정**은 환경 변수 `ADMIN_NICKNAME`(기본 `root`)과 `ADMIN_PASSWORD`로 정합니다. 그 값으로 **처음 로그인할 때 자동으로 만들어집니다.**
  관리자 비밀번호는 코드나 공개 저장소에 넣지 말고 `.env.local`과 Vercel 환경 변수에만 넣으세요.
- 관리자는 상단의 **관리** 버튼으로 `/admin`에 들어가 계정 삭제(그 사람이 만든 방과 좋아요·댓글도 함께 삭제), 비밀번호 초기화, 좋아요·댓글 골라 지우기를 할 수 있습니다.
- 내부적으로는 Supabase Auth를 쓰며, 사용자에게 보이지 않는 내부용 주소(`u-…@trip-together.local`)로 계정을 만듭니다. 메일은 보내지 않습니다.

## 처음 한 번 설정하기 (약 15분)

### 1. Supabase
1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 내용을 통째로 붙여 넣고 **Run**.
   (예전 이메일 로그인 버전을 이미 실행했다면 파일 맨 위의 초기화 줄 주석을 풀고 실행하세요.)
3. **(권장) Authentication → Sign In / Providers**에서 **Allow new users to sign up**을 끕니다.
   가입은 이 앱의 서버(service_role)로만 하므로, 꺼 두면 앱을 거치지 않은 가입을 막을 수 있습니다.
4. **Project Settings → API**에서 `Project URL`, `anon`(또는 publishable) 키, `service_role`(또는 secret) 키를 복사해 둡니다.
   `service_role` 키는 서버 환경 변수에만 넣고 절대 공개하지 마세요.

### 2. Gemini API 키
[Google AI Studio](https://aistudio.google.com/apikey)에서 키를 만듭니다. 무료 등급은 보낸 내용이 서비스 개선에 쓰일 수 있어서, 이 앱은 여행 조건(목적지·일수·예산·태그)만 보내고 닉네임 같은 개인정보는 보내지 않습니다.

### 3. Vercel 배포
1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub 저장소 `wonjun94/data` **Import**.
2. **Environment Variables**에 다음을 넣습니다.

   | 이름 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(또는 publishable) 키 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role(또는 secret) 키 (서버 전용) |
   | `ADMIN_NICKNAME` | 관리자 닉네임 (`root`) |
   | `ADMIN_PASSWORD` | 관리자 비밀번호 |
   | `GEMINI_API_KEY` | Gemini 키 (서버 전용) |
   | `GEMINI_MODEL` | 선택. 기본 `gemini-3.8-flash` |
   | `NOMINATIM_EMAIL` | 선택. OpenStreetMap 검색 정책용 연락처 |
3. **Deploy**.

### 로컬에서 돌려 보기 (Node.js 20 이상)
```bash
npm install
```
```bash
npm run dev
```
`.env.example`을 `.env.local`로 복사하고 값을 채운 뒤 http://localhost:3000 을 엽니다.

## 완료 기준 확인 순서

1. `/login`에서 회원가입 → `/`에서 ‘오키나와’ 검색 → 4일, 중간 예산, ‘로컬 맛집’·‘바다’ → 여행 방 만들기.
2. 보드에서 마스코트가 “후보를 찾고 있어요”라고 한 뒤 후보 15개 이상이 분류·추천 이유와 함께 뜨는지 확인.
3. **초대 링크 복사** → 다른 브라우저(또는 휴대폰)에서 열고 회원가입 → 참여 신청 → 승인 대기 화면.
   이때 그 사람은 후보를 볼 수 없어야 합니다.
4. 방장 화면의 참여자 패널에서 **승인** → 동행 화면이 자동으로 보드로 바뀜.
5. 두 사람이 좋아요와 코멘트를 남기면 새로고침 없이 서로의 화면에 반영.
6. **장소 직접 추가**로 1곳 추가.
7. 방장이 몇 곳을 **확정** → **확정 목록·내보내기** → KML 내려받기 → [구글 내 지도](https://www.google.com/maps/d/)에서 새 지도 → 가져오기.
8. `root`로 로그인 → **관리** → 계정 목록과 좋아요·댓글이 보이고 지울 수 있는지 확인.
9. 브라우저 개발자 도구(Network·Sources)에서 `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 값이 보이지 않는지 확인.

## 구조

```
app/
  page.tsx                 지구본 시작 화면
  login/ join/[code]/      로그인·회원가입, 초대·승인 대기
  trip/[id]/               후보 보드
  trip/[id]/export/        확정 목록·내보내기
  admin/                   관리자 화면
  api/auth/login|signup    닉네임·비밀번호 로그인, 회원가입 (관리자 계정 자동 생성 포함)
  api/admin/users          계정 목록·삭제·비밀번호 초기화 (관리자만)
  api/admin/opinions       좋아요·댓글 목록·삭제 (관리자만)
  api/recommend/route.ts   Gemini 추천 → places 저장 (방장만)
  api/geocode/route.ts     Nominatim 검색(GET), AI 후보 좌표 재확인(POST, 방장만)
  api/export/route.ts      KML·CSV 생성 (요청할 때마다 생성, 저장 안 함)
components/                Globe(기존 지구본 이식), Mascot(포트), PlaceCard, MembersPanel, AddPlaceForm, LeafletMap, LoginForm
lib/                       Supabase 클라이언트(브라우저·서버·관리자), 계정 도우미, 타입, 상수, useTrip(실시간 갱신), destinations.json
supabase/schema.sql        테이블 5개 + RLS + 방 만들기·참여 함수 + Realtime
```

## 알아 둘 점

- **좌표 확인**: AI가 준 후보는 OpenStreetMap(Nominatim)에서 이름으로 다시 찾습니다. 초당 1회 제한 때문에 방장 화면에서 몇 곳씩 순서대로 확인하며, 못 찾은 곳은 “위치 확인 필요” 배지와 AI 추정 좌표(지도에서 점선 핀)로 남습니다.
- **DB에 추가한 것**: PRD의 4개 테이블에 `profiles`(닉네임·관리자 여부)와 `places.name_local`(현지어·영문 이름)을 더했습니다.
- **비밀번호 분실**: 이메일이 없으므로 관리자가 `/admin`에서 비밀번호를 초기화해 줍니다.
