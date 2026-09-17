import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { BackgroundDecoration } from './components/BackgroundDecoration';
import { SearchForm } from './components/SearchForm';
import { AssignmentResult } from './components/AssignmentResult';
import { QrCodeModal } from './components/QrCodeModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { lookupEmployeeAssignment } from './services/lookupService';
import { employeeStore } from './services/employeeStore';
import { adminAuth, AdminUser } from './services/adminAuth';
import { EmployeeAssignment } from './types';

export default function App() {
  // Public finder states
  const [assignment, setAssignment] = useState<EmployeeAssignment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // View routing & Admin session
  const [currentView, setCurrentView] = useState<'public' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('admin')) {
      return 'admin';
    }
    return 'public';
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => adminAuth.getCurrentUser());
  const [employees, setEmployees] = useState<EmployeeAssignment[]>(() => employeeStore.getAll());

  // Listen to employee store modifications to keep both views perfectly synchronized
  useEffect(() => {
    const unsubscribe = employeeStore.subscribe((updated) => {
      setEmployees(updated);
      // If the currently viewed public assignment was updated, sync it live
      if (assignment) {
        const fresh = updated.find((e) => String(e.id) === String(assignment.id));
        if (fresh) {
          setAssignment(fresh);
        }
      }
    });
    return unsubscribe;
  }, [assignment]);

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

  const navigateToAdmin = () => {
    setCurrentView('admin');
    window.location.hash = '/admin';
  };

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
                employees={employees}
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
              onSearchAgain={handleSearchAgain}
              onOpenQrModal={() => setIsQrModalOpen(true)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-600 px-4">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          
          {currentView === 'public' && (
            <button
              type="button"
              id="admin-access-link"
              onClick={navigateToAdmin}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors py-1 px-2 rounded-md hover:bg-slate-200/50 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Admin Access</span>
            </button>
          )}
        </div>
      </footer>

      {/* QR Code Modal for Camera Testing */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}
