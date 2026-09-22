import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Global, event-wide "TBC Mode" setting.
 *
 * When ON, the PUBLIC assignment result displays "TBC" for MEM Group and
 * Tables instead of the employee's real values — this is a display-only
 * override. It is a global flag, not per-employee: it is read fresh on
 * every public lookup (see lookupService.ts) and never cached stale across
 * a toggle. Turning it on/off NEVER reads, writes, or overwrites anything
 * in the `employees` table — see supabase/migrations/002_app_settings.sql.
 *
 * Same dual-path pattern as the rest of the app (supabaseEmployeeService.ts):
 * Supabase is the source of truth when configured; a localStorage fallback
 * keeps the toggle usable (single-device only, clearly not "global" in that
 * case) when Supabase isn't configured/reachable, e.g. before migration
 * 002 has been run, or during local development with no env vars set.
 */

const LOCAL_FALLBACK_KEY = 'nestle_mem_tbc_mode_local_fallback';

function readLocalFallback(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(LOCAL_FALLBACK_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeLocalFallback(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, String(enabled));
  } catch {
    // ignore — worst case the toggle doesn't persist across reloads locally
  }
}

export const appSettingsService = {
  /**
   * Public read — safe to call with no authentication. Used by BOTH the
   * public lookup (lookupService.ts, on every search) and the Admin
   * dashboard (to show the toggle's current state).
   */
  async getTbcMode(): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_public_app_settings');
        if (error) throw error;
        const rows = (data || []) as { tbc_mode: boolean }[];
        if (rows.length > 0) return Boolean(rows[0].tbc_mode);
      } catch (err) {
        console.error('Failed to read TBC Mode from Supabase, using local fallback:', err);
      }
    }
    return readLocalFallback();
  },

  /**
   * Admin write — requires the same admin passphrase as the other admin_*
   * RPCs (see adminAuth.getAdminKey()). Updates ONLY the global tbc_mode
   * flag; never touches any employee record.
   */
  async setTbcMode(adminKey: string, enabled: boolean): Promise<{ success: boolean; tbcMode?: boolean; error?: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('admin_set_tbc_mode', {
          p_admin_key: adminKey,
          p_enabled: enabled,
        });
        if (error) throw error;
        const rows = (data || []) as { tbc_mode: boolean }[];
        const resultValue = rows.length > 0 ? Boolean(rows[0].tbc_mode) : enabled;
        return { success: true, tbcMode: resultValue };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update TBC Mode.' };
      }
    }

    // Local fallback (Supabase not configured / migration not applied yet)
    writeLocalFallback(enabled);
    return { success: true, tbcMode: enabled };
  },
};
