import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Download, 
  FileText,
  RotateCcw,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImportPreviewData, ImportRowIssue, EmployeeAssignment } from '../../types';
import { parseXlsxFile } from '../../services/xlsxImportService';
import { employeeStore } from '../../services/employeeStore';
import { supabaseEmployeeService } from '../../services/supabaseEmployeeService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { adminAuth } from '../../services/adminAuth';

interface XlsxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

type ImportStep = 'upload' | 'preview' | 'success';

export const XlsxImportModal: React.FC<XlsxImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [showIssuesList, setShowIssuesList] = useState<boolean>(true);
  const [showExcludedList, setShowExcludedList] = useState<boolean>(true);
  const [showAllRowsTable, setShowAllRowsTable] = useState<boolean>(false);
  const [importedStats, setImportedStats] = useState<{
    count: number;
    warnings: number;
    excluded: number;
    sourceRows: number;
    timestamp: string;
    backupFileName?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setSelectedFile(null);
    setIsParsing(false);
    setParseError(null);
    setPreviewData(null);
    setIsConfirming(false);
    setImportedStats(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await parseXlsxFile(file);
      if (result.success) {
        setPreviewData(result.preview);
        setStep('preview');
      } else {
        setParseError('error' in result ? result.error : 'Unable to process the Excel file.');
      }
    } catch {
      setParseError(
        'Unable to process the Excel file. Please verify that the file is a valid XLSX file.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.validEmployees.length === 0) return;

    setIsConfirming(true);
    setParseError(null);

    try {
      if (isSupabaseConfigured) {
        // PHASE 13: preserve the local backup/rollback trail without
        // overwriting the local dataset itself — Supabase is now the write
        // target, so this is purely an audit snapshot, not the import path.
        try {
          employeeStore.createBackup(
            `Pre-import snapshot for ${previewData.fileName} (imported to Supabase)`,
            previewData.fileName
          );
        } catch (backupErr) {
          console.error('Local backup snapshot failed (non-fatal):', backupErr);
        }

        const adminKey = adminAuth.getAdminKey() || '';
        // Single round-trip, upserted server-side in one SQL statement
        // (see admin_import_batch in the migration) — atomic, and the
        // service verifies the returned count before reporting success.
        const result = await supabaseEmployeeService.importBatch(adminKey, previewData.validEmployees);

        if (result.success) {
          const now = new Date();
          setImportedStats({
            count: result.count,
            warnings: previewData.warningsCount,
            excluded: previewData.excludedCount,
            sourceRows: previewData.totalRowsDetected,
            timestamp: now.toLocaleString(),
            backupFileName: `employees.backup-${now.toISOString().slice(0, 10)}.json`,
          });
          setStep('success');
          onImportComplete(result.count);
        } else {
          setParseError(result.error || 'Failed to complete import.');
        }
        return;
      }

      // Local fallback (Supabase not configured): unchanged prior behavior.
      const result = employeeStore.importBatch(previewData.validEmployees, {
        fileName: previewData.fileName,
      });

      if (result.success) {
        const now = new Date();
        setImportedStats({
          count: result.count,
          warnings: previewData.warningsCount,
          excluded: previewData.excludedCount,
          sourceRows: previewData.totalRowsDetected,
          timestamp: now.toLocaleString(),
          backupFileName: `employees.backup-${now.toISOString().slice(0, 10)}.json`,
        });
        setStep('success');
        onImportComplete(result.count);
      } else {
        setParseError(result.error || 'Failed to complete import.');
      }
    } catch (err: any) {
      setParseError(err?.message || 'Failed to complete import.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = employeeStore.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Employee Data Import
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload client Excel workbook to update the JSON employee directory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6 max-w-xl mx-auto py-2">
              <div className="text-center space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Upload Client XLSX
                </h4>
                <p className="text-xs sm:text-sm text-slate-500">
                  Select the client spreadsheet containing the <span className="font-semibold text-slate-700">MEM Grouping</span> sheet.
                </p>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Import Error</p>
                    <p className="text-rose-700">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Drag & Drop File Target */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="xlsx-file-input"
                />

                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
                  {isParsing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Choose XLSX file or drag & drop here'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports Microsoft Excel (<span className="font-medium text-slate-600">.xlsx</span>, <span className="font-medium text-slate-600">.xls</span>) up to 30MB
                  </p>
                </div>

                {isParsing && (
                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reading and validating sheet contents...</span>
                  </div>
                )}
              </div>

              {/* Requirements summary checklist */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Excel File Requirements
                </p>
                <ul className="space-y-1 text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>Sheet name: <strong className="text-slate-900">MEM Grouping</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>Required columns: <span className="font-medium">Employee Number, Name + Email Address, MEM Group, MEM Priority Group, Table #</span></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>Column order does not matter & whitespace is automatically trimmed.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>A timestamped backup of existing JSON will be created automatically.</span>
                  </li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isParsing}
                  onClick={() => selectedFile && handleFileSelected(selectedFile)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {isParsing ? 'Processing...' : 'PREVIEW IMPORT'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && previewData && (
            <div className="space-y-5">
              {/* Header stats summary */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      Import Preview
                    </span>
                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                      {previewData.fileName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sheet: <strong className="text-slate-800">{previewData.sheetName}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Upload Different File</span>
                  </button>
                </div>

                {/* Import Summary — row-accurate counts, never "just" the source row total */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Source Rows</p>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {previewData.totalRowsDetected.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Ready to Import</p>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-800">
                      ✓ {previewData.validCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                    <p className="text-[10px] uppercase font-bold text-amber-700">Warnings</p>
                    <p className="text-lg sm:text-xl font-extrabold text-amber-800">
                      ⚠ {previewData.warningsCount.toLocaleString()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    previewData.errorsCount > 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <p className="text-[10px] uppercase font-bold">Errors</p>
                    <p className="text-lg sm:text-xl font-extrabold">
                      ✕ {previewData.errorsCount.toLocaleString()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${
                    previewData.excludedCount > 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    <p className="text-[10px] uppercase font-bold">Excluded</p>
                    <p className="text-lg sm:text-xl font-extrabold">
                      {previewData.excludedCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {previewData.excludedCount > 0 && (
                  <p className="text-[11px] text-slate-500 pt-2">
                    {previewData.totalRowsDetected.toLocaleString()} source rows detected,{' '}
                    <strong className="text-emerald-700">{previewData.validCount.toLocaleString()} will be imported</strong>, and{' '}
                    <strong className="text-rose-700">{previewData.excludedCount.toLocaleString()} are excluded</strong> — see the reasons below.
                  </p>
                )}
              </div>

              {/* Warnings — rows that ARE imported despite a non-blocking issue (e.g. missing email) */}
              {previewData.warningsCount > 0 && (
                <div className="rounded-2xl border p-4 text-xs bg-amber-50/60 border-amber-200 text-amber-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{previewData.warningsCount} warning(s) — these rows will still be imported</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowIssuesList(!showIssuesList)}
                      className="text-xs font-bold underline cursor-pointer"
                    >
                      {showIssuesList ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {showIssuesList && (
                    <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200/50">
                      {previewData.issues
                        .filter((issue) => issue.type === 'warning')
                        .map((issue, idx) => (
                          <div key={idx} className="pt-1.5 flex items-start gap-2">
                            <span className="inline-block px-1.5 py-0.2 rounded font-mono font-bold text-[10px] shrink-0 bg-amber-200 text-amber-900">
                              Excel Row {issue.rowNumber}
                            </span>
                            <span className="text-[11px] leading-relaxed">
                              {issue.message}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Excluded / Invalid Rows — rows that will NOT be imported, with the exact parser reason */}
              {previewData.excludedRows.length > 0 && (
                <div className="rounded-2xl border p-4 text-xs bg-rose-50/60 border-rose-200 text-rose-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>
                        EXCLUDED / INVALID ROWS ({previewData.excludedRows.length} of {previewData.totalRowsDetected} source rows will NOT be imported)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowExcludedList(!showExcludedList)}
                      className="text-xs font-bold underline cursor-pointer shrink-0"
                    >
                      {showExcludedList ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  {showExcludedList && (
                    <div className="mt-3 max-h-56 overflow-y-auto space-y-2.5 pr-1 divide-y divide-rose-200/60">
                      {previewData.excludedRows.map((row, idx) => (
                        <div key={idx} className="pt-2.5 first:pt-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 bg-rose-200 text-rose-900">
                              Excel Row {row.excelRow}
                            </span>
                            {row.employeeNumber && (
                              <span className="font-mono text-[10px] text-rose-800">#{row.employeeNumber}</span>
                            )}
                            {row.name && (
                              <span className="text-[11px] font-semibold text-rose-900">{row.name}</span>
                            )}
                          </div>
                          <ul className="mt-1 ml-1 space-y-0.5">
                            {row.reasons.map((reason, ri) => (
                              <li key={ri} className="text-[11px] leading-relaxed text-rose-800">
                                Reason: {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Full Row-by-Row Diagnostic Table — every source row with its Excel Row & Status,
                  so exactly which rows were imported/warned/excluded is always traceable. */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="font-bold text-slate-800">
                  Row-by-Row Preview ({previewData.allRows.length.toLocaleString()} source rows)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllRowsTable(!showAllRowsTable)}
                  className="text-xs font-bold text-indigo-600 underline cursor-pointer"
                >
                  {showAllRowsTable ? 'Show valid records only' : 'Show all rows (incl. excluded)'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Excel Row</th>
                      <th className="py-2.5 px-3">Emp No.</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">MEM Group</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Table Number</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(showAllRowsTable ? previewData.allRows : previewData.allRows.filter((r) => r.status !== 'error'))
                      .length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                          No records could be processed.
                        </td>
                      </tr>
                    ) : (
                      (showAllRowsTable ? previewData.allRows : previewData.allRows.filter((r) => r.status !== 'error')).map(
                        (row) => (
                          <tr
                            key={row.excelRow}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.status === 'error' ? 'bg-rose-50/40' : row.status === 'warning' ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 whitespace-nowrap">
                              {row.excelRow}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                              {row.employeeNumber || <span className="text-rose-500 italic font-sans">missing</span>}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {row.name || <span className="text-rose-500 italic">missing</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              {/* Blank is a valid "Unassigned" state, not an
                                  error — never styled like the genuinely
                                  required employeeNumber/name fields above. */}
                              {row.memGroup ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {row.memGroup}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.memPriorityGroup ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {row.memPriorityGroup}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.tables.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {row.tables.map((t, ti) => (
                                    <span
                                      key={ti}
                                      className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center" title={row.reasons.join(' | ')}>
                              {row.status === 'valid' && <span className="text-emerald-600 font-bold">✓</span>}
                              {row.status === 'warning' && <span className="text-amber-600 font-bold">⚠</span>}
                              {row.status === 'error' && <span className="text-rose-600 font-bold">✕</span>}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Replacement Warning Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Ready to Import</p>
                  <p className="text-amber-800">
                    This will replace the active employee dataset with {previewData.validCount.toLocaleString()} records
                    {previewData.excludedCount > 0 && (
                      <> ({previewData.excludedCount.toLocaleString()} of {previewData.totalRowsDetected.toLocaleString()} source rows excluded — see above)</>
                    )}.
                    A safety backup will be automatically saved before the replacement.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Abort
                  </button>

                  <button
                    type="button"
                    id="confirm-import-btn"
                    disabled={previewData.validCount === 0 || isConfirming}
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    {isConfirming ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving JSON...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CONFIRM IMPORT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && importedStats && (
            <div className="text-center py-6 px-4 space-y-5 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900">
                  Import Successful
                </h4>
                <p className="text-sm font-bold text-emerald-700">
                  {importedStats.count.toLocaleString()} employee records imported.
                </p>
                <p className="text-xs text-slate-500">
                  The new employee data is now active in the system.
                </p>
              </div>

              {/* Statistics Card */}
              <div className="bg-slate-50 rounded-2xl p-4 text-xs border border-slate-200 text-left space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Source Rows Detected:</span>
                  <strong className="text-slate-900 font-bold">{importedStats.sourceRows.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Imported:</span>
                  <strong className="text-emerald-700 font-bold">{importedStats.count.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Excluded:</span>
                  <span className={`font-bold ${importedStats.excluded > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                    {importedStats.excluded.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Warnings:</span>
                  <span className="font-semibold text-amber-700">{importedStats.warnings}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Timestamp:</span>
                  <span className="font-mono text-slate-700">{importedStats.timestamp}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                  <span>Safety Backup Created:</span>
                  <span className="font-mono text-[11px] text-indigo-700 font-bold">
                    {importedStats.backupFileName}
                  </span>
                </div>
                {importedStats.excluded > 0 && (
                  <p className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                    {importedStats.excluded} source row{importedStats.excluded > 1 ? 's were' : ' was'} excluded from this import.
                    Re-open this file's preview to review the exact Excel row numbers and reasons before re-uploading.
                  </p>
                )}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Backup JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>Done</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
