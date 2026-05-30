create index if not exists idx_member_balances_name_search on public.members(chinese_name);
create index if not exists idx_members_coach_member_no on public.members(coach, member_no);
create index if not exists idx_schedules_member_date on public.schedules(member_id, lesson_date, lesson_time);
create index if not exists idx_schedules_status_date on public.schedules(lesson_status, lesson_date, lesson_time);
create index if not exists idx_schedules_coach_status_date on public.schedules(coach, lesson_status, lesson_date, lesson_time);
create index if not exists idx_attendance_coach_date on public.attendance_logs(coach, attendance_date desc);
create index if not exists idx_booking_slot_status on public.booking_requests(slot_id, status);
create index if not exists idx_booking_member_status_created on public.booking_requests(member_id, status, created_at desc);
create index if not exists idx_course_app_member_status_created on public.course_applications(member_id, status, created_at desc);
create index if not exists idx_availability_status_coach_date_order on public.coach_availability_slots(status, coach, slot_date, publish_order, slot_time);

notify pgrst, 'reload schema';

insert into app_meta.schema_migrations(version, name)
values ('0.0.5', 'query performance indexes')
on conflict (version) do nothing;
