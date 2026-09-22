import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client for the browser (anon/public key ONLY — never the
 * service-role key, which must never ship to frontend code).
 *
 * Reads from Vite's `import.meta.env`, which only exposes variables prefixed
 * with `VITE_` to client code (see vite.config.ts — no custom envPrefix is
 * set, so this is Vite's default, correct behavior). Configure these in:
 *   - `.env.local` for local development (gitignored, never committed)
 *   - Vercel Project Settings → Environment Variables for production/preview
 *
 * Required variables:
 *   VITE_SUPABASE_URL       — the project's public API URL
 *   VITE_SUPABASE_ANON_KEY  — the project's public anon key (safe for the
 *                             browser; Row Level Security is what actually
 *                             protects the data, not secrecy of this key)
 *
 * This module intentionally never throws at import time if the variables are
 * missing (e.g. during a build with no env configured yet, or before the
 * migration is fully wired up) — `supabase` is `null` and
 * `isSupabaseConfigured` is `false` in that case, so callers can fall back
 * to the existing localStorage-backed employeeStore instead of crashing the
 * whole app. See src/services/lookupService.ts and
 * src/services/supabaseEmployeeService.ts for how that fallback is used.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Falling back to the local employeeStore (localStorage) until Supabase is configured.'
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // No end-user Supabase Auth session is used yet — the public app only
        // ever calls the read-only RPC below with the anon key. Admin write
        // access continues to rely on the existing app-level admin gate
        // (see PHASE 5 note in the migration SQL / final report re: RLS
        // limitations of this interim state).
        persistSession: false,
      },
    })
  : null;
