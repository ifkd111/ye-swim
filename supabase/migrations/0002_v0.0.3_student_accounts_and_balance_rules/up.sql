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
    when m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int < 0 then '欠课'
    when m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int = 0 then '已完成'
    when m.total_lessons - coalesce(sum(al.lessons_deducted), 0)::int <= 5 then '即将用完'
    else '正常'
  end as status,
  m.notes
from public.members m
left join public.course_products cp on cp.id = m.product_id
left join public.attendance_logs al on al.member_id = m.id
group by m.id, cp.id;

create or replace function public.sync_completed_schedule_attendance(schedule_uuid uuid)
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
  synced_log public.attendance_logs%rowtype;
begin
  actor_role := public.current_user_role();

  if actor_role not in ('admin', 'frontdesk') then
    raise exception 'Permission denied';
  end if;

  select * into target_schedule
  from public.schedules
  where id = schedule_uuid;

  if not found then
    raise exception 'Schedule not found';
  end if;

  if target_schedule.lesson_status <> 'completed' or target_schedule.attended is not true then
    delete from public.attendance_logs
    where source_schedule_id = schedule_uuid;
    return null;
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
    coalesce(target_schedule.source, 'schedule_sync'),
    '排课信息变更后同步消课'
  )
  on conflict (source_schedule_id) do update
    set attendance_date = excluded.attendance_date,
        member_id = excluded.member_id,
        coach = excluded.coach,
        campus = excluded.campus,
        lessons_deducted = excluded.lessons_deducted,
        source_note = excluded.source_note
  returning * into synced_log;

  return synced_log;
end;
$$;

grant execute on function public.sync_completed_schedule_attendance(uuid) to authenticated;
notify pgrst, 'reload schema';

insert into app_meta.schema_migrations(version, name)
values ('0.0.3', 'student accounts and balance rules')
on conflict (version) do nothing;
