-- ============================================================================
-- Employee QR Assignment Finder — Supabase migration 003: optional MEM fields
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor, AFTER 001_initial_schema.sql and
-- 002_app_settings.sql. It has NOT been executed against any live database
-- by the assistant — no Supabase project credentials were available at the
-- time this file was written. Review it before running.
--
-- Migration 001 (already executed — do NOT edit it) declared:
--   mem_group           text not null
--   mem_priority_group  text not null
--
-- The client's real XLSX data has "Unassigned" employees with BOTH fields
-- genuinely blank (some of whom still have a Table Number, some of whom
-- don't — the two are independent). This migration removes the NOT NULL
-- constraint on exactly those two columns so such employees can be stored
-- as first-class, valid records instead of being rejected at the database
-- layer.
--
-- This is purely additive/permissive:
--   - Does NOT drop, rename, or retype any column.
--   - Does NOT touch `employee_number`, `name`, `tables`, `excel_row`,
--     `email`, `created_at`, `updated_at`, or any RLS policy/RPC.
--   - Does NOT modify or delete any existing row — every already-imported
--     employee (including the ~6 known "Unassigned" ones, if they were
--     previously forced to carry a placeholder value) keeps its current
--     data exactly as-is. Dropping a NOT NULL constraint never rewrites
--     existing rows.
--   - Safe to re-run: `DROP NOT NULL` on an already-nullable column is a
--     harmless no-op.
-- ============================================================================

alter table public.employees
  alter column mem_group drop not null;

alter table public.employees
  alter column mem_priority_group drop not null;

comment on column public.employees.mem_group is
  'Optional. Blank/NULL for "Unassigned" employees — never require a value.';
comment on column public.employees.mem_priority_group is
  'Optional. Blank/NULL for "Unassigned" employees — never require a value.';
