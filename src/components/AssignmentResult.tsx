import React, { useState } from 'react';
import { 
  RotateCcw, 
  Copy, 
  Check,
  QrCode 
} from 'lucide-react';
import { motion } from 'motion/react';
import { EmployeeAssignment } from '../types';

interface AssignmentResultProps {
  assignment: EmployeeAssignment;
  onSearchAgain: () => void;
  onOpenQrModal?: () => void;
}

export const AssignmentResult: React.FC<AssignmentResultProps> = ({
  assignment,
  onSearchAgain,
  onOpenQrModal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const summary = `${assignment.employee_name} (${assignment.employee_number})\nGroup: ${assignment.group_name}\nTable: ${assignment.table_name}\nRoom: ${assignment.room_name}${assignment.room_details ? ` (${assignment.room_details})` : ''}`;
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

  // Split room details by ' • ' if multiple lines exist (e.g. Grand Ballroom • 3rd Floor)
  const roomDetailLines = assignment.room_details 
    ? assignment.room_details.split(' • ').map(s => s.trim()).filter(Boolean)
    : [];

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

        {/* Top Header: Event Brand Badge & Event QR Button */}
        <div className="flex items-start justify-between mb-4 pt-1">
          <div className="flex items-center gap-1.5">
            {/* Employee Information Section (Left Aligned) */}
            <div className="mb-5 text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {assignment.employee_name}
              </h2>
              <p className="text-xs font-mono font-medium text-slate-500 mt-1">
                {assignment.employee_number}
                {assignment.department ? ` • ${assignment.department}` : ''}
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
          
          {/* Row 1: GROUP */}
          <div 
            id="assignment-row-group"
            className="flex items-baseline justify-between py-4 border-b border-slate-200/70"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              GROUP
            </span>
            <span className="text-lg sm:text-xl font-bold text-indigo-950 tracking-tight text-right pl-4">
              {assignment.group_name}
            </span>
          </div>

          {/* Row 2: TABLE */}
          <div 
            id="assignment-row-table"
            className="flex items-baseline justify-between py-4 border-b border-slate-200/70"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              TABLE
            </span>
            <span className="text-lg sm:text-xl font-bold text-indigo-950 tracking-tight text-right pl-4">
              {assignment.table_name}
            </span>
          </div>

          {/* Row 3: ROOM */}
          <div 
            id="assignment-row-room"
            className="flex items-start justify-between py-4 border-b border-slate-200/70"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0 pt-0.5">
              ROOM
            </span>
            <div className="text-right pl-4">
              <div className="text-lg sm:text-xl font-bold text-indigo-950 tracking-tight">
                {assignment.room_name}
              </div>
              {roomDetailLines.length > 0 && (
                <div className="text-xs font-medium text-slate-500 mt-1 space-y-0.5 leading-tight">
                  {roomDetailLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Supporting Actions: Copy Info & Search Again */}
        <div className="mt-6 flex items-center gap-2.5">
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
        <p>Need help finding your seat? Event marshals are stationed at hall entrances.</p>
      </div>
    </motion.div>
  );
};
