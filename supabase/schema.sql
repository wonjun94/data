-- 떠날지도: Supabase 대시보드 > SQL Editor에 통째로 붙여 넣고 Run.
-- 테이블 5개(profiles, trips, members, places, opinions) + 접근 규칙(RLS) + 방 만들기·참여 함수 + Realtime 설정.
--
-- 예전 버전(이메일 로그인)을 이미 실행했다면 아래 다섯 줄의 주석(--)을 지우고 먼저 실행해 초기화하세요. 데이터가 모두 지워집니다.
-- drop table if exists public.opinions, public.places, public.members, public.trips, public.profiles cascade;
-- drop function if exists public.is_member(uuid), public.is_owner(uuid), public.place_trip(uuid), public.trip_preview(text);
-- drop function if exists public.create_trip(text, text, double precision, double precision, int, text, text[], text);
-- drop function if exists public.create_trip(text, text, double precision, double precision, int, text, text[]);
-- drop function if exists public.join_trip(text, text), public.join_trip(text);

-- ───────────────────────── 테이블 ─────────────────────────

-- 계정: 닉네임 + 비밀번호로 가입. 비밀번호는 Supabase Auth가 보관하고, 여기에는 닉네임과 관리자 여부만 둔다.
-- 가입·관리자 지정은 서버(service_role)만 할 수 있다.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 2 and 20),
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_uniq on public.profiles (lower(nickname));

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  destination text not null check (char_length(destination) between 1 and 80),
  country     text,
  lat         double precision not null,
  lon         double precision not null,
  days        int  not null check (days between 1 and 14),
  budget      text not null check (budget in ('low','mid','high')),
  style_tags  text[] not null check (cardinality(style_tags) between 1 and 5),
  -- 추측하기 어려운 무작위 32자 (uuid 122비트)
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at  timestamptz not null default now()
);

create table public.members (
  trip_id   uuid not null references public.trips(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  nickname  text not null check (char_length(nickname) between 1 and 20),
  role      text not null default 'member' check (role in ('owner','member')),
  status    text not null default 'pending' check (status in ('pending','approved','rejected')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table public.places (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  name_local   text,            -- 현지어·영문 이름 (좌표 검색과 구글 맵 링크에 사용)
  category     text not null check (category in ('sight','food','cafe','activity')),
  area         text,
  reason       text,
  source       text not null check (source in ('ai','user')),
  added_by     uuid references auth.users(id) on delete set null,
  link         text,
  lat          double precision,
  lon          double precision,
  geo_verified boolean,         -- null: 확인 전, true: OpenStreetMap에서 확인, false: 위치 확인 필요
  status       text not null default 'candidate' check (status in ('candidate','confirmed','excluded')),
  created_at   timestamptz not null default now()
);
-- 같은 방에 같은 이름 중복 방지
create unique index places_trip_name_uniq on public.places (trip_id, lower(name));

create table public.opinions (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vote       text check (vote in ('up','down')),
  comment    text check (char_length(comment) between 1 and 300),
  created_at timestamptz not null default now(),
  -- 한 행은 표 하나 또는 코멘트 하나
  check ((vote is null) <> (comment is null))
);
-- 표는 (place_id, user_id)당 1개, 코멘트는 여러 개
create unique index opinions_one_vote on public.opinions (place_id, user_id) where vote is not null;
create index opinions_place_idx on public.opinions (place_id);

-- ───────────────────────── 권한 확인 함수 ─────────────────────────

create function public.is_member(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where trip_id = t and user_id = auth.uid() and status = 'approved')
$$;

create function public.is_owner(t uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from trips where id = t and owner_id = auth.uid())
$$;

create function public.place_trip(p uuid) returns uuid
language sql security definer stable set search_path = public as $$
  select trip_id from places where id = p
$$;

-- ───────────────────────── 접근 규칙(RLS) ─────────────────────────

-- 로그인한 사용자에게 테이블 권한을 주되, 실제로 무엇을 할 수 있는지는 아래 정책이 정한다
grant select, insert, delete on public.trips, public.members, public.places, public.opinions to authenticated;
grant update on public.trips to authenticated;
grant select on public.profiles to authenticated;

-- profiles: 자기 계정만 읽기. 쓰기는 서버(service_role)만.
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select
  using (id = auth.uid());

alter table public.trips    enable row level security;
alter table public.members  enable row level security;
alter table public.places   enable row level security;
alter table public.opinions enable row level security;

-- trips: 방장과 승인된 동행만 읽기. 만들기는 create_trip 함수로만.
create policy trips_select on public.trips for select
  using (owner_id = auth.uid() or public.is_member(id));
create policy trips_update on public.trips for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy trips_delete on public.trips for delete
  using (owner_id = auth.uid());

-- members: 승인된 멤버는 방 참여자 목록을, 대기자는 자기 행만 본다. 상태 변경은 방장만. 참여는 join_trip 함수로만.
create policy members_select on public.members for select
  using (user_id = auth.uid() or public.is_member(trip_id));
create policy members_update on public.members for update
  using (public.is_owner(trip_id) and user_id <> auth.uid())
  with check (public.is_owner(trip_id) and user_id <> auth.uid());
revoke update on public.members from authenticated, anon;
grant update (status) on public.members to authenticated;

-- places: 승인된 멤버만 읽고 추가. 확정·제외(status)와 좌표 갱신, 삭제는 방장만.
create policy places_select on public.places for select
  using (public.is_member(trip_id));
create policy places_insert on public.places for insert
  with check (
    public.is_member(trip_id)
    and added_by = auth.uid()
    and status = 'candidate'
    and (source = 'user' or public.is_owner(trip_id))
  );
create policy places_update on public.places for update
  using (public.is_owner(trip_id)) with check (public.is_owner(trip_id));
create policy places_delete on public.places for delete
  using (public.is_owner(trip_id));
revoke update on public.places from authenticated, anon;
grant update (status, lat, lon, geo_verified) on public.places to authenticated;

-- opinions: 승인된 멤버만 읽고 쓰기. 자기 의견만 바꾸거나 지울 수 있다.
create policy opinions_select on public.opinions for select
  using (public.is_member(public.place_trip(place_id)));
create policy opinions_insert on public.opinions for insert
  with check (user_id = auth.uid() and public.is_member(public.place_trip(place_id)));
create policy opinions_update on public.opinions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy opinions_delete on public.opinions for delete
  using (user_id = auth.uid());
revoke update on public.opinions from authenticated, anon;
grant update (vote) on public.opinions to authenticated;

-- ───────────────────────── 방 만들기·참여 함수 ─────────────────────────

create function public.create_trip(
  p_destination text, p_country text, p_lat double precision, p_lon double precision,
  p_days int, p_budget text, p_style_tags text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid; nick text;
begin
  select nickname into nick from profiles where id = auth.uid();
  if nick is null then raise exception 'login required'; end if;
  insert into trips (owner_id, destination, country, lat, lon, days, budget, style_tags)
  values (auth.uid(), p_destination, p_country, p_lat, p_lon, p_days, p_budget, p_style_tags)
  returning id into t;
  insert into members (trip_id, user_id, nickname, role, status)
  values (t, auth.uid(), nick, 'owner', 'approved');
  return t;
end $$;

-- 초대 링크 화면용: 목적지 이름과 내 참여 상태만 알려준다 (후보·의견은 노출하지 않음)
create function public.trip_preview(p_code text)
returns table (trip_id uuid, destination text, country text, days int, owner_nickname text, my_status text)
language sql security definer stable set search_path = public as $$
  select t.id, t.destination, t.country, t.days,
         (select m.nickname from members m where m.trip_id = t.id and m.role = 'owner' limit 1),
         (select m.status from members m where m.trip_id = t.id and m.user_id = auth.uid())
  from trips t
  where t.invite_code = p_code
$$;

create function public.join_trip(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid; n int; nick text;
begin
  select nickname into nick from profiles where id = auth.uid();
  if nick is null then raise exception 'login required'; end if;
  select id into t from trips where invite_code = p_code;
  if t is null then raise exception 'invalid invite'; end if;
  if exists (select 1 from members where trip_id = t and user_id = auth.uid()) then return t; end if;
  select count(*) into n from members where trip_id = t and status <> 'rejected';
  if n >= 6 then raise exception 'room full'; end if;
  insert into members (trip_id, user_id, nickname) values (t, auth.uid(), nick);
  return t;
end $$;

revoke execute on function public.create_trip(text, text, double precision, double precision, int, text, text[]) from public, anon;
revoke execute on function public.join_trip(text) from public, anon;
grant execute on function public.create_trip(text, text, double precision, double precision, int, text, text[]) to authenticated;
grant execute on function public.join_trip(text) to authenticated;
grant execute on function public.trip_preview(text) to anon, authenticated;

-- ───────────────────────── 실시간 반영(Realtime) ─────────────────────────

alter publication supabase_realtime add table public.places, public.opinions, public.members;
