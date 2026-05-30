delete from app_meta.schema_migrations where version = '0.0.2';

drop function if exists public.reject_booking_request(uuid);
drop function if exists public.approve_booking_request(uuid);
drop function if exists public.create_booking_request(uuid, text);
drop function if exists public.booking_min_date();
drop function if exists public.touch_updated_at();

drop table if exists public.student_registrations cascade;
drop table if exists public.course_applications cascade;
drop table if exists public.booking_requests cascade;
drop table if exists public.coach_availability_slots cascade;

alter table public.profiles
  drop constraint if exists profiles_member_id_fkey;

alter table public.profiles
  drop column if exists member_id;

alter table public.course_products
  drop column if exists price;

drop type if exists public.availability_status;
drop type if exists public.review_status;

notify pgrst, 'reload schema';
