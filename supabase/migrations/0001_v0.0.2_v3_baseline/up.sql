create schema if not exists app_meta;

create table if not exists app_meta.schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);
create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('admin', 'coach', 'frontdesk', 'student');
exception
  when duplicate_object then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' and e.enumlabel = 'student'
    ) then
      alter type public.user_role add value 'student';
    end if;
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

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.availability_status as enum ('draft', 'published', 'closed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'coach',
  account text unique,
  campus text,
  coach_name text,
  member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists account text unique,
  add column if not exists member_id uuid;

create table if not exists public.course_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.product_type not null default 'class_pack',
  total_lessons integer not null default 20,
  valid_days integer,
  price integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.course_products
  add column if not exists price integer not null default 0,
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

alter table public.profiles
  drop constraint if exists profiles_member_id_fkey;

alter table public.profiles
  add constraint profiles_member_id_fkey foreign key (member_id) references public.members(id) on delete set null;

create table if not exists public.coach_availability_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  slot_time text not null,
  campus text not null,
  coach text not null,
  capacity integer not null default 1 check (capacity > 0),
  status public.availability_status not null default 'draft',
  publish_order integer not null default 100,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.coach_availability_slots(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.review_status not null default 'pending',
  note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_schedule_id uuid references public.schedules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  product_id uuid not null references public.course_products(id) on delete cascade,
  status public.review_status not null default 'pending',
  note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  product_id uuid references public.course_products(id) on delete set null,
  campus text,
  coach text,
  note text,
  status public.review_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
create index if not exists idx_profiles_member on public.profiles(member_id);
create index if not exists idx_availability_coach_date on public.coach_availability_slots(coach, slot_date);
create index if not exists idx_availability_status_date on public.coach_availability_slots(status, slot_date);
create index if not exists idx_booking_member on public.booking_requests(member_id, created_at);
create index if not exists idx_booking_status on public.booking_requests(status, created_at);
create index if not exists idx_course_app_member on public.course_applications(member_id, created_at);
create index if not exists idx_student_reg_status on public.student_registrations(status, created_at);

alter table public.profiles enable row level security;
alter table public.course_products enable row level security;
alter table public.members enable row level security;
alter table public.schedules enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.coach_availability_slots enable row level security;
alter table public.booking_requests enable row level security;
alter table public.course_applications enable row level security;
alter table public.student_registrations enable row level security;

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

create or replace function public.current_member_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select member_id from public.profiles where id = auth.uid()
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
using (public.current_user_role()::text in ('admin', 'frontdesk', 'coach', 'student'));

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
  or id = public.current_member_id()
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
  or member_id = public.current_member_id()
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
  or member_id = public.current_member_id()
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

drop policy if exists "availability_read" on public.coach_availability_slots;
create policy "availability_read"
on public.coach_availability_slots
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or coach = public.current_coach_name()
  or (
    public.current_user_role()::text = 'student'
    and status = 'published'
    and exists (
      select 1
      from public.members m
      where m.id = public.current_member_id()
        and (m.coach is null or m.coach = public.coach_availability_slots.coach)
    )
  )
);

drop policy if exists "coach_insert_own_availability" on public.coach_availability_slots;
create policy "coach_insert_own_availability"
on public.coach_availability_slots
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'frontdesk')
  or (public.current_user_role() = 'coach' and coach = public.current_coach_name() and status = 'draft')
);

drop policy if exists "availability_update" on public.coach_availability_slots;
create policy "availability_update"
on public.coach_availability_slots
for update
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or (public.current_user_role() = 'coach' and coach = public.current_coach_name())
)
with check (
  public.current_user_role() in ('admin', 'frontdesk')
  or (public.current_user_role() = 'coach' and coach = public.current_coach_name() and status = 'draft')
);

drop policy if exists "availability_delete" on public.coach_availability_slots;
create policy "availability_delete"
on public.coach_availability_slots
for delete
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or (public.current_user_role() = 'coach' and coach = public.current_coach_name() and status = 'draft')
);

drop policy if exists "booking_read" on public.booking_requests;
create policy "booking_read"
on public.booking_requests
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or member_id = public.current_member_id()
  or exists (
    select 1 from public.coach_availability_slots s
    where s.id = slot_id and s.coach = public.current_coach_name()
  )
);

drop policy if exists "student_insert_booking" on public.booking_requests;
create policy "student_insert_booking"
on public.booking_requests
for insert
to authenticated
with check (
  public.current_user_role()::text = 'student'
  and member_id = public.current_member_id()
);

drop policy if exists "admin_update_booking" on public.booking_requests;
create policy "admin_update_booking"
on public.booking_requests
for update
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "course_app_read" on public.course_applications;
create policy "course_app_read"
on public.course_applications
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'frontdesk')
  or member_id = public.current_member_id()
);

drop policy if exists "student_insert_course_app" on public.course_applications;
create policy "student_insert_course_app"
on public.course_applications
for insert
to authenticated
with check (
  public.current_user_role()::text = 'student'
  and member_id = public.current_member_id()
);

drop policy if exists "admin_update_course_app" on public.course_applications;
create policy "admin_update_course_app"
on public.course_applications
for update
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "admin_read_student_regs" on public.student_registrations;
create policy "admin_read_student_regs"
on public.student_registrations
for select
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'));

drop policy if exists "public_insert_student_regs" on public.student_registrations;
create policy "public_insert_student_regs"
on public.student_registrations
for insert
to anon, authenticated
with check (true);

drop policy if exists "admin_update_student_regs" on public.student_registrations;
create policy "admin_update_student_regs"
on public.student_registrations
for update
to authenticated
using (public.current_user_role() in ('admin', 'frontdesk'))
with check (public.current_user_role() in ('admin', 'frontdesk'));

create or replace function public.booking_min_date()
returns date
language sql
stable
as $$
  select case
    when ((now() at time zone 'Asia/Shanghai')::time >= time '20:00')
      then ((now() at time zone 'Asia/Shanghai')::date + 2)
    else ((now() at time zone 'Asia/Shanghai')::date + 1)
  end
$$;

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

create or replace function public.create_booking_request(slot_uuid uuid, request_note text default null)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  actor_member uuid;
  actor_member_coach text;
  target_slot public.coach_availability_slots%rowtype;
  active_count integer := 0;
  duplicate_count integer := 0;
  created_request public.booking_requests%rowtype;
begin
  actor_role := public.current_user_role();
  actor_member := public.current_member_id();

  if actor_role::text <> 'student' or actor_member is null then
    raise exception 'Permission denied';
  end if;

  select * into target_slot
  from public.coach_availability_slots
  where id = slot_uuid
  for update;

  if not found or target_slot.status <> 'published' then
    raise exception '该时间暂不可预约';
  end if;

  select coach into actor_member_coach
  from public.members
  where id = actor_member;

  if actor_member_coach is not null and actor_member_coach <> target_slot.coach then
    raise exception '该时间不属于你的绑定教练';
  end if;

  if target_slot.slot_date < public.booking_min_date() then
    raise exception '该时间不符合提前预约规则';
  end if;

  select count(*) into duplicate_count
  from public.booking_requests
  where slot_id = slot_uuid
    and member_id = actor_member
    and status in ('pending', 'approved');

  if duplicate_count > 0 then
    raise exception '你已经提交过该时间的预约';
  end if;

  select count(*) into active_count
  from public.booking_requests
  where slot_id = slot_uuid
    and status in ('pending', 'approved');

  if active_count >= target_slot.capacity then
    raise exception '该时间名额已满';
  end if;

  insert into public.booking_requests (slot_id, member_id, note)
  values (slot_uuid, actor_member, nullif(trim(coalesce(request_note, '')), ''))
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.approve_booking_request(request_uuid uuid)
returns public.schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  target_request public.booking_requests%rowtype;
  target_slot public.coach_availability_slots%rowtype;
  created_schedule public.schedules%rowtype;
begin
  actor_role := public.current_user_role();

  if actor_role not in ('admin', 'frontdesk') then
    raise exception 'Permission denied';
  end if;

  select * into target_request
  from public.booking_requests
  where id = request_uuid
  for update;

  if not found then
    raise exception '预约申请不存在';
  end if;

  if target_request.status <> 'pending' then
    raise exception '该预约已处理';
  end if;

  select * into target_slot
  from public.coach_availability_slots
  where id = target_request.slot_id
  for update;

  if not found then
    raise exception '空余时间不存在';
  end if;

  insert into public.schedules (
    lesson_date,
    lesson_time,
    weekday,
    campus,
    coach,
    member_id,
    attended,
    lesson_status,
    source
  )
  values (
    target_slot.slot_date,
    target_slot.slot_time,
    to_char(target_slot.slot_date, 'Dy'),
    target_slot.campus,
    target_slot.coach,
    target_request.member_id,
    false,
    'pending',
    'student_booking'
  )
  returning * into created_schedule;

  update public.booking_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      created_schedule_id = created_schedule.id,
      updated_at = now()
  where id = request_uuid;

  return created_schedule;
end;
$$;

create or replace function public.reject_booking_request(request_uuid uuid)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  updated_request public.booking_requests%rowtype;
begin
  actor_role := public.current_user_role();

  if actor_role not in ('admin', 'frontdesk') then
    raise exception 'Permission denied';
  end if;

  update public.booking_requests
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = request_uuid and status = 'pending'
  returning * into updated_request;

  if not found then
    raise exception '该预约无法拒绝';
  end if;

  return updated_request;
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
grant select, insert, update, delete on public.coach_availability_slots to authenticated;
grant select, insert, update on public.booking_requests, public.course_applications to authenticated;
grant select, update on public.student_registrations to authenticated;
grant insert on public.student_registrations to anon, authenticated;
grant execute on function public.create_booking_request(uuid, text) to authenticated;
grant execute on function public.approve_booking_request(uuid) to authenticated;
grant execute on function public.reject_booking_request(uuid) to authenticated;
grant execute on function public.booking_min_date() to authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
notify pgrst, 'reload schema';

insert into app_meta.schema_migrations (version, name)
values ('0.0.2', 'v3 baseline')
on conflict (version) do nothing;
