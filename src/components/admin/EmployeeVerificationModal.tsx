import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  Copy,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { EmployeeAssignment } from '../../types';
import { formatCombinedMemGroup } from '../../data/seedEmployees';
import {
  parsePastedEmployeeNumbers,
  verifyEmployeeIds,
  computeGroupCounts,
  VerificationResult,
} from '../../services/employeeVerificationService';

interface EmployeeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The employee list the Admin Dashboard already has loaded (Supabase when
   * configured, local fallback otherwise) — reused as-is, no extra fetch. */
  employees: EmployeeAssignment[];
  /** Re-runs the SAME fetch the dashboard already uses, for "Refresh Group Counts". */
  onRefresh: () => Promise<void>;
}

/**
 * Admin — Employee Data Verification (READ-ONLY).
 *
 * Lets the admin paste Employee Numbers copied straight out of the client's
 * Excel file and see which ones already exist in the current employee
 * dataset and which are missing, plus a Group Count Verification table
 * comparing the current dataset's MEM Priority Group + MEM Group
 * distribution against known reference counts from the source Excel file.
 *
 * This component NEVER inserts, updates, or deletes anything — it only
 * reads the `employees` list already fetched by AdminDashboard (via
 * supabaseEmployeeService.getAll(), the same admin RPC the main table
 * already uses) and compares it against pasted text in memory. No new
 * Supabase query is made for the ID-verification part; "Refresh Group
 * Counts" simply re-runs the dashboard's existing fetch so both this modal
 * and the main table pick up the newest data.
 */
export const EmployeeVerificationModal: React.FC<EmployeeVerificationModalProps> = ({
  isOpen,
  onClose,
  employees,
  onRefresh,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Group Count Verification is independent of the pasted-ID workflow — it
  // always reflects the CURRENT employee dataset, recomputed whenever
  // `employees` changes (e.g. after "Refresh Group Counts").
  const groupCounts = useMemo(() => computeGroupCounts(employees), [employees]);

  if (!isOpen) return null;

  const handleVerify = () => {
    const entries = parsePastedEmployeeNumbers(pastedText);
    setResult(verifyEmployeeIds(entries, employees));
    setCopiedMissing(false);
  };

  const handleClear = () => {
    setPastedText('');
    setResult(null);
    setCopiedMissing(false);
  };

  const handleCopyMissing = async () => {
    if (!result || result.missingIds.length === 0) return;
    const text = result.missingIds.join('\n');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedMissing(true);
      setTimeout(() => setCopiedMissing(false), 2500);
    } catch {
      setCopiedMissing(true);
      setTimeout(() => setCopiedMissing(false), 2500);
    }
  };

  const handleRefreshGroupCounts = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDiff = (diff: number | null) => {
    if (diff == null) return <span className="text-slate-300">—</span>;
    if (diff === 0) return <span className="text-emerald-600 font-bold">0</span>;
    return (
      <span className={diff > 0 ? 'text-indigo-600 font-bold' : 'text-rose-600 font-bold'}>
        {diff > 0 ? `+${diff}` : diff}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Employee Data Verification
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Read-only — compares Excel Employee Numbers against the current dataset
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Paste / Verify section */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Paste Employee Numbers from Excel
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                One per line (or separated by tabs/spaces) — copy a column straight out of Excel and paste it here.
              </p>
              <textarea
                id="verification-paste-textarea"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                placeholder={'11248494\n11248495\n11248496'}
                className="w-full px-3.5 py-3 text-xs sm:text-sm font-mono text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-y"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="verify-employee-ids-button"
                onClick={handleVerify}
                disabled={!pastedText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Verify Employee IDs</span>
              </button>
              <button
                type="button"
                id="clear-verification-button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Verification Summary + results (only after Verify is clicked) */}
          {result && (
            <div className="space-y-5 pt-1 border-t border-slate-100">
              {/* Verification Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total IDs Checked</p>
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {result.totalChecked.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Found in System</p>
                  <p className="text-lg sm:text-xl font-extrabold text-emerald-800">
                    ✓ {result.foundCount.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    result.missingCount > 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold">Missing from System</p>
                  <p className="text-lg sm:text-xl font-extrabold">{result.missingCount.toLocaleString()}</p>
                </div>
                <div
                  className={`p-3 rounded-xl border ${
                    result.duplicates.length > 0
                      ? 'bg-amber-50/60 border-amber-200 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <p className="text-[10px] uppercase font-bold">Duplicate IDs</p>
                  <p className="text-lg sm:text-xl font-extrabold">{result.duplicates.length.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 -mt-2">
                Found + Missing reflect unique IDs only ({result.uniqueCount.toLocaleString()} unique of{' '}
                {result.totalChecked.toLocaleString()} pasted).
              </p>

              {/* Missing from System — the most important section */}
              {result.missingCount > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Missing from System ({result.missingCount})</span>
                    </div>
                    <button
                      type="button"
                      id="copy-missing-ids-button"
                      onClick={handleCopyMissing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedMissing ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Missing IDs</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-rose-200/70 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-rose-100/60 text-rose-900 font-bold uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Employee Number</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {result.missingIds.map((id) => (
                          <tr key={id}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{id}</td>
                            <td className="py-2 px-3 text-rose-700 font-semibold">Missing from System</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Import Problems — only surfaces what's actually recorded.
                      The current system does not persist import audit history
                      (no import_batches/import_rows table), so we say that
                      plainly instead of inventing a reason. */}
                  <div className="mt-3 p-3 rounded-xl bg-white border border-rose-200/70 text-[11px] text-slate-600 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700">Import Problems</p>
                      <p className="mt-0.5">
                        No historical import audit record available for {result.missingCount === 1 ? 'this employee' : 'these employees'}.
                        They are simply not present in the current dataset — this does not by itself mean they were
                        invalid; re-check the source Excel row and re-import if appropriate.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>All pasted Employee Numbers were found in the current dataset.</span>
                </div>
              )}

              {/* Duplicate Employee IDs */}
              {result.duplicates.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Duplicate Employee IDs ({result.duplicates.length})</span>
                  </div>
                  <ul className="space-y-1">
                    {result.duplicates.map((d) => (
                      <li key={d.id} className="text-xs text-amber-900">
                        <span className="font-mono font-bold">{d.id}</span> — appears {d.count} times
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Found Employees */}
              {result.foundCount > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-2">
                    Found Employees ({result.foundCount})
                  </p>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Employee Number</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">MEM Group</th>
                          <th className="py-2.5 px-3">Table Number</th>
                          <th className="py-2.5 px-3">Excel Row</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.foundEmployees.map((emp) => (
                          <tr key={emp.employee_number} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                              {emp.employee_number}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                              {emp.name || emp.employee_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                                {formatCombinedMemGroup(emp.mem_priority_group, emp.mem_group)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {emp.tables && emp.tables.length > 0 ? (
                                  emp.tables.map((t, ti) => (
                                    <span
                                      key={ti}
                                      className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100 whitespace-nowrap"
                                    >
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">None</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {emp.excel_row != null ? emp.excel_row : <span className="text-slate-300 italic font-sans">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Count Verification — independent of the paste workflow,
              always reflects the current dataset. */}
          <div className="pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between flex-wrap gap-2 pt-5 mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Group Count Verification</span>
              </div>
              <button
                type="button"
                id="refresh-group-counts-button"
                onClick={handleRefreshGroupCounts}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isRefreshing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Refresh Group Counts</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">MEM Priority Group</th>
                    <th className="py-2.5 px-3 text-right">MEM Group</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-right">Actual</th>
                    <th className="py-2.5 px-3 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupCounts.rows.map((row, idx) => {
                    const isBold = row.rowType !== 'detail';
                    return (
                      <tr
                        key={idx}
                        className={
                          row.rowType === 'grand-total'
                            ? 'bg-indigo-50/70 font-extrabold text-indigo-950'
                            : row.rowType === 'subtotal'
                            ? 'bg-slate-50 font-bold text-slate-900'
                            : 'hover:bg-slate-50/70'
                        }
                      >
                        <td className="py-2 px-3 whitespace-nowrap">{row.priorityGroupLabel}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.memGroup ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.expected == null ? <span className="text-slate-300">—</span> : row.expected.toLocaleString()}
                        </td>
                        <td className={`py-2 px-3 text-right ${isBold ? '' : 'font-semibold'}`}>
                          {row.actual.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">{formatDiff(row.difference)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Actual counts are calculated live from the {employees.length.toLocaleString()} employee record
              {employees.length === 1 ? '' : 's'} currently in the dataset. Expected values are fixed reference
              numbers from the client's Excel source.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
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
