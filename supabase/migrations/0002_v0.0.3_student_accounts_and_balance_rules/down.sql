drop function if exists public.sync_completed_schedule_attendance(uuid);

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

delete from app_meta.schema_migrations where version = '0.0.3';
notify pgrst, 'reload schema';
