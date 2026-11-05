begin;
create table public.campaign(id int primary key check(id=1),draft jsonb not null default '{}'::jsonb);
insert into public.campaign(id) values(1);
alter table public.campaign enable row level security;
revoke all on public.campaign from public,anon,authenticated;
create table public.referral_visits(partner_id uuid references public.partners(id),day date not null default current_date,views int not null default 1,primary key(partner_id,day));
alter table public.referral_visits enable row level security;
revoke all on public.referral_visits from public,anon,authenticated;
create function public.campaign_admin() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.settings where owner_user_id=kesher_private.user_id()) then raise exception 'ADMIN_ONLY';end if;
 return (select draft from public.campaign where id=1);
end$$;
create function public.save_campaign(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.settings where owner_user_id=kesher_private.user_id()) then raise exception 'ADMIN_ONLY';end if;
 if length(payload::text)>6000 or payload->>'websiteUrl' !~ '^https://' or payload->>'headline' is null or length(payload->>'headline') not between 2 and 120 or length(payload->>'description') not between 10 and 1200 or length(payload->>'benefits')>500 or (coalesce(payload->>'logoUrl','')<>'' and payload->>'logoUrl' !~ '^https://') or jsonb_typeof(payload->'published')<>'boolean' then raise exception 'INVALID_INPUT';end if;
 update public.campaign set draft=jsonb_build_object('websiteUrl',payload->>'websiteUrl','headline',payload->>'headline','description',payload->>'description','benefits',payload->>'benefits','logoUrl',payload->>'logoUrl','published',payload->'published') where id=1;
 insert into public.events(label,actor_id,internal) values('עודכן דף הנחיתה של היועץ',auth.uid()::text,true);
end$$;
create or replace function public.referral_info(code text) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('partner_name',p.name,'settings',(kesher_private.config()-'commission_mode'-'commission_value')||jsonb_build_object('campaign',case when c.draft->'published'='true'::jsonb then c.draft else null end)) from public.partners p cross join public.campaign c where p.code=$1 and p.status='active' and c.id=1
$$;
create function public.record_referral_visit(code text) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 select id into pid from public.partners p where p.code=$1 and status='active';
 if pid is not null then insert into public.referral_visits(partner_id) values(pid) on conflict(partner_id,day) do update set views=least(public.referral_visits.views+1,1000000);end if;
end$$;
revoke all on function public.campaign_admin(),public.save_campaign(jsonb),public.record_referral_visit(text) from public,anon,authenticated;
grant execute on function public.campaign_admin(),public.save_campaign(jsonb) to authenticated;
grant execute on function public.record_referral_visit(text) to anon,authenticated;
commit;
