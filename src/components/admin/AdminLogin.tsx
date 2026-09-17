import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { adminAuth } from '../../services/adminAuth';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = adminAuth.login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Authentication failed. Check your credentials.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-md mx-auto px-4"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
        
        {/* Back Link */}
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Employee Lookup</span>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 mb-3 border border-indigo-100">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Admin Authentication
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Internal event administrator access only
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 text-sm font-medium text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            id="admin-login-button"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-indigo-700 hover:bg-indigo-800 active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-60"
          >
            LOGIN
          </button>
        </form>

        {/* Demo Credentials Hint */}
        <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Developer / Demo Credentials:</span>
          </div>
          <p>Username: <code className="font-mono bg-white px-1 py-0.5 rounded text-indigo-900 border border-slate-200">admin</code></p>
          <p className="mt-0.5">Password: <code className="font-mono bg-white px-1 py-0.5 rounded text-indigo-900 border border-slate-200">admin2026</code></p>
        </div>

      </div>
    </motion.div>
  );
};
