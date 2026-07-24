-- Client/server app error events for debugging signup, auth, and runtime failures.

begin;

create table if not exists public.app_error_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (char_length(source) between 2 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  details jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  path text,
  user_agent text
);

create index if not exists app_error_events_created_at_idx
  on public.app_error_events (created_at desc);

create index if not exists app_error_events_source_idx
  on public.app_error_events (source);

create index if not exists app_error_events_email_idx
  on public.app_error_events (email);

alter table public.app_error_events enable row level security;

-- No direct table access from the client; inserts go through the RPC below.
revoke all on table public.app_error_events from anon, authenticated;
grant select on table public.app_error_events to authenticated;

drop policy if exists "app_error_events_select_own" on public.app_error_events;
create policy "app_error_events_select_own" on public.app_error_events
for select using (user_id is not null and user_id = auth.uid());

create or replace function public.log_app_error(
  error_source text,
  error_message text,
  error_details jsonb default '{}'::jsonb,
  error_email text default null,
  error_path text default null,
  error_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  safe_details jsonb;
begin
  if nullif(trim(error_source), '') is null then
    raise exception 'error_source is required';
  end if;
  if nullif(trim(error_message), '') is null then
    raise exception 'error_message is required';
  end if;

  -- Never persist secrets if a caller accidentally includes them.
  safe_details := coalesce(error_details, '{}'::jsonb)
    - 'password'
    - 'access_token'
    - 'refresh_token'
    - 'token';

  insert into public.app_error_events (
    source,
    message,
    details,
    user_id,
    email,
    path,
    user_agent
  )
  values (
    left(trim(error_source), 120),
    left(trim(error_message), 2000),
    safe_details,
    auth.uid(),
    nullif(lower(trim(error_email)), ''),
    nullif(left(trim(coalesce(error_path, '')), 300), ''),
    nullif(left(trim(coalesce(error_user_agent, '')), 400), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.log_app_error(text, text, jsonb, text, text, text) from public;
grant execute on function public.log_app_error(text, text, jsonb, text, text, text)
  to anon, authenticated;

commit;
