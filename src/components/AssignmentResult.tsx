import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  Users, 
  Layers, 
  MapPin, 
  Copy, 
  Check 
} from 'lucide-react';
import { motion } from 'motion/react';
import { EmployeeAssignment } from '../types';

interface AssignmentResultProps {
  assignment: EmployeeAssignment;
  onSearchAgain: () => void;
}

export const AssignmentResult: React.FC<AssignmentResultProps> = ({
  assignment,
  onSearchAgain,
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto px-4"
    >
      {/* Main Result Card */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        
        {/* Subtle decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600" />

        {/* Success confirmation - compact and subtle */}
        <div className="flex items-center justify-center gap-1.5 mb-1 text-emerald-700">
          <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
          <span className="text-xs sm:text-sm font-bold tracking-tight">You're All Set!</span>
        </div>

        {/* Employee Identity */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {assignment.employee_name}
          </h2>
          <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
            {assignment.employee_number}
          </p>
        </div>

        {/* Priority 1: ONE Unified Assignment Card */}
        <div 
          id="unified-assignment-card"
          className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs text-center"
        >
          {/* Card Badge / Title */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white text-slate-700 text-[11px] font-extrabold tracking-widest uppercase border border-slate-200/90 shadow-2xs">
              YOUR ASSIGNMENT
            </span>
          </div>

          {/* Section 1: YOUR GROUP */}
          <div id="assignment-group-section" className="py-2">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-700 mb-1">
              <Users className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>YOUR GROUP</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {assignment.group_name}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/70 my-3.5" />

          {/* Section 2: YOUR TABLE */}
          <div id="assignment-table-section" className="py-2">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-700 mb-1">
              <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>YOUR TABLE</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {assignment.table_name}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/70 my-3.5" />

          {/* Section 3: YOUR ROOM */}
          <div id="assignment-room-section" className="py-2">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-teal-700 mb-1">
              <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>YOUR ROOM</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {assignment.room_name}
            </p>
            {assignment.room_details && (
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                {assignment.room_details}
              </p>
            )}
          </div>
        </div>

        {/* Supporting Actions: Copy Info & Search Again */}
        <div className="mt-5 space-y-2.5">
          {/* Copy Info button */}
          <button
            type="button"
            id="copy-assignment-button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200/60 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-700 font-bold">Assignment Details Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Info</span>
              </>
            )}
          </button>

          {/* Search Again button */}
          <button
            type="button"
            id="search-again-button"
            onClick={onSearchAgain}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] border border-slate-200 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>SEARCH AGAIN</span>
          </button>
        </div>

      </div>

      {/* Footer Support Message */}
      <div className="text-center mt-5 text-[11px] text-slate-400">
        <p>Need help finding your seat? Event marshals are stationed at hall entrances.</p>
      </div>
    </motion.div>
  );
};
