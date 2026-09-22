import React, { useState } from 'react';
import { 
  RotateCcw, 
  Copy, 
  Check,
  QrCode 
} from 'lucide-react';
import { motion } from 'motion/react';
import { EmployeeAssignment } from '../types';
import { formatCombinedMemGroup, getProcessQuestions, normalizeDisplayName } from '../data/seedEmployees';

interface AssignmentResultProps {
  assignment: EmployeeAssignment;
  onSearchAgain: () => void;
  onOpenQrModal?: () => void;
  questions?: string[];
  /**
   * Global "TBC Mode" flag (see appSettingsService.ts / lookupService.ts).
   * When true, MEM Group and Tables must display "TBC" instead of the
   * employee's real values. This is display-only — `assignment.mem_group`,
   * `assignment.mem_priority_group`, and `assignment.tables` are never
   * modified; everything else on this card (name, number, Event QR,
   * Reflective Question) is unaffected.
   */
  tbcMode?: boolean;
}

export const AssignmentResult: React.FC<AssignmentResultProps> = ({
  assignment,
  onSearchAgain,
  onOpenQrModal,
  questions: passedQuestions,
  tbcMode = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Resolve process questions mapped to the employee's MEM Priority Group
  const questions = passedQuestions || getProcessQuestions(assignment.mem_priority_group);

  // Last-mile safety net: employeeStore already self-heals malformed names on
  // load, but this guarantees the public result can NEVER show Location/
  // Position/email leaked into the name, regardless of how the record got here.
  const displayName =
    normalizeDisplayName(assignment.name || assignment.employee_name || '') || 'Attendee';

  // Combined MEM Group display: "<mem_priority_group> <mem_group>" (e.g.
  // "Digital Transformation 7"). Shared convention — see
  // formatCombinedMemGroup in seedEmployees.ts (also used by the Admin
  // Employee Data Verification feature) so this never drifts out of sync.
  // Overridden to "TBC" when the global TBC Mode setting is on.
  const memGroupDisplay = tbcMode
    ? 'TBC'
    : formatCombinedMemGroup(assignment.mem_priority_group, assignment.mem_group);

  const handleCopy = async () => {
    const tablesStr = tbcMode
      ? 'TBC'
      : assignment.tables && assignment.tables.length > 0
      ? assignment.tables.join(', ')
      : 'Unassigned';

    const questionsText = questions.length > 0
      ? `\n\nReflective Question${questions.length > 1 ? 's' : ''}:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const summary = `${displayName} (${assignment.employee_number})\nMEM Group: ${memGroupDisplay}\nTable(s): ${tablesStr}${questionsText}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto px-4"
    >
      {/* Single Unified White Container / Corporate Pass */}
      <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/70 border border-slate-200/80 overflow-hidden">
        
        {/* Subtle decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-sky-500 to-teal-500" />

        {/* Top Header: Employee Name, Number & Event QR Button (email is intentionally not displayed) */}
        <div className="flex items-start justify-between mb-4 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Employee Information Section (Left Aligned) */}
            <div className="mb-4 text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {displayName}
              </h2>
              <p className="text-xs font-mono font-medium text-slate-500 mt-1">
                {assignment.employee_number}
              </p>
            </div>
          </div>

          {onOpenQrModal && (
            <button
              type="button"
              id="event-qr-button"
              onClick={onOpenQrModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
              title="Show Event QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Event QR</span>
            </button>
          )}
        </div>

        {/* Horizontal Assignment Rows (Data Sheet / Pass Style) */}
        <div className="border-t border-slate-200/80">
          
          {/* Row 1: MEM GROUP — combined "<priority group> <group>" display
              (e.g. "Digital Transformation 7"). MEM Priority Group is no
              longer shown as its own separate row on this page. */}
          <div
            id="assignment-row-mem-group"
            className="flex items-baseline justify-between py-4 border-b border-slate-200/70"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              MEM GROUP
            </span>
            <span className="text-lg sm:text-xl font-bold text-indigo-950 tracking-tight text-right pl-4">
              {memGroupDisplay}
            </span>
          </div>

          {/* Row 2: TABLE / TABLES — shows "TBC" when the global TBC Mode
              setting is on, instead of the employee's real table(s). The
              underlying assignment.tables array itself is never touched. */}
          <div
            id="assignment-row-table"
            className="flex items-start justify-between py-4 border-b border-slate-200/70"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0 pt-0.5">
              {tbcMode || (assignment.tables && assignment.tables.length > 1) ? 'TABLES' : 'TABLE'}
            </span>
            <div className="text-right pl-4">
              {tbcMode ? (
                <span className="text-base sm:text-lg font-bold text-indigo-950 tracking-tight">
                  TBC
                </span>
              ) : assignment.tables && assignment.tables.length > 0 ? (
                <div className="flex flex-col items-end gap-1">
                  {assignment.tables.map((table, idx) => (
                    <span
                      key={idx}
                      className="text-base sm:text-lg font-bold text-indigo-950 tracking-tight"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-base sm:text-lg font-bold text-indigo-950 tracking-tight">
                  Unassigned
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Reflective Question(s) Section (Display-Only) — unaffected by TBC Mode */}
        {questions.length > 0 && (
          <div className="pt-4 border-b border-slate-200/70 pb-4 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              {questions.length > 1 ? 'REFLECTIVE QUESTIONS' : 'REFLECTIVE QUESTION'}
            </span>
            <div className="space-y-2.5">
              {questions.map((q, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm text-slate-800 font-medium leading-relaxed"
                >
                  {questions.length > 1 && (
                    <span className="font-bold text-indigo-700 block text-xs mb-1">
                      Question {idx + 1}:
                    </span>
                  )}
                  <p className="italic text-slate-700 leading-snug">"{q}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supporting Actions: Copy Info & Search Again */}
        <div className="mt-5 flex items-center gap-2.5">
          {/* Copy Info Button */}
          <button
            type="button"
            id="copy-assignment-button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200/60 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Info</span>
              </>
            )}
          </button>

          {/* Search Again Button */}
          <button
            type="button"
            id="search-again-button"
            onClick={onSearchAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] border border-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>SEARCH AGAIN</span>
          </button>
        </div>

      </div>

      {/* Footer Guidance Notice */}
      <div className="text-center mt-5 text-[11px] text-slate-400">
        <p>Need help finding your table? Event marshals are stationed around the hall.</p>
      </div>
    </motion.div>
  );
};
