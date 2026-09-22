const SESSION_KEY = 'event_admin_session_auth';
// Separate key so the passphrase never ends up wherever AdminUser objects
// get logged/displayed. Session-scoped only (cleared on logout/tab close),
// same trust boundary as the rest of the admin session.
const ADMIN_KEY_SESSION_KEY = 'event_admin_session_key';

export interface AdminUser {
  username: string;
  role: string;
  loggedInAt: string;
}

export const adminAuth = {
  /**
   * Validates admin credentials and starts session.
   *
   * Also retains the validated passphrase for this session (see
   * getAdminKey()) — the Supabase migration's admin_* RPCs
   * (supabase/migrations/001_initial_schema.sql) re-check this SAME
   * passphrase server-side before allowing any write to the shared
   * employee dataset, since the browser only ever holds the public anon
   * key. The login screen/flow itself is unchanged.
   */
  login(usernameInput: string, passwordInput: string): { success: boolean; user?: AdminUser; error?: string } {
    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    // Default event administration credentials
    const validUser = 'admin';
    const validPass = 'admin2026';

    if (!trimmedUser || !trimmedPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    if (trimmedUser === validUser && (trimmedPass === validPass || trimmedPass === 'admin123')) {
      const user: AdminUser = {
        username: validUser,
        role: 'Event Administrator',
        loggedInAt: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        sessionStorage.setItem(ADMIN_KEY_SESSION_KEY, trimmedPass);
      }
      return { success: true, user };
    }

    return { success: false, error: 'Invalid username or password. Please try again.' };
  },

  /**
   * Retrieves current authenticated admin session if valid
   */
  getCurrentUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw) as AdminUser;
      }
    } catch {}
    return null;
  },

  /**
   * Returns the passphrase for the current admin session, to pass as
   * `p_admin_key` to the Supabase admin_* RPCs. Null if not logged in.
   */
  getAdminKey(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(ADMIN_KEY_SESSION_KEY);
  },

  /**
   * Clears admin session
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(ADMIN_KEY_SESSION_KEY);
    }
  },
};
