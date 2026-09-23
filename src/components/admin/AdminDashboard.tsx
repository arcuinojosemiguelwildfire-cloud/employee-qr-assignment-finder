import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  LogOut,
  ArrowLeft,
  Users,
  CheckCircle2,
  RotateCcw,
  X,
  FileSpreadsheet,
  History,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ClipboardCheck,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeAssignment } from '../../types';
import { employeeStore } from '../../services/employeeStore';
import { supabaseEmployeeService } from '../../services/supabaseEmployeeService';
import { appSettingsService } from '../../services/appSettingsService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { adminAuth } from '../../services/adminAuth';
import {
  normalizeDisplayName,
  normalizePriorityGroupKey,
  PRIORITY_GROUP_DISPLAY_LABELS,
  PRIORITY_GROUP_SUMMARY_ORDER,
} from '../../data/seedEmployees';
import { EmployeeModal } from './EmployeeModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { XlsxImportModal } from './XlsxImportModal';
import { BackupsModal } from './BackupsModal';
import { EmployeeVerificationModal } from './EmployeeVerificationModal';

interface AdminDashboardProps {
  onBackToPublic: () => void;
  onLogout: () => void;
}

type LoadState = 'loading' | 'loaded' | 'error';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToPublic,
  onLogout,
}) => {
  // PHASE 9 (Supabase migration): the Admin Dashboard now owns fetching its
  // own employee list — it is no longer handed down as a prop from App.tsx
  // (see App.tsx's note on why the public flow must never fetch the full
  // list). When Supabase is configured, this reads the SHARED dataset via
  // the admin_list_employees RPC (admin-key protected — see
  // supabase/migrations/001_initial_schema.sql). If Supabase is not
  // configured, it falls back to the local employeeStore (localStorage) so
  // the dashboard still works during local development before the two
  // VITE_SUPABASE_* env vars are set.
  const [employees, setEmployees] = useState<EmployeeAssignment[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    employee: EmployeeAssignment | null;
  }>({
    isOpen: false,
    mode: 'add',
    employee: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAssignment | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBackupsModalOpen, setIsBackupsModalOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);

  // Global "TBC Mode" — a display-only override for the PUBLIC assignment
  // result (see appSettingsService.ts). Never reads/writes any employee
  // record; this dashboard's own employee table always shows real values
  // regardless of this setting.
  const [tbcMode, setTbcMode] = useState<boolean>(false);
  const [isTbcLoading, setIsTbcLoading] = useState<boolean>(true);
  const [isTbcToggling, setIsTbcToggling] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    appSettingsService.getTbcMode().then((value) => {
      if (!cancelled) {
        setTbcMode(value);
        setIsTbcLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleTbcMode = async () => {
    setIsTbcToggling(true);
    const nextValue = !tbcMode;
    const adminKey = adminAuth.getAdminKey() || '';
    const result = await appSettingsService.setTbcMode(adminKey, nextValue);
    setIsTbcToggling(false);

    if (result.success) {
      setTbcMode(result.tbcMode ?? nextValue);
      showToast(
        (result.tbcMode ?? nextValue)
          ? 'TBC Mode enabled — public results will show "TBC" for MEM Group and Tables.'
          : 'TBC Mode disabled — public results will show actual MEM Group and Tables again.'
      );
    } else {
      showToast(result.error || 'Failed to update TBC Mode.');
    }
  };

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const fetchEmployees = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);

    if (isSupabaseConfigured) {
      try {
        const adminKey = adminAuth.getAdminKey() || '';
        const list = await supabaseEmployeeService.getAll(adminKey);
        setEmployees(list);
        setUsingLocalFallback(false);
        setLoadState('loaded');
        return;
      } catch (err: any) {
        console.error('Failed to load employees from Supabase:', err);
        setLoadError(err?.message || 'Unable to reach the shared employee database.');
        setLoadState('error');
        return;
      }
    }

    // Supabase not configured — local fallback (development only)
    try {
      const list = employeeStore.getAll();
      setEmployees(list);
      setUsingLocalFallback(true);
      setLoadState('loaded');
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load employee data.');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Dynamically computed MEM Priority Group counts for the summary cards.
  // Recalculated from the live `employees` list on every render — never hardcoded —
  // so it always reflects the currently imported dataset. Known label variants
  // (e.g. "Digital Transformation" vs "DT", "High Perf Teams" vs "HP Teams") are
  // normalized to one canonical group so counts aren't silently split in two.
  const groupSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of PRIORITY_GROUP_SUMMARY_ORDER) counts[key] = 0;
    for (const emp of employees) {
      const canonicalKey = normalizePriorityGroupKey(emp.mem_priority_group);
      if (canonicalKey && canonicalKey in counts) {
        counts[canonicalKey] += 1;
      }
    }
    return counts;
  }, [employees]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const displayName = (emp.name || emp.employee_name || '').toLowerCase();
      const tablesStr = (emp.tables || []).join(' ').toLowerCase();
      return (
        emp.employee_number.toLowerCase().includes(q) ||
        displayName.includes(q) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.mem_group && emp.mem_group.toLowerCase().includes(q)) ||
        (emp.mem_priority_group && emp.mem_priority_group.toLowerCase().includes(q)) ||
        tablesStr.includes(q)
      );
    });
  }, [employees, searchQuery]);

  const handleOpenAdd = () => {
    setModalState({
      isOpen: true,
      mode: 'add',
      employee: null,
    });
  };

  const handleOpenEdit = (emp: EmployeeAssignment) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      employee: emp,
    });
  };

  const handleSave = async (data: {
    employee_number: string;
    name: string;
    email?: string;
    // Optional — an employee may legitimately have no MEM Group/Priority
    // Group and/or no Table (e.g. "Unassigned" but still has a table, or
    // vice versa). Never required.
    mem_group?: string;
    mem_priority_group?: string;
    tables?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const tablesArray = (data.tables || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isSupabaseConfigured && !usingLocalFallback) {
      const adminKey = adminAuth.getAdminKey() || '';
      const result =
        modalState.mode === 'add'
          ? await supabaseEmployeeService.add(adminKey, { ...data, tables: tablesArray })
          : await supabaseEmployeeService.update(
              adminKey,
              modalState.employee?.employee_number || '',
              { ...data, tables: tablesArray, excel_row: modalState.employee?.excel_row }
            );

      if (result.success) {
        showToast(
          modalState.mode === 'add'
            ? 'Employee added successfully.'
            : 'Employee information updated successfully.'
        );
        await fetchEmployees();
      }
      return { success: result.success, error: result.error };
    }

    // Local fallback (Supabase not configured)
    if (modalState.mode === 'add') {
      const result = employeeStore.add(data);
      if (result.success) {
        showToast('Employee added successfully.');
        await fetchEmployees();
      }
      return result;
    } else if (modalState.mode === 'edit' && modalState.employee) {
      const result = employeeStore.update(modalState.employee.id || '', data);
      if (result.success) {
        showToast('Employee information updated successfully.');
        await fetchEmployees();
      }
      return result;
    }
    return { success: false, error: 'Unknown action' };
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (isSupabaseConfigured && !usingLocalFallback) {
      const adminKey = adminAuth.getAdminKey() || '';
      const result = await supabaseEmployeeService.delete(adminKey, deleteTarget.employee_number);
      if (result.success) {
        showToast('Employee deleted successfully.');
        await fetchEmployees();
      } else {
        showToast(result.error || 'Failed to delete employee.');
      }
      setDeleteTarget(null);
      return;
    }

    const result = employeeStore.delete(deleteTarget.id || '');
    if (result.success) {
      showToast('Employee deleted successfully.');
      await fetchEmployees();
    }
    setDeleteTarget(null);
  };

  const handleResetData = () => {
    // Deliberately LOCAL-ONLY: this resets the local fallback copy used
    // when Supabase isn't configured. It intentionally never touches the
    // shared Supabase dataset — resetting live production event data back
    // to a single sample employee from this button would be destructive
    // and is out of scope for this migration.
    const confirmMessage = isSupabaseConfigured
      ? 'Reset the LOCAL fallback copy back to default sample data? This does NOT affect the shared Supabase dataset other devices see.'
      : 'Reset all employee records back to default sample dataset?';
    if (window.confirm(confirmMessage)) {
      employeeStore.resetToDefaults();
      if (usingLocalFallback) {
        fetchEmployees();
      }
      showToast('Reset the local fallback copy to default sample employee records.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Toast notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xl shadow-emerald-900/20 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Nav / Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={onBackToPublic}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Lookup</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Employee Assignment Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage attendee MEM group, priority group, and table placements in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="verify-data-button"
            onClick={() => setIsVerificationModalOpen(true)}
            title="Verify Employee Numbers against the current dataset"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Verify Data</span>
          </button>

          <button
            type="button"
            id="backups-button"
            onClick={() => setIsBackupsModalOpen(true)}
            title="View JSON backups and snapshots"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Backups</span>
          </button>

          <button
            type="button"
            onClick={handleResetData}
            title="Reset to default sample data"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* TBC Mode — global, event-wide switch. Display-only override for the
          PUBLIC assignment result (see appSettingsService.ts); never
          touches any employee record. Placed near the other event/system
          controls above. */}
      <div className="mb-5 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              tbcMode ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">TBC Mode</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isTbcLoading
                ? 'Loading current setting...'
                : tbcMode
                ? 'ON — MEM Group & Tables = TBC on the public result'
                : 'OFF — Normal Assignment Values'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="tbc-mode-toggle"
          role="switch"
          aria-checked={tbcMode}
          aria-label="Toggle TBC Mode"
          onClick={handleToggleTbcMode}
          disabled={isTbcLoading || isTbcToggling}
          className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            tbcMode ? 'bg-amber-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              tbcMode ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Data source notice: only shown when NOT reading the shared Supabase
          dataset, so it's always obvious when the admin is looking at a
          local-only, per-device copy rather than the shared production data. */}
      {usingLocalFallback && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Supabase is not configured — showing local device data only</p>
            <p className="text-amber-800 mt-0.5">
              Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to read/write the shared employee
              dataset that all devices see. Until then, this view reflects only this browser's
              local data.
            </p>
          </div>
        </div>
      )}

      {/* MEM Priority Group Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {PRIORITY_GROUP_SUMMARY_ORDER.map((key) => (
          <div
            key={key}
            id={`group-summary-${key.toLowerCase().replace(/\s+/g, '-')}`}
            className="bg-white/95 rounded-2xl p-4 shadow-md shadow-slate-200/50 border border-slate-100 text-center"
          >
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {PRIORITY_GROUP_DISPLAY_LABELS[key]}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-900 mt-1.5">
              {groupSummary[key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Main Admin Panel Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/60 border border-slate-100">

        {/* Metric & Primary Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">

          {/* Total Employees Metric */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Employees
              </p>
              <p className="text-xl font-extrabold text-slate-900">
                {loadState === 'loading' ? '—' : employees.length.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Upload Client XLSX */}
            <button
              type="button"
              id="upload-xlsx-button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 active:scale-[0.99] transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Upload Client XLSX</span>
            </button>

            {/* + ADD EMPLOYEE CTA */}
            <button
              type="button"
              id="add-employee-button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ ADD EMPLOYEE</span>
            </button>
          </div>
        </div>

        {/* Search Filter Bar */}
        <div className="py-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by number, name, email, MEM group, table..."
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && loadState === 'loaded' && (
            <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
              Found {filteredEmployees.length} matching {filteredEmployees.length === 1 ? 'employee' : 'employees'}
            </p>
          )}
        </div>

        {/* Loading state */}
        {loadState === 'loading' && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Loading employee data...</p>
          </div>
        )}

        {/* Network / RPC error state */}
        {loadState === 'error' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Couldn't load employee data</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchEmployees()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Responsive Employee Table — horizontal scroll is expected/acceptable on small screens.
            Email is intentionally not shown here (still retained internally for import/data
            integrity); the main admin view focuses on Employee Number, Name, MEM Group,
            MEM Priority Group, Table Number, and Excel Row. */}
        {loadState === 'loaded' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Employee Number</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">MEM Group</th>
                  <th className="py-3 px-4">MEM Priority Group</th>
                  <th className="py-3 px-4">Table Number</th>
                  <th className="py-3 px-4">Excel Row</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      <p className="text-sm font-semibold">No employees found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery
                          ? 'Try changing your search terms.'
                          : employees.length === 0
                          ? 'No employees yet — upload a Client XLSX or add one manually using the buttons above.'
                          : 'Add your first employee using the button above.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const displayName = normalizeDisplayName(emp.name || emp.employee_name || '');
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-900 whitespace-nowrap">
                          {emp.employee_number}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {displayName}
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.mem_group ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {emp.mem_group}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic font-sans">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.mem_priority_group ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {emp.mem_priority_group}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic font-sans">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {emp.tables && emp.tables.length > 0 ? (
                              emp.tables.map((t, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100 whitespace-nowrap"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {emp.excel_row != null ? (
                            <span
                              title="Original row number from the MEM Grouping worksheet — never recalculated after import"
                            >
                              {emp.excel_row}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic font-sans">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              id={`edit-btn-${emp.employee_number}`}
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                              title="Edit employee"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              id={`delete-btn-${emp.employee_number}`}
                              onClick={() => setDeleteTarget(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete employee"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Sync note */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>
            {usingLocalFallback
              ? 'Local-only mode: changes are saved to this device only until Supabase is configured.'
              : 'Any addition, edit, or deletion is saved to the shared database and immediately available to attendees scanning the QR code.'}
          </p>
        </div>

      </div>

      {/* Modal for Add / Edit */}
      <EmployeeModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialEmployee={modalState.employee}
        onClose={() => setModalState({ isOpen: false, mode: 'add', employee: null })}
        onSave={handleSave}
      />

      {/* Confirmation Modal for Delete */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        employee={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* XLSX Batch Import Modal */}
      <XlsxImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={(count) => {
          showToast(`Successfully imported ${count.toLocaleString()} employees from Excel.`);
          fetchEmployees();
        }}
      />

      {/* JSON Backups & Recovery Modal */}
      <BackupsModal
        isOpen={isBackupsModalOpen}
        onClose={() => setIsBackupsModalOpen(false)}
        onRestored={() => {
          showToast('Local fallback dataset restored from backup snapshot.');
          if (usingLocalFallback) {
            fetchEmployees();
          }
        }}
      />

      {/* Employee Data Verification (read-only) — reuses the same
          already-loaded `employees` list, no extra Supabase query. */}
      <EmployeeVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        employees={employees}
        onRefresh={fetchEmployees}
      />
    </div>
  );
};
