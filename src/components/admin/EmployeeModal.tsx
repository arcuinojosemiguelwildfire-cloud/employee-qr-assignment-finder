import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeAssignment } from '../../types';

interface EmployeeModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialEmployee?: EmployeeAssignment | null;
  onClose: () => void;
  onSave: (data: {
    employee_number: string;
    name: string;
    email?: string;
    mem_group: string;
    mem_priority_group: string;
    tables: string;
  }) => { success: boolean; error?: string };
}

const PRIORITY_GROUP_OPTIONS = ['Growth', 'Efficiency', 'DT', 'HP Teams'];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  mode,
  initialEmployee,
  onClose,
  onSave,
}) => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [memGroup, setMemGroup] = useState('');
  const [memPriorityGroup, setMemPriorityGroup] = useState('');
  const [tablesInput, setTablesInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialEmployee) {
        setEmployeeNumber(initialEmployee.employee_number);
        setName(initialEmployee.name || initialEmployee.employee_name || '');
        setEmail(initialEmployee.email || '');
        setMemGroup(initialEmployee.mem_group || '');
        setMemPriorityGroup(initialEmployee.mem_priority_group || '');
        setTablesInput(
          initialEmployee.tables && initialEmployee.tables.length > 0
            ? initialEmployee.tables.join(', ')
            : ''
        );
      } else {
        setEmployeeNumber('');
        setName('');
        setEmail('');
        setMemGroup('');
        setMemPriorityGroup('');
        setTablesInput('');
      }
      setError(null);
    }
  }, [isOpen, mode, initialEmployee]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = onSave({
      employee_number: employeeNumber,
      name,
      email: email.trim() || undefined,
      mem_group: memGroup,
      mem_priority_group: memPriorityGroup,
      tables: tablesInput,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save employee record.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {mode === 'add' ? 'New Record' : 'Modify Record'}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2">
              {mode === 'add' ? 'Add Employee Assignment' : 'Edit Employee'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter the MEM grouping details for this attendee.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                Employee Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 11248494"
                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Donnel Jun Tiedra"
                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. asd.sas@ph.nestle.com"
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                  MEM Group <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memGroup}
                  onChange={(e) => setMemGroup(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                  MEM Priority Group <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="priority-group-list"
                  value={memPriorityGroup}
                  onChange={(e) => setMemPriorityGroup(e.target.value)}
                  placeholder="e.g. Efficiency"
                  className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                />
                <datalist id="priority-group-list">
                  {PRIORITY_GROUP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-0.5">
                Table # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={tablesInput}
                onChange={(e) => setTablesInput(e.target.value)}
                placeholder="e.g. Table 3,6,8,9,12 or Table 12"
                className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1 pl-0.5">
                Multiple tables can be separated by commas (e.g. "Table 3,6,8,9,12" or "3, 6, 8").
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-employee-button"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 active:scale-95 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {mode === 'add' ? 'SAVE EMPLOYEE' : 'SAVE CHANGES'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
