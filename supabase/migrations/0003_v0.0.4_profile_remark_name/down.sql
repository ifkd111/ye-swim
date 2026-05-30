alter table public.profiles
  drop column if exists remark_name;

delete from app_meta.schema_migrations where version = '0.0.4';
notify pgrst, 'reload schema';
