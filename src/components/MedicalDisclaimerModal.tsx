import React, { useState } from 'react';
import { WeloraLogo } from './WeloraLogo';
import { ShieldAlert, CheckCircle2, AlertTriangle, Stethoscope, HeartPulse, Sparkles } from 'lucide-react';
import { getTranslation } from '../data/languages';

interface MedicalDisclaimerModalProps {
  onAccept: () => void;
  language?: string;
}

export const MedicalDisclaimerModal: React.FC<MedicalDisclaimerModalProps> = ({
  onAccept,
  language = 'English',
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleAgreeClick = () => {
    setHasAgreed(true);
  };

  const handleContinueClick = () => {
    if (hasAgreed) {
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/95 backdrop-blur-xl overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#142536] border border-[#20B8A8]/40 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Glow corners */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#66D9E8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#20B8A8]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mandatory Visible Demo Application Notice */}
        <div className="mb-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>DEMO APPLICATION NOTICE:</strong> Emergency sirens, helplines, and SOS features are simulated for training and testing. In real emergencies, call 108 / 112 directly.
          </span>
        </div>

        {/* Welora Branding Header with Next Generation Healthcare Intelligence Line & Tagline */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <WeloraLogo size="lg" showSubtitle showTagline />
        </div>

        {/* Medical Disclaimer Body */}
        <div className="space-y-4 text-[#94A3B8] text-sm leading-relaxed mb-6 bg-[#0B1724] border border-[#1E354A] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2.5 text-[#20B8A8] font-bold text-base pb-2 border-b border-[#1E354A]">
            <ShieldAlert className="w-5 h-5 text-[#20B8A8]" />
            <span>Important Medical Disclaimer & Terms of Use</span>
          </div>

          <p>
            Welcome to <strong className="text-[#F4F8FB]">Welora Avatar AI</strong>. Before accessing the application, please review and accept the clinical advisory below:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#142536] border border-[#1E354A]">
              <Stethoscope className="w-4 h-4 text-[#66D9E8] shrink-0 mt-0.5" />
              <div className="text-xs text-[#94A3B8]">
                <strong className="text-[#F4F8FB] block mb-0.5">Not a Doctor Substitute</strong>
                Welora Avatar AI provides artificial-intelligence-assisted health educational information. It does <em>not</em> provide formal clinical diagnoses or prescribe personalized treatment.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#142536] border border-[#1E354A]">
              <HeartPulse className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="text-xs text-[#94A3B8]">
                <strong className="text-[#EF4444] block mb-0.5">Life-Threatening Emergencies</strong>
                If you suspect a stroke, heart attack, acute respiratory distress, or severe trauma, dial <strong className="text-[#F4F8FB]">108 / 112</strong> or visit the nearest trauma facility immediately.
              </div>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8] pt-1">
            Never delay or disregard seeking professional healthcare advice because of something you read or heard on Welora Avatar AI. Consult a licensed physician or clinical pharmacist regarding any medication or medical condition.
          </p>

          {/* Interactive Consent Check */}
          <div
            onClick={() => setHasAgreed(!hasAgreed)}
            className={`cursor-pointer flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
              hasAgreed
                ? 'bg-[#142536] border-[#20B8A8] text-[#F4F8FB]'
                : 'bg-[#142536] border-[#1E354A] text-[#94A3B8] hover:border-[#20B8A8]/40'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                hasAgreed
                  ? 'bg-[#20B8A8] border-[#20B8A8] text-[#0B1724]'
                  : 'border-[#1E354A] bg-[#0B1724]'
              }`}
            >
              {hasAgreed && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
            </div>
            <span className="text-xs sm:text-sm font-medium select-none">
              I acknowledge that Welora Avatar AI provides informational guidance only and does not replace qualified medical care.
            </span>
          </div>
        </div>

        {/* Mandatory Action Buttons: "I Agree" and "Continue" */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleAgreeClick}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8] ${
              hasAgreed
                ? 'bg-[#0B1724] text-[#20B8A8] border border-[#20B8A8]/60 shadow-sm'
                : 'bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] shadow-lg shadow-[#20B8A8]/20 active:scale-[0.98]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{hasAgreed ? 'Agreed ✓' : getTranslation(language, 'agree', 'I Agree')}</span>
          </button>

          <button
            type="button"
            disabled={!hasAgreed}
            onClick={handleContinueClick}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8] ${
              hasAgreed
                ? 'bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] shadow-lg shadow-[#20B8A8]/30 active:scale-[0.98]'
                : 'bg-[#0B1724] text-[#94A3B8]/40 border border-[#1E354A] cursor-not-allowed opacity-50'
            }`}
          >
            <span>{getTranslation(language, 'continue', 'Continue')}</span>
            <Sparkles className="w-4 h-4 text-[#66D9E8]" />
          </button>
        </div>

        {!hasAgreed && (
          <p className="text-center text-[11px] text-[#94A3B8] mt-3">
            Please click &ldquo;I Agree&rdquo; above to unlock &ldquo;Continue&rdquo; and access the app.
          </p>
        )}
      </div>
    </div>
  );
};
