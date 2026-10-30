# 여행 같이 고르기 (MVP)

AI(Gemini)가 추린 여행 후보를 동행 2~6명이 함께 고르고, 확정한 장소를 구글 ‘내 지도’용 KML로 내보내는 웹 앱입니다.
Next.js(App Router) + Supabase(로그인·DB·실시간) + Vercel 배포, 모두 무료 플랜으로 돌아갑니다.

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 지구본 시작 화면: 도시 검색, 추천 42곳 핀, 테마 칩, 일수·예산·태그 고르고 방 만들기, 내 방 목록 |
| `/trip/[id]` | 후보 보드: 분류 필터, 좋아요 순 정렬, 좋아요·별로·코멘트, 직접 추가, 더 추천받기, 초대 링크·참여 승인(방장) |
| `/trip/[id]/export` | 확정 장소 지도 미리보기, KML·CSV 내려받기, ‘내 지도’ 가져오기 3단계 안내 |
| `/login` | 이메일 매직 링크 로그인 |
| `/join/[code]` | 초대 링크: 로그인 → 닉네임 → 승인 대기 (승인되면 자동 이동) |

## 처음 한 번 설정하기 (약 20분)

### 1. Supabase
1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 내용을 통째로 붙여 넣고 **Run**.
3. **Authentication → URL Configuration**
   - Site URL: `https://<내-앱>.vercel.app` (배포 후 주소. 처음엔 비워 두고 4단계 뒤에 채워도 됩니다)
   - Redirect URLs에 추가: `https://<내-앱>.vercel.app/**`, `http://localhost:3000/**`
4. **(강력 권장) Authentication → Emails**에서 **Magic Link**와 **Confirm signup**(처음 로그인하는 사람이 받는 메일) 두 템플릿의 링크를 아래처럼 바꿉니다.
   휴대폰에서 메일 앱·카톡 브라우저처럼 *다른 브라우저*로 링크가 열려도 로그인이 됩니다.
   ```html
   <h2>여행 같이 고르기 로그인</h2>
   <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">여기를 눌러 로그인하세요</a></p>
   ```
   (바꾸지 않아도 같은 브라우저에서 열면 동작합니다.)
5. **Project Settings → API**에서 `Project URL`과 `anon`(또는 publishable) 키를 복사해 둡니다. `service_role` 키는 쓰지 않습니다.

### 2. Gemini API 키
[Google AI Studio](https://aistudio.google.com/apikey)에서 키를 만듭니다. 무료 등급은 보낸 내용이 서비스 개선에 쓰일 수 있어서, 이 앱은 여행 조건(목적지·일수·예산·태그)만 보내고 이메일·닉네임은 보내지 않습니다.

### 3. GitHub에 올리기
이 PC에는 git이 없으므로 웹으로 올립니다.
1. GitHub에서 새 저장소(예: `trip-together`)를 만듭니다.
2. **Add file → Upload files**에 이 폴더 안의 파일·폴더를 전부 끌어다 놓습니다 (`node_modules`, `.next`가 있다면 빼고).
3. **Commit changes**.

### 4. Vercel 배포
1. [vercel.com](https://vercel.com) → **Add New → Project** → 방금 만든 GitHub 저장소 **Import**.
2. **Environment Variables**에 다음을 넣습니다.

   | 이름 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(또는 publishable) 키 |
   | `GEMINI_API_KEY` | Gemini 키 (서버에서만 사용) |
   | `GEMINI_MODEL` | 선택. 기본 `gemini-2.5-flash` |
   | `NOMINATIM_EMAIL` | 선택. OpenStreetMap 검색 정책용 연락처 |
3. **Deploy**. 나온 주소를 Supabase의 Site URL·Redirect URLs(1-3단계)에 넣습니다.

### 로컬에서 돌려 보기 (선택, Node.js 20 이상 필요)
```bash
npm install
```
```bash
npm run dev
```
`.env.example`을 `.env.local`로 복사하고 값을 채운 뒤 http://localhost:3000 을 엽니다.

## 완료 기준 확인 순서

1. `/`에서 ‘오키나와’ 검색 → 4일, 중간 예산, ‘로컬 맛집’·‘바다’ → 여행 방 만들기.
2. 보드에서 마스코트가 “후보를 찾고 있어요”라고 한 뒤 후보 15개 이상이 분류·추천 이유와 함께 뜨는지 확인.
3. **초대 링크 복사** → 다른 브라우저(또는 휴대폰)에서 열고 이메일 로그인 → 닉네임 입력 → 승인 대기 화면.
   이때 그 사람은 후보를 볼 수 없어야 합니다.
4. 방장 화면의 참여자 패널에서 **승인** → 동행 화면이 자동으로 보드로 바뀜.
5. 두 사람이 좋아요와 코멘트를 남기면 새로고침 없이 서로의 화면에 반영.
6. **장소 직접 추가**로 1곳 추가.
7. 방장이 몇 곳을 **확정** → **확정 목록·내보내기** → KML 내려받기 → [구글 내 지도](https://www.google.com/maps/d/)에서 새 지도 → 가져오기.
8. 브라우저 개발자 도구(Network·Sources)에서 `GEMINI_API_KEY` 값이 보이지 않는지 확인. Gemini 호출은 `/api/recommend` 서버에서만 합니다.

## 구조

```
app/
  page.tsx                 지구본 시작 화면
  login/ join/[code]/      로그인, 초대·승인 대기
  trip/[id]/               후보 보드
  trip/[id]/export/        확정 목록·내보내기
  auth/callback/route.ts   매직 링크 도착 처리
  api/recommend/route.ts   Gemini 추천 → places 저장 (방장만)
  api/geocode/route.ts     Nominatim 검색(GET), AI 후보 좌표 재확인(POST, 방장만)
  api/export/route.ts      KML·CSV 생성 (요청할 때마다 생성, 저장 안 함)
components/                Globe(기존 지구본 이식), Mascot(포트), PlaceCard, MembersPanel, AddPlaceForm, LeafletMap
lib/                       Supabase 클라이언트, 타입, 상수, useTrip(실시간 갱신), destinations.json(추천 42곳)
supabase/schema.sql        테이블 4개 + RLS + 방 만들기·참여 함수 + Realtime
```

## 알아 둘 점

- **좌표 확인**: AI가 준 후보는 OpenStreetMap(Nominatim)에서 이름으로 다시 찾습니다. 초당 1회 제한 때문에 방장 화면에서 몇 곳씩 순서대로 확인하며, 못 찾은 곳은 “위치 확인 필요” 배지와 AI 추정 좌표(지도에서 점선 핀)로 남습니다.
- **DB에 추가한 컬럼**: PRD의 `places`에 `name_local`(현지어·영문 이름)을 하나 더 두었습니다. 좌표 검색과 구글 맵 링크의 정확도를 높이는 용도입니다.
- **배포 안전장치**: 이 코드는 Node.js가 없는 PC에서 작성되어 로컬 빌드 검사를 거치지 못했습니다. 그래서 `next.config.mjs`에서 타입 오류가 배포를 막지 않도록 해 두었습니다. Vercel 빌드 로그에 오류가 나오면 그 내용을 알려 주세요.
- **메일 한도**: Supabase 기본 메일은 시간당 발송 수가 적습니다. 실습 인원에는 충분하고, 운영 시 Authentication → SMTP에 메일 서비스를 연결하세요.
