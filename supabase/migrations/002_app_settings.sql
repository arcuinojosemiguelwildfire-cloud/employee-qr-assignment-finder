-- ============================================================================
-- Employee QR Assignment Finder — Supabase migration 002: app_settings
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor, AFTER 001_initial_schema.sql
-- (it reuses `is_valid_admin_key()` and `set_updated_at()` defined there).
-- It has NOT been executed against any live database by the assistant — no
-- Supabase project credentials were available at the time this file was
-- written. Review it before running.
--
-- Purpose: a single, global, event-wide "TBC Mode" flag (see
-- src/services/appSettingsService.ts). This is a display-only override —
-- turning it on/off NEVER touches the `employees` table. The actual
-- mem_group/tables values are never read, written, or overwritten by this
-- feature; only what the PUBLIC result page renders changes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. app_settings — a singleton row (id is always `true`, enforced by the
--    check constraint) so there is exactly one global settings record, ever.
--    Deliberately narrow/typed (a `tbc_mode boolean` column) rather than a
--    generic key/value store — the simplest safe shape for the one setting
--    actually needed right now.
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  id          boolean primary key default true,
  tbc_mode    boolean not null default false,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

comment on table public.app_settings is
  'Global, event-wide application settings — currently just tbc_mode. '
  'Always exactly one row (id = true). Display-only: toggling tbc_mode '
  'never reads, writes, or overwrites anything in public.employees.';

insert into public.app_settings (id, tbc_mode)
values (true, false)
on conflict (id) do nothing;

-- Reuses the same updated_at trigger function from 001_initial_schema.sql.
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row
  execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 2. Row Level Security — same pattern as `employees`: RLS enabled, all
--    direct grants revoked from anon/authenticated. The ONLY sanctioned
--    read path is the public RPC below; the only write path is the
--    admin-key-gated RPC below it.
-- ----------------------------------------------------------------------------
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. Public read RPC — safe to expose to anyone: a single non-sensitive
--    boolean, nothing employee-specific. No admin key required, since the
--    public assignment result needs this on every lookup with no
--    authentication of its own.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_app_settings()
returns table (tbc_mode boolean)
language sql
security definer
set search_path = public
stable
as $$
  select tbc_mode from public.app_settings where id = true;
$$;

grant execute on function public.get_public_app_settings() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Admin write RPC — reuses the SAME admin-passphrase gate as the
--    admin_* employee RPCs in 001_initial_schema.sql (is_valid_admin_key).
--    Updates ONLY app_settings.tbc_mode — never touches public.employees.
-- ----------------------------------------------------------------------------
create or replace function public.admin_set_tbc_mode(p_admin_key text, p_enabled boolean)
returns table (tbc_mode boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_valid_admin_key(p_admin_key) then
    raise exception 'Invalid admin credentials';
  end if;

  update public.app_settings set tbc_mode = p_enabled where id = true;

  return query select app_settings.tbc_mode from public.app_settings where id = true;
end;
$$;

grant execute on function public.admin_set_tbc_mode(text, boolean) to anon, authenticated;
