import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { BackgroundDecoration } from './components/BackgroundDecoration';
import { SearchForm } from './components/SearchForm';
import { AssignmentResult } from './components/AssignmentResult';
import { QrCodeModal } from './components/QrCodeModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { lookupEmployeeAssignment } from './services/lookupService';
import { adminAuth, AdminUser } from './services/adminAuth';
import { EmployeeAssignment } from './types';

export default function App() {
  // Public finder states
  const [assignment, setAssignment] = useState<EmployeeAssignment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  // Global "TBC Mode" flag, read fresh with every lookup (see
  // lookupService.ts / appSettingsService.ts) — display-only, never
  // touches the underlying employee record.
  const [tbcMode, setTbcMode] = useState<boolean>(false);

  // View routing & Admin session
  const [currentView, setCurrentView] = useState<'public' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('admin')) {
      return 'admin';
    }
    return 'public';
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => adminAuth.getCurrentUser());

  // NOTE (Supabase migration, PHASE 11 privacy requirement): the full
  // employee list is intentionally NOT fetched here anymore. It used to be
  // loaded unconditionally on every app load (public or admin) via
  // employeeStore.getAll() — harmless when that just read localStorage, but
  // once employee data lives in Supabase, unconditionally fetching "all
  // employees" on every public visit would mean shipping the entire
  // dataset to every phone that just wants to look up ONE employee number.
  // AdminDashboard now owns fetching its own list (Supabase admin RPC),
  // only when currentView === 'admin'. The public search/lookup path never
  // requests more than the single matching record (see lookupService.ts).

  // Sync hash routing if user manually navigates to #/admin or #/
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes('admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('public');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSearch = async (employeeNumber: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await lookupEmployeeAssignment(employeeNumber);
      if (response.success && response.data) {
        setAssignment(response.data);
        setTbcMode(Boolean(response.tbcMode));
      } else {
        setErrorMessage(
          response.message || 'Employee number not found. Please check your employee number and try again.'
        );
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchAgain = () => {
    setAssignment(null);
    setErrorMessage(null);
  };

  // Note: the admin dashboard remains reachable directly via the "#/admin" URL
  // (see the hashchange listener and initial-state check above). There is
  // intentionally no public-facing button/link into it anymore — see navigateToPublic
  // below for the only in-app navigation still used (returning from the admin views).
  const navigateToPublic = () => {
    setCurrentView('public');
    window.location.hash = '';
  };

  const handleAdminLogout = () => {
    adminAuth.logout();
    setAdminUser(null);
    navigateToPublic();
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Decorative Brand Background */}
      <BackgroundDecoration />

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {currentView === 'admin' ? (
            !adminUser ? (
              <AdminLogin
                key="admin-login"
                onLoginSuccess={() => setAdminUser(adminAuth.getCurrentUser())}
                onBackToPublic={navigateToPublic}
              />
            ) : (
              <AdminDashboard
                key="admin-dashboard"
                onBackToPublic={navigateToPublic}
                onLogout={handleAdminLogout}
              />
            )
          ) : !assignment ? (
            <SearchForm
              key="search-form"
              onSearch={handleSearch}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onClearError={() => setErrorMessage(null)}
            />
          ) : (
            <AssignmentResult
              key="assignment-result"
              assignment={assignment}
              tbcMode={tbcMode}
              onSearchAgain={handleSearchAgain}
              onOpenQrModal={() => setIsQrModalOpen(true)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* QR Code Modal for Camera Testing */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
