import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.com/event/';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-10 text-center"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Event QR Code
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Scan with your smartphone camera to open this employee assignment finder.
            </p>

            {/* QR Code Container */}
            <div className="flex items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
              <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200/80">
                <img
                  src={qrImageUrl}
                  alt="Event Website QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy Website URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
