import React, { useState, useMemo } from 'react';
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
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeAssignment } from '../../types';
import { employeeStore } from '../../services/employeeStore';
import { EmployeeModal } from './EmployeeModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface AdminDashboardProps {
  employees: EmployeeAssignment[];
  onBackToPublic: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  employees,
  onBackToPublic,
  onLogout,
}) => {
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

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Filter employees based on search query (search by Number, Name, Group, Table, Room)
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      return (
        emp.employee_number.toLowerCase().includes(q) ||
        emp.employee_name.toLowerCase().includes(q) ||
        emp.group_name.toLowerCase().includes(q) ||
        emp.table_name.toLowerCase().includes(q) ||
        emp.room_name.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q))
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

  const handleSave = (data: {
    employee_number: string;
    employee_name: string;
    group_name: string;
    table_name: string;
    room_name: string;
    room_details?: string;
    department?: string;
  }) => {
    if (modalState.mode === 'add') {
      const result = employeeStore.add(data);
      if (result.success) {
        showToast('Employee added successfully.');
      }
      return result;
    } else if (modalState.mode === 'edit' && modalState.employee) {
      const result = employeeStore.update(modalState.employee.id, data);
      if (result.success) {
        showToast('Employee information updated successfully.');
      }
      return result;
    }
    return { success: false, error: 'Unknown action' };
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const result = employeeStore.delete(deleteTarget.id);
    if (result.success) {
      showToast('Employee deleted successfully.');
    }
    setDeleteTarget(null);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all employee records back to default sample dataset?')) {
      employeeStore.resetToDefaults();
      showToast('Reset to default sample employee records.');
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
            Manage attendee group, table, and room placements in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetData}
            title="Reset to default sample data"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
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
                {employees.length.toLocaleString()}
              </p>
            </div>
          </div>

          {/* + ADD EMPLOYEE CTA */}
          <button
            type="button"
            id="add-employee-button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ ADD EMPLOYEE</span>
          </button>
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
              placeholder="Search employee by number, name, group, table, room..."
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
          {searchQuery && (
            <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
              Found {filteredEmployees.length} matching {filteredEmployees.length === 1 ? 'employee' : 'employees'}
            </p>
          )}
        </div>

        {/* Responsive Employee Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Employee No.</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <p className="text-sm font-semibold">No employees found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery ? 'Try changing your search terms.' : 'Add your first employee using the button above.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">
                      {emp.employee_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.employee_name}</div>
                      {emp.department && (
                        <div className="text-[11px] text-slate-600 font-normal">{emp.department}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {emp.group_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100">
                        {emp.table_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{emp.room_name}</div>
                      {emp.room_details && (
                        <div className="text-[11px] text-slate-600 font-normal truncate max-w-[150px]">
                          {emp.room_details}
                        </div>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sync note */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>
            Any addition, edit, or deletion is automatically synchronized and immediately available to attendees scanning the QR code.
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
    </div>
  );
};
