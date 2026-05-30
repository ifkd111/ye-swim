drop index if exists public.idx_availability_status_coach_date_order;
drop index if exists public.idx_course_app_member_status_created;
drop index if exists public.idx_booking_member_status_created;
drop index if exists public.idx_booking_slot_status;
drop index if exists public.idx_attendance_coach_date;
drop index if exists public.idx_schedules_coach_status_date;
drop index if exists public.idx_schedules_status_date;
drop index if exists public.idx_schedules_member_date;
drop index if exists public.idx_members_coach_member_no;
drop index if exists public.idx_member_balances_name_search;

delete from app_meta.schema_migrations
where version = '0.0.5';

notify pgrst, 'reload schema';
