alter table public.profiles
  add column if not exists remark_name text;

update public.profiles p
set remark_name = concat_ws(' · ', concat('#', m.member_no::text), nullif(m.campus, ''))
from public.members m
where p.role = 'student'
  and p.member_id = m.id
  and (p.remark_name is null or btrim(p.remark_name) = '');

notify pgrst, 'reload schema';

insert into app_meta.schema_migrations(version, name)
values ('0.0.4', 'profile remark name')
on conflict (version) do nothing;
