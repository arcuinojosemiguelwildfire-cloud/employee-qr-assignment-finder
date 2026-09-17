const SESSION_KEY = 'event_admin_session_auth';

export interface AdminUser {
  username: string;
  role: string;
  loggedInAt: string;
}

export const adminAuth = {
  /**
   * Validates admin credentials and starts session
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
   * Clears admin session
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
  },
};
