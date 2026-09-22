import React, { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  Download, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  FileJson,
  Clock
} from 'lucide-react';
import { EmployeeBackup } from '../../types';
import { employeeStore } from '../../services/employeeStore';

interface BackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const BackupsModal: React.FC<BackupsModalProps> = ({
  isOpen,
  onClose,
  onRestored,
}) => {
  const [backups, setBackups] = useState<EmployeeBackup[]>([]);
  const [confirmRestoreTarget, setConfirmRestoreTarget] = useState<EmployeeBackup | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBackups(employeeStore.getBackups());
      setStatusMessage(null);
      setConfirmRestoreTarget(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = (backup: EmployeeBackup) => {
    const jsonStr = JSON.stringify(backup.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.fileName || `backup-${backup.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCurrent = () => {
    const jsonStr = employeeStore.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `current_employees_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecuteRestore = () => {
    if (!confirmRestoreTarget) return;

    const result = employeeStore.restoreBackup(confirmRestoreTarget.id);
    if (result.success) {
      setStatusMessage(`Restored ${result.count} records from backup successfully.`);
      setBackups(employeeStore.getBackups());
      setConfirmRestoreTarget(null);
      onRestored();
    } else {
      setStatusMessage(result.error || 'Failed to restore backup.');
    }
  };

  const handleDelete = (backupId: string) => {
    employeeStore.deleteBackup(backupId);
    setBackups(employeeStore.getBackups());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                JSON Backups & Data Recovery
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Automatic safety snapshots generated before batch imports and updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Confirm Restore Banner */}
          {confirmRestoreTarget && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Confirm Database Rollback</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Are you sure you want to restore the backup from{' '}
                    <strong className="font-mono text-slate-900">
                      {new Date(confirmRestoreTarget.timestamp).toLocaleString()}
                    </strong>{' '}
                    containing {confirmRestoreTarget.employeeCount} records? Current data will be replaced.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                >
                  Restore This Backup
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-700">
              Saved Snapshots ({backups.length})
            </span>
            <button
              type="button"
              onClick={handleDownloadCurrent}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Active JSON</span>
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">No backups saved yet</p>
              <p className="text-[11px] text-slate-400">
                Backups are created automatically before every Excel import or can be exported anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {backups.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-mono font-bold text-slate-900">
                        {b.fileName || `backup-${b.id}.json`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                        {b.employeeCount} records
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>{new Date(b.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="text-slate-600">{b.reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Download JSON file"
                      onClick={() => handleDownload(b)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Restore data from this snapshot"
                      onClick={() => setConfirmRestoreTarget(b)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete this snapshot"
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
