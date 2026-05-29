create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('admin', 'coach', 'frontdesk');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_type as enum ('class_pack', 'monthly', 'camp', 'vip');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.lesson_status as enum ('pending', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'coach',
  campus text,
  coach_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.product_type not null default 'class_pack',
  total_lessons integer not null default 20,
  valid_days integer,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.course_products
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_no bigint generated always as identity,
  chinese_name text not null,
  english_name text,
  gender text,
  phone text,
  wechat text,
  campus text,
  coach text,
  product_id uuid references public.course_products(id),
  total_lessons integer not null default 20,
  card_start_date date,
  card_expire_date date,
  camp_start_date date,
  camp_end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chinese_name)
);

alter table public.members
  add column if not exists phone text,
  add column if not exists wechat text,
  add column if not exists camp_start_date date,
  add column if not exists camp_end_date date,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  lesson_date date not null,
  lesson_time text not null,
  weekday text,
  campus text not null,
  coach text not null default '未分配',
  member_id uuid not null references public.members(id) on delete cascade,
  attended boolean not null default false,
  lesson_status public.lesson_status not null default 'pending',
  source text,
  source_row integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schedules
  add column if not exists source text,
  add column if not exists source_row integer,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  member_id uuid not null references public.members(id) on delete cascade,
  coach text,
  campus text,
  lessons_deducted integer not null default 1,
  source_schedule_id uuid references public.schedules(id) on delete set null,
  source text,
  source_note text,
  created_at timestamptz not null default now(),
  unique (source_schedule_id)
);

create or replace view public.member_balances
with (security_invoker = true) as
select
  m.id,
  m.member_no,
  m.chinese_name,
  m.english_name,
  m.gender,
  m.phone,
  m.wechat,
  m.campus,
  m.coach,
  m.product_id,
  cp.name as product_name,
  cp.type as product_type,
  m.total_lessons,
  coalesce(sum(al.lessons_deducted), 0)::int as used_lessons,
  case
    when cp.type in ('monthly', 'camp', 'vip') then m.total_lessons
    else m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int
  end as remaining_lessons,
  m.card_start_date,
  m.card_expire_date,
  m.camp_start_date,
  m.camp_end_date,
  case
    when cp.type = 'vip' then '正常'
    when cp.type = 'monthly' and m.card_expire_date is not null and current_date > m.card_expire_date then '欠课'
    when cp.type = 'camp' and m.camp_end_date is not null and current_date > m.camp_end_date then '欠课'
    when cp.type in ('monthly', 'camp') then '正常'
    when m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int <= 0 then '欠课'
    when m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int <= 5 then '即将用完'
    else '正常'
  end as status,
  m.notes
from public.members m
left join public.course_products cp on cp.id = m.product_id
left join public.attendance_logs al on al.member_id = m.id
group by m.id, cp.id;

create index if not exists idx_members_campus on public.members(campus);
create index if not exists idx_schedules_date on public.schedules(lesson_date);
create index if not exists idx_schedules_coach_date on public.schedules(coach, lesson_date);
create index if not exists idx_attendance_member_date on public.attendance_logs(member_id, attendance_date);

alter table public.profiles enable row level security;
alter table public.course_products enable row level security;
alter table public.members enable row level security;
alter table public.schedules enable row level security;
alter table public.attendance_logs enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_coach_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coach_name from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles_self_or_admin" on public.profiles;
create policy "profiles_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "admin_all_profiles" on public.profiles;
create policy "admin_all_profiles"
on public.profiles
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "staff_read_products" on public.course_products;
create policy "staff_read_products"
on public.course_products
for select
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk', 'coach'));

drop policy if exists "admin_frontdesk_write_products" on public.course_products;
create policy "admin_frontdesk_write_products"
on public.course_products
for all
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "staff_read_members" on public.members;
create policy "staff_read_members"
on public.members
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or coach = public.current_coach_name()
);

drop policy if exists "admin_frontdesk_write_members" on public.members;
create policy "admin_frontdesk_write_members"
on public.members
for all
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "staff_read_schedules" on public.schedules;
create policy "staff_read_schedules"
on public.schedules
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or coach = public.current_coach_name()
);

drop policy if exists "admin_frontdesk_write_schedules" on public.schedules;
create policy "admin_frontdesk_write_schedules"
on public.schedules
for all
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "coach_mark_attendance" on public.schedules;
create policy "coach_mark_attendance"
on public.schedules
for update
to authenticated
using (
  public.current_user_role() = 'admin'
  or public.current_user_role() = 'frontdesk'
  or coach = public.current_coach_name()
)
with check (
  public.current_user_role() = 'admin'
  or public.current_user_role() = 'frontdesk'
  or coach = public.current_coach_name()
);

drop policy if exists "staff_read_attendance" on public.attendance_logs;
create policy "staff_read_attendance"
on public.attendance_logs
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or coach = public.current_coach_name()
);

drop policy if exists "staff_insert_attendance" on public.attendance_logs;
create policy "staff_insert_attendance"
on public.attendance_logs
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'frontdesk')
  or coach = public.current_coach_name()
);

create or replace function public.mark_schedule_attended(schedule_uuid uuid)
returns public.attendance_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  target_schedule public.schedules%rowtype;
  target_member public.members%rowtype;
  product_type public.product_type;
  deduction integer := 1;
  created_log public.attendance_logs%rowtype;
begin
  actor_role := public.current_user_role();

  if actor_role is null then
    raise exception 'Permission denied';
  end if;

  select * into target_schedule
  from public.schedules
  where id = schedule_uuid
  for update;

  if not found then
    raise exception 'Schedule not found';
  end if;

  if actor_role = 'coach' and target_schedule.coach <> public.current_coach_name() then
    raise exception 'Permission denied';
  end if;

  if target_schedule.lesson_status = 'completed' then
    select * into created_log
    from public.attendance_logs
    where source_schedule_id = schedule_uuid
    limit 1;
    return created_log;
  end if;

  select * into target_member
  from public.members
  where id = target_schedule.member_id;

  select cp.type into product_type
  from public.course_products cp
  where cp.id = target_member.product_id;

  if product_type in ('monthly', 'camp', 'vip') then
    deduction := 0;
  end if;

  insert into public.attendance_logs (
    attendance_date,
    member_id,
    coach,
    campus,
    lessons_deducted,
    source_schedule_id,
    source,
    source_note
  )
  values (
    target_schedule.lesson_date,
    target_schedule.member_id,
    target_schedule.coach,
    target_schedule.campus,
    deduction,
    target_schedule.id,
    'coach_checkin',
    '教练勾选出勤'
  )
  on conflict (source_schedule_id) do update
    set source_note = public.attendance_logs.source_note
  returning * into created_log;

  update public.schedules
  set attended = true,
      lesson_status = 'completed',
      updated_at = now()
  where id = schedule_uuid;

  return created_log;
end;
$$;

revoke usage on schema public from anon;
grant usage on schema public to authenticated;

revoke all on public.member_balances from anon;
revoke all on public.course_products, public.members, public.schedules, public.attendance_logs from anon;
grant select on public.profiles to authenticated;
grant select on public.member_balances to authenticated;
grant select on public.course_products, public.members, public.schedules, public.attendance_logs to authenticated;
grant insert, update, delete on public.members, public.schedules to authenticated;
grant insert on public.attendance_logs to authenticated;
grant execute on function public.mark_schedule_attended(uuid) to authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
notify pgrst, 'reload schema';
