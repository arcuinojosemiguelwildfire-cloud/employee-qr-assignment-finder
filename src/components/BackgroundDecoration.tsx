import React from 'react';

/**
 * Background decoration inspired by the client specification:
 * - Light/white dominant base
 * - Purple/blue decorative dots around upper section
 * - Cyan/teal accents around upper-right
 * - Green accents around lower-right
 * - Soft gradients & subtle abstract shapes
 * Designed to support the content without interfering with form readability.
 */
export const BackgroundDecoration: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#f9fafc]"
      aria-hidden="true"
    >
      {/* Subtle micro dot grid */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)'
        }}
      />

      {/* UPPER SECTION: Purple & Royal Blue ambient orbs */}
      <div 
        className="absolute -top-24 -left-20 w-80 h-80 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #4338ca 0%, #3b82f6 70%, transparent 100%)' }}
      />
      <div 
        className="absolute top-10 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />

      {/* UPPER-RIGHT: Cyan & Teal accents */}
      <div 
        className="absolute -top-16 -right-16 w-72 h-72 sm:w-88 sm:h-88 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0284c7 60%, transparent 100%)' }}
      />
      <div 
        className="absolute top-36 right-4 sm:right-16 w-48 h-48 rounded-full blur-2xl opacity-10"
        style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }}
      />

      {/* LOWER-RIGHT: Green subtle accents */}
      <div 
        className="absolute -bottom-20 -right-12 w-80 h-80 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #10b981 0%, #059669 50%, transparent 80%)' }}
      />
      <div 
        className="absolute bottom-24 right-1/4 w-40 h-40 rounded-full blur-2xl opacity-10"
        style={{ background: 'radial-gradient(circle, #84cc16 0%, transparent 75%)' }}
      />

      {/* Floating decorative dot clusters (purple/blue top, cyan right, green bottom) */}
      {/* Cluster 1: Purple / Blue Top Left */}
      <div className="absolute top-12 left-6 sm:left-16 flex flex-col gap-2.5 opacity-35">
        <div className="flex gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 mt-0.5" />
          <span className="w-2 h-2 rounded-full bg-indigo-400/50" />
        </div>
        <div className="flex gap-2.5 ml-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600/50" />
          <span className="w-2 h-2 rounded-full bg-indigo-500/70" />
        </div>
      </div>

      {/* Cluster 2: Cyan / Teal Top Right */}
      <div className="absolute top-16 right-6 sm:right-20 flex flex-col gap-2 opacity-35">
        <div className="flex gap-2 items-center">
          <span className="w-2 h-2 rounded-full bg-cyan-500/60" />
          <span className="w-3 h-3 rounded-full bg-teal-400/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
        </div>
        <div className="flex gap-2.5 justify-end mr-1">
          <span className="w-2 h-2 rounded-full bg-cyan-600/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500/40" />
        </div>
      </div>

      {/* Cluster 3: Green Bottom Right */}
      <div className="absolute bottom-16 right-8 sm:right-24 flex flex-col gap-2 opacity-30">
        <div className="flex gap-2 items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-400/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600/50" />
        </div>
      </div>

      {/* Cluster 4: Subtle Soft Dots Lower Left */}
      <div className="absolute bottom-20 left-10 flex gap-2 opacity-25">
        <span className="w-2 h-2 rounded-full bg-indigo-400/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400/40" />
      </div>
    </div>
  );
};
