import React from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { getTranslation } from '../data/languages';

interface EmergencyCallConfirmModalProps {
  isOpen: boolean;
  serviceName: string;
  phoneNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
  language?: string;
}

export const EmergencyCallConfirmModal: React.FC<EmergencyCallConfirmModalProps> = ({
  isOpen,
  serviceName,
  phoneNumber,
  onConfirm,
  onCancel,
  language = 'English',
}) => {
  const handleCall = React.useCallback(() => {
    // Initiate tel: protocol link for mobile dialer
    window.location.href = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
    onConfirm();
  }, [phoneNumber, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#142536] border-2 border-[#EF4444] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-[#EF4444]/30">
        {/* Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#EF4444]/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F4F8FB] p-1.5 rounded-xl hover:bg-[#1A3044] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse text-[#EF4444]" />
        </div>

        <h3 className="text-xl font-black text-center text-[#F4F8FB] mb-1">
          Confirm Emergency Call
        </h3>

        <p className="text-center text-xs text-[#EF4444] font-semibold mb-4 flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
          <span>Real Emergency Telephone Call Authorization</span>
        </p>

        {/* Call Target Details */}
        <div className="bg-[#0B1724] border border-[#1E354A] rounded-2xl p-4 mb-5 text-center">
          <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">
            Service Target
          </span>
          <div className="text-base font-bold text-[#20B8A8] mb-1">
            {serviceName}
          </div>
          <div className="text-2xl font-mono font-extrabold text-[#EF4444] tracking-wider">
            {phoneNumber}
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] leading-relaxed text-center mb-6">
          You are about to dial this verified emergency number via your device&apos;s phone dialer. Click <strong>&ldquo;Yes, Call Now&rdquo;</strong> to initiate the telephone call, or <strong>&ldquo;Cancel&rdquo;</strong> to stay in the app.
        </p>

        {/* Action Buttons: Yes, Call Now and Cancel */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#94A3B8] bg-[#0B1724] hover:bg-[#1A3044] border border-[#1E354A] hover:text-[#F4F8FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            {getTranslation(language, 'cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleCall}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-[#F4F8FB] bg-[#EF4444] hover:bg-[#DC2626] shadow-lg shadow-[#EF4444]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{getTranslation(language, 'yesCallNow', 'Yes, Call Now')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
