import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeAssignment } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  employee: EmployeeAssignment | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  employee,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !employee) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-10 text-center"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            Delete this employee assignment?
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            This action will immediately remove the attendee from the lookup system.
          </p>

          {/* Attendee details card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6 text-left">
            <p className="text-sm font-bold text-slate-900">{employee.employee_name}</p>
            <p className="text-xs font-mono text-indigo-700 font-semibold mt-0.5">
              {employee.employee_number}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
              <span>{employee.group_name}</span>
              <span>•</span>
              <span>{employee.table_name}</span>
              <span>•</span>
              <span>{employee.room_name}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-button"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
