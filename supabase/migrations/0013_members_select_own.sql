-- Allow members to read their own membership rows directly.
-- Avoids PostgREST 406 / empty results when checking membership right after signup.

begin;

drop policy if exists "members_select_own" on public.business_members;
create policy "members_select_own" on public.business_members
for select using (user_id = auth.uid());

commit;
