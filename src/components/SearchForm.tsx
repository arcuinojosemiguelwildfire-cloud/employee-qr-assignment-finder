import React, { useState } from 'react';
import { Search, ArrowRight, AlertCircle, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchFormProps {
  onSearch: (employeeNumber: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onSearch,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [localValidation, setLocalValidation] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);
    onClearError();

    const trimmed = employeeNumber.trim();
    if (!trimmed) {
      setLocalValidation('Please enter your employee number.');
      return;
    }

    onSearch(trimmed);
  };

  const displayedError = localValidation || errorMessage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto px-4"
    >
      {/* Main Glassmorphic / Solid White Card */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-100 transition-all">
        
        {/* Subtle decorative card top gradient strip */}
        <div className="absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 opacity-90" />

        {/* Welcome Section */}
        <div className="text-center mb-7 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold tracking-widest uppercase mb-3 border border-indigo-100/80">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Nestlé MEM 2026
          </div>
          
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed mt-4">
            Enter your employee number to view your MEM group, priority group, and table assignment.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="employee-number-input" 
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 pl-1"
            >
              Employee Number
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>

              <input
                id="employee-number-input"
                type="text"
                value={employeeNumber}
                onChange={(e) => {
                  setEmployeeNumber(e.target.value.toUpperCase());
                  if (localValidation) setLocalValidation(null);
                  if (errorMessage) onClearError();
                }}
                disabled={isLoading}
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. EMP00123"
                className={`w-full pl-11 pr-11 py-3.5 text-base sm:text-lg font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/80 rounded-2xl border transition-all duration-200 outline-none focus:bg-white focus:ring-4 ${
                  displayedError
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100 text-rose-950'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />

              {/* Clear button */}
              {employeeNumber && !isLoading && (
                <button
                  type="button"
                  id="clear-input-button"
                  onClick={() => {
                    setEmployeeNumber('');
                    setLocalValidation(null);
                    onClearError();
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear employee number"
                >
                  <span className="p-1 rounded-full hover:bg-slate-200/60">
                    <X className="w-4 h-4" />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {displayedError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                id="error-banner"
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium leading-snug">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>{displayedError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary CTA button */}
          <button
            type="submit"
            id="submit-assignment-button"
            disabled={isLoading}
            className="w-full relative overflow-hidden group flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 hover:from-indigo-800 hover:via-blue-700 hover:to-indigo-900 active:scale-[0.99] shadow-lg shadow-indigo-600/25 transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Finding Assignment...</span>
              </>
            ) : (
              <>
                <span>VIEW MY ASSIGNMENT</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

      </div>
    </motion.div>
  );
};
