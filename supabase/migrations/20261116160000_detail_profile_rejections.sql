-- Remember which productdetail.get parameter profiles AliExpress rejected
-- (logged as DETAIL_PROFILE_REJECTED), so each costs at most one call per 30
-- days. Live run #6 showed tracking_id is the rejected parameter; profiles
-- without it (ILS first) are tried next. Additive: one function replaced.
begin;

create or replace function public.dp_last_detail_profile(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'profile', (
      select detail from dp_import_events
      where code = 'DETAIL_PROFILE_ACCEPTED' and at > now() - interval '30 days'
      order by id desc limit 1),
    'rejected', coalesce((
      select jsonb_agg(distinct detail) from dp_import_events
      where code = 'DETAIL_PROFILE_REJECTED' and at > now() - interval '30 days'), '[]'::jsonb))
$$;

revoke all on function public.dp_last_detail_profile(jsonb) from public, anon, authenticated;
grant execute on function public.dp_last_detail_profile(jsonb) to service_role;

commit;
