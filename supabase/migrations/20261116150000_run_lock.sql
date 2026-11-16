-- One provider job at a time (2026-11-16).
-- Discovery and price refresh share the AliExpress per-second frequency limit
-- (live ApiCallLimit "ban will last 1 seconds"), and serverless invocations
-- (Vercel Cron + the admin button) share no memory. The database therefore
-- serialises job starts: a transaction-level advisory lock makes the
-- "is anything running?" check and the insert atomic, and a job that is
-- already running makes the new start fail with SQLSTATE DP409.
-- A run left 'running' for over 10 minutes (function limit is 60 s) is
-- closed as abandoned so a crashed function cannot block jobs forever.
-- Also: remember the productdetail.get parameter profile the provider last
-- accepted, so known-rejected parameters do not cost calls on every run.
begin;

create or replace function public.dp_start_run(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare rid bigint; busy bigint;
begin
  perform pg_advisory_xact_lock(hashtext('dealpilot_provider_jobs'));
  update dp_import_runs set status = 'failed', finished_at = now(),
    error_codes = error_codes || '{"RUN_ABANDONED":1}'::jsonb
  where status = 'running' and started_at < now() - interval '10 minutes';
  select id into busy from dp_import_runs where status = 'running' order by id limit 1;
  if busy is not null then
    raise exception 'RUN_IN_PROGRESS' using errcode = 'DP409', detail = 'run ' || busy || ' is still running';
  end if;
  insert into dp_import_runs (kind, trigger) values (p->>'kind', coalesce(p->>'trigger', 'manual'))
  returning id into rid;
  return jsonb_build_object('id', rid);
end $$;

create or replace function public.dp_last_detail_profile(p jsonb) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('profile', (
    select detail from dp_import_events
    where code = 'DETAIL_PROFILE_ACCEPTED' and at > now() - interval '30 days'
    order by id desc limit 1))
$$;

revoke all on function public.dp_start_run(jsonb) from public, anon, authenticated;
grant execute on function public.dp_start_run(jsonb) to service_role;
revoke all on function public.dp_last_detail_profile(jsonb) from public, anon, authenticated;
grant execute on function public.dp_last_detail_profile(jsonb) to service_role;

commit;
