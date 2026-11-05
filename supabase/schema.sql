-- Kesher: private tables with a small, explicitly granted RPC surface.
-- Apply only to a new dedicated project. No service key is used by the app.
begin;
create schema if not exists kesher_private;
revoke all on schema kesher_private from public, anon, authenticated;
create table public.settings (
 id int primary key check(id=1),owner_user_id uuid references auth.users(id),
 business_name text not null default 'קשר',advisor_name text not null default 'משרד ייעוץ המשכנתאות',
 contact_email text not null default '',contact_phone text not null default '',
 commission_mode text not null default 'unset' check(commission_mode in ('unset','fixed','percentage')),
 commission_value int check(commission_value between 0 and 10000000),
 updated_at bigint not null default (extract(epoch from now())*1000)::bigint,
 check((commission_mode='unset' and commission_value is null) or (commission_mode<>'unset' and commission_value is not null)),
 check(commission_mode<>'percentage' or commission_value<=10000)
);
insert into public.settings(id) values(1);
create table public.partners(
 id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users(id),name text not null check(length(name) between 2 and 80),
 email text not null unique check(length(email)<=160 and email=lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
 phone text not null,profession text not null check(length(profession) between 2 and 60),
 code text not null unique default replace(gen_random_uuid()::text,'-',''),
 status text not null default 'pending' check(status in('pending','active','paused')),
 created_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.leads(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 80),phone text not null unique,
 purpose text not null check(purpose in('purchase','refinance','investment','other')),partner_id uuid references public.partners(id),
 status text not null default 'new' check(status in('new','contacted','meeting','signed','paid','lost')),
 notes text not null default '' check(length(notes)<=4000),fee_received int not null default 0 check(fee_received between 0 and 100000000),
 commission_amount int check(commission_amount between 0 and 10000000),
 commission_status text not null default 'pending' check(commission_status in('pending','approved','paid')),
 commission_rule text,commission_paid_at bigint,consent_at bigint not null,consent_version text not null default 'referral-v1',source text not null,
 created_at bigint not null default (extract(epoch from now())*1000)::bigint,updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create index leads_partner_created on public.leads(partner_id,created_at desc);
create table public.events(
 id uuid primary key default gen_random_uuid(),lead_id uuid references public.leads(id),partner_id uuid references public.partners(id),
 label text not null,internal boolean not null default false,actor_id text not null,
 created_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create index events_partner_created on public.events(partner_id,created_at desc);
create index events_lead on public.events(lead_id);
create table public.rate_limits(key text primary key,count int not null,expires_at bigint not null);
create table public.setup_state(id int primary key check(id=1),token_hash text not null,consumed_by uuid references auth.users(id),consumed_at bigint);
alter table public.settings enable row level security;
alter table public.partners enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.setup_state enable row level security;
revoke all on public.settings,public.partners,public.leads,public.events,public.rate_limits,public.setup_state from public,anon,authenticated;

create function kesher_private.ms() returns bigint language sql set search_path='' as $$select (extract(epoch from now())*1000)::bigint$$;
create function kesher_private.phone(value text) returns text language plpgsql immutable set search_path='' as $$
declare p text := regexp_replace(value,'[[:space:]()+.\-]','','g');
begin
 if left(p,3)='972' then p:='0'||substr(p,4);end if;
 if p is null or p !~ '^0(5[0-9]{8}|[23489][0-9]{7})$' then raise exception 'INVALID_PHONE';end if;
 return p;
end$$;
create function kesher_private.user_id() returns uuid language plpgsql set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'LOGIN_REQUIRED';end if;
 return uid;
end$$;
create function kesher_private.config() returns jsonb language sql set search_path='' as $$select to_jsonb(s)-'id'-'owner_user_id'-'updated_at' from public.settings s where id=1$$;
create function kesher_private.insert_lead(payload jsonb,pid uuid,actor text,src text) returns uuid language plpgsql set search_path='' as $$
declare lid uuid;ph text;
begin
 if payload->'consent' is distinct from 'true'::jsonb then raise exception 'CONSENT_REQUIRED';end if;
 ph:=kesher_private.phone(payload->>'phone');
 if pid is not null and not exists(select 1 from public.partners where id=pid and status='active') then raise exception 'PARTNER_INACTIVE';end if;
 insert into public.leads(name,phone,purpose,partner_id,source,consent_at) values(trim(payload->>'name'),ph,payload->>'purpose',pid,src,kesher_private.ms()) returning id into lid;
 insert into public.events(lead_id,partner_id,label,actor_id) values(lid,pid,'התקבלה הפניה חדשה: '||trim(payload->>'name'),actor);
 return lid;
end$$;
create function public.claim_admin(token text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=kesher_private.user_id();state public.setup_state;
begin
 select * into state from public.setup_state where id=1 for update;
 if state.id is null or state.consumed_by is not null or token is null or length(token) not between 32 and 256 or encode(sha256(convert_to(token,'UTF8')),'hex')<>state.token_hash then raise exception 'SETUP_DENIED';end if;
 update public.settings set owner_user_id=uid where id=1 and owner_user_id is null;
 if not found then raise exception 'SETUP_DENIED';end if;
 update public.setup_state set consumed_by=uid,consumed_at=kesher_private.ms() where id=1;
end$$;
create function public.referral_info(code text) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('partner_name',p.name,'settings',kesher_private.config()-'commission_mode'-'commission_value') from public.partners p where p.code=$1 and p.status='active'
$$;
create function public.submit_referral(code text,payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.partners;k text;n int;t bigint:=kesher_private.ms();
begin
 if length(payload::text)>6000 then raise exception 'INVALID_INPUT';end if;
 select * into p from public.partners where partners.code=$1 and status='active';
 if p.id is null then raise exception 'PARTNER_INACTIVE';end if;
 delete from public.rate_limits where expires_at<t;
 k:=p.id::text||':'||(t/3600000)::text;
 insert into public.rate_limits(key,count,expires_at) values(k,1,(t/3600000+1)*3600000) on conflict(key) do update set count=public.rate_limits.count+1 where public.rate_limits.count<30 returning count into n;
 if n is null then raise exception 'RATE_LIMIT';end if;
 return kesher_private.insert_lead(payload,p.id,'visitor','referral-link');
end$$;
create function public.portal_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=kesher_private.user_id();a boolean;p public.partners;ps jsonb;ls jsonb;es jsonb;email text;
begin
 select owner_user_id=uid into a from public.settings where id=1;a:=coalesce(a,false);
 select u.email into email from auth.users u where id=uid;
 select * into p from public.partners where user_id=uid;
 if not a and p.id is null then raise exception 'REGISTER_REQUIRED';end if;
 if not a and p.status='paused' then raise exception 'PARTNER_PAUSED';end if;
 select coalesce(jsonb_agg(to_jsonb(x)-'user_id' order by x.created_at desc),'[]'::jsonb) into ps from public.partners x where a or x.id=p.id;
 select coalesce(jsonb_agg(case when a then to_jsonb(l) else (to_jsonb(l)-'consent_version')||jsonb_build_object('phone','••• '||right(l.phone,4),'notes','','fee_received',0,'commission_rule',null) end order by l.created_at desc),'[]'::jsonb) into ls from public.leads l where a or l.partner_id=p.id;
 select coalesce(jsonb_agg(to_jsonb(e)-'actor_id'-'internal' order by e.created_at desc),'[]'::jsonb) into es from(select * from public.events where a or (partner_id=p.id and not internal) order by created_at desc limit 80)e;
 return jsonb_build_object('user',jsonb_build_object('name',case when a then 'מנהל המערכת' else p.name end,'email',email,'role',case when a then 'admin' else 'partner' end,'partner_id',case when a then null else p.id end),'partners',ps,'leads',ls,'events',es,'settings',kesher_private.config());
end$$;

create function public.portal_action(action text,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=kesher_private.user_id();a boolean;account_email text;p public.partners;l public.leads;s public.settings;pid uuid;lid uuid;ph text;amount int;st text;fee int;mode text;value int;nowms bigint:=kesher_private.ms();newpay boolean;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or length(payload::text)>20000 then raise exception 'INVALID_INPUT';end if;
 select * into s from public.settings where id=1;a:=coalesce(s.owner_user_id=uid,false);
 select u.email into account_email from auth.users u where id=uid;
 select * into p from public.partners where user_id=uid;
 if action='register' then
  if a then raise exception 'ADMIN_ONLY';end if;
  if payload->'consent' is distinct from 'true'::jsonb then raise exception 'CONSENT_REQUIRED';end if;
  if p.id is not null then return;end if;
  ph:=kesher_private.phone(payload->>'phone');
  select * into p from public.partners where partners.email=lower(account_email) for update;
  if p.id is not null then
   if p.user_id is not null and p.user_id<>uid then raise exception 'FORBIDDEN';end if;
   update public.partners set user_id=uid,name=trim(payload->>'name'),phone=ph,profession=trim(payload->>'profession') where id=p.id;
  else
   insert into public.partners(user_id,name,email,phone,profession) values(uid,trim(payload->>'name'),lower(account_email),ph,trim(payload->>'profession')) returning id into pid;
   insert into public.events(partner_id,label,actor_id) values(pid,'בקשת הצטרפות לתוכנית',uid::text);
  end if;return;
 end if;
 if not a and (p.id is null or p.status<>'active') then raise exception 'PARTNER_INACTIVE';end if;
 if action='addLead' then
  pid:=case when a then nullif(payload->>'partnerId','')::uuid else p.id end;
  perform kesher_private.insert_lead(payload,pid,uid::text,'portal');return;
 end if;
 if not a then raise exception 'ADMIN_ONLY';end if;
 if action='addPartner' then
  ph:=kesher_private.phone(payload->>'phone');
  insert into public.partners(name,email,phone,profession,status) values(trim(payload->>'name'),lower(trim(payload->>'email')),ph,trim(payload->>'profession'),'active') returning id into pid;
  insert into public.events(partner_id,label,actor_id) values(pid,'נוסף שותף חדש: '||trim(payload->>'name'),uid::text);return;
 end if;
 if action='partnerStatus' then
  pid:=(payload->>'id')::uuid;
  update public.partners set status=payload->>'status' where id=pid;
  if not found then raise exception 'NOT_FOUND';end if;
  insert into public.events(partner_id,label,actor_id) values(pid,'סטטוס השותף עודכן',uid::text);return;
 end if;
 if action='saveSettings' then
  mode:=payload->>'commissionMode';value:=nullif(payload->>'commissionValue','')::int;
  if length(trim(payload->>'businessName')) not between 2 and 60 or length(trim(payload->>'advisorName')) not between 2 and 80 or length(coalesce(payload->>'contactEmail',''))>160 then raise exception 'INVALID_INPUT';end if;
  if coalesce(payload->>'contactEmail','')<>'' and (payload->>'contactEmail') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'INVALID_INPUT';end if;
  ph:=case when coalesce(payload->>'contactPhone','')='' then '' else kesher_private.phone(payload->>'contactPhone') end;
  update public.settings set business_name=trim(payload->>'businessName'),advisor_name=trim(payload->>'advisorName'),contact_email=coalesce(payload->>'contactEmail',''),contact_phone=ph,commission_mode=mode,commission_value=case when mode='unset' then null else value end,updated_at=nowms where id=1;return;
 end if;
 lid:=(payload->>'id')::uuid;select * into l from public.leads where id=lid for update;
 if l.id is null then raise exception 'NOT_FOUND';end if;
 if action='updateLead' then
  st:=payload->>'status';fee:=(payload->>'feeReceived')::int;
  if st='paid' and coalesce(fee,0)<=0 then raise exception 'FEE_REQUIRED';end if;
  if l.commission_status in('approved','paid') and st<>'paid' then raise exception 'COMMISSION_LOCKED';end if;
  if l.status='paid' and fee is distinct from l.fee_received then raise exception 'FEE_LOCKED';end if;
  newpay:=st='paid' and l.status<>'paid';amount:=l.commission_amount;
  if newpay and l.partner_id is not null then
   amount:=case s.commission_mode when 'fixed' then s.commission_value when 'percentage' then round(fee::numeric*s.commission_value/10000)::int else null end;
  end if;
  update public.leads set status=st,notes=payload->>'notes',fee_received=fee,commission_amount=amount,commission_rule=case when newpay then jsonb_build_object('mode',s.commission_mode,'value',s.commission_value)::text else l.commission_rule end,updated_at=nowms where id=lid;
  insert into public.events(lead_id,partner_id,label,internal,actor_id) values(lid,l.partner_id,l.name||': עודכן טיפול בהפניה',st=l.status,uid::text);return;
 end if;
 if action='commission' then
  amount:=(payload->>'amount')::int;st:=payload->>'status';
  if l.partner_id is null or l.status<>'paid' then raise exception 'FEE_REQUIRED';end if;
  if l.commission_status='paid' then raise exception 'COMMISSION_LOCKED';end if;
  if st='paid' and (l.commission_status<>'approved' or amount is distinct from l.commission_amount) then raise exception 'APPROVAL_REQUIRED';end if;
  if amount is null then raise exception 'INVALID_INPUT';end if;
  update public.leads set commission_amount=amount,commission_status=st,commission_paid_at=case when st='paid' then nowms else null end,updated_at=nowms where id=lid;
  insert into public.events(lead_id,partner_id,label,actor_id) values(lid,l.partner_id,l.name||case st when 'paid' then ': עמלת השותף שולמה' when 'approved' then ': אושרה עמלת השותף' else ': עודכנה עמלת השותף' end,uid::text);return;
 end if;
 raise exception 'INVALID_ACTION';
end$$;
-- Helpers have no API grants and are in a non-exposed schema.
revoke all on all functions in schema kesher_private from public,anon,authenticated;
revoke all on function public.claim_admin(text),public.referral_info(text),public.submit_referral(text,jsonb),public.portal_snapshot(),public.portal_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.referral_info(text),public.submit_referral(text,jsonb) to anon,authenticated;
grant execute on function public.claim_admin(text),public.portal_snapshot(),public.portal_action(text,jsonb) to authenticated;
commit;
