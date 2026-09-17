import React from 'react';
import { QrCode, Sparkles } from 'lucide-react';

interface EventHeaderProps {
  onOpenQrModal?: () => void;
}

export const EventHeader: React.FC<EventHeaderProps> = ({ onOpenQrModal }) => {
  return (
    <header className="w-full pt-6 pb-4 sm:py-8 px-4 flex items-center justify-between max-w-xl mx-auto">
      {/* Event Brand / Logo */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2 py-2 rounded-full border border-indigo-100">
              Ultramega Expo 2026
            </span>
          </div>
        </div>
      </div>

      {/* Quick QR preview trigger for testing / event staff */}
      {onOpenQrModal && (
        <button
          type="button"
          id="qr-preview-button"
          onClick={onOpenQrModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white/90 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80 shadow-xs transition-all active:scale-95"
          title="Show Event QR Code to scan with phone"
        >
          <QrCode className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Event QR</span>
        </button>
      )}
    </header>
  );
};
