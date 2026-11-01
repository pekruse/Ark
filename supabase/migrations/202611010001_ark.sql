create table public.preferences (
  user_id uuid primary key references auth.users on delete cascade,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  language text not null check (language in ('en','es','zh-Hans','vi','ar','ht','ko','ru','fil')),
  sms_enabled boolean not null default false,
  sms_consent_at timestamptz,
  joined_at timestamptz not null default now(),
  check (not sms_enabled or sms_consent_at is not null)
);
alter table public.preferences enable row level security;
create policy own_preferences on public.preferences for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.preferences from anon;
grant select, insert, update, delete on public.preferences to authenticated;

-- Only backend code can read or write delivery records and translated alerts.
create table public.deliveries (
  user_id uuid references auth.users on delete cascade,
  alert_id text not null,
  language text not null,
  status text not null default 'claimed' check (status in ('claimed','accepted','failed','unknown')),
  provider_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, alert_id, language)
);
create table public.translations (
  alert_id text not null,
  language text not null,
  message text not null,
  expires_at timestamptz not null,
  primary key (alert_id, language)
);
alter table public.deliveries enable row level security;
alter table public.translations enable row level security;
revoke all on public.deliveries, public.translations from anon, authenticated;

-- Durable per-user quota for the authenticated alert endpoint.
create table public.request_limits (
  user_id uuid primary key references auth.users on delete cascade,
  window_start timestamptz not null,
  requests integer not null
);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon, authenticated;
create function public.consume_alert_quota(uid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into request_limits values (uid, now(), 1)
  on conflict (user_id) do update set
    requests = case when request_limits.window_start < now() - interval '1 hour' then 1 else request_limits.requests + 1 end,
    window_start = case when request_limits.window_start < now() - interval '1 hour' then now() else request_limits.window_start end
  returning requests into n;
  return n <= 20;
end $$;
revoke all on function public.consume_alert_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_alert_quota(uuid) to service_role;
