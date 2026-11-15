-- Apply only in a NEW, dedicated DealPilot Supabase project.
-- Do not execute against the existing mortgage referral project.
begin;
create table if not exists public.dealpilot_click_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null check (length(product_id) between 1 and 100),
  product_title text not null check (length(product_title) between 1 and 250),
  category text not null check (length(category) between 1 and 70),
  source text not null check(source in ('catalog','telegram','facebook','instagram','other'))
);
create index if not exists dealpilot_click_created_idx on public.dealpilot_click_events(created_at desc);
create index if not exists dealpilot_click_product_idx on public.dealpilot_click_events(product_id,created_at desc);
alter table public.dealpilot_click_events enable row level security;
revoke all on public.dealpilot_click_events from public, anon, authenticated;
grant select, insert on public.dealpilot_click_events to service_role;
grant usage, select on sequence public.dealpilot_click_events_id_seq to service_role;

create or replace view public.dealpilot_click_totals
with (security_invoker = true) as
select source,count(*)::bigint as clicks
from public.dealpilot_click_events
group by source;
revoke all on public.dealpilot_click_totals from public,anon,authenticated;
grant select on public.dealpilot_click_totals to service_role;
commit;

-- Collect no IPs, cookies or browser fingerprint. Purge old events periodically
-- according to an explicit retention policy before production launch.
