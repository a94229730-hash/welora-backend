import React from 'react';
import { WeloraLogo } from './WeloraLogo';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onOpenDisclaimer: () => void;
  onOpenSOS: () => void;
  language?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenDisclaimer,
  onOpenSOS,
}) => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-[#1E354A] bg-[#0B1724] text-[#94A3B8] text-xs py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
          <WeloraLogo size="sm" showSubtitle horizontal />
          <p className="text-[#94A3B8] text-[11px] max-w-sm mt-1">
            {t(
              'tagline',
              'Understand Your Health. Make Informed Decisions. Care with Confidence.'
            )}
          </p>
        </div>

        {/* Clean Unboxed Metadata and Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[#94A3B8] text-xs">
          <button
            type="button"
            onClick={onOpenDisclaimer}
            className="hover:text-[#20B8A8] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] rounded px-1"
          >
            Medical Disclaimer
          </button>
          <span aria-hidden="true" className="text-[#1E354A]">•</span>
          <button
            type="button"
            onClick={onOpenSOS}
            className="text-[#EF4444] hover:text-[#DC2626] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444] rounded px-1"
          >
            {t('emergencyHelplines', 'Emergency 108 / 112')}
          </button>
          <span aria-hidden="true" className="text-[#1E354A]">•</span>
          <span>Encrypted Health Vault</span>
          <span aria-hidden="true" className="text-[#1E354A]">•</span>
          <span>13 Indian Languages</span>
        </div>

        <div className="text-center md:text-right text-[11px] text-[#94A3B8]/75 space-y-1">
          <div>© {new Date().getFullYear()} Welora Avatar AI. All rights reserved.</div>
          <div className="text-[#94A3B8]/60">
            Simulated emergency functions • Not a substitute for professional clinical advice.
          </div>
        </div>
      </div>
    </footer>
  );
};
