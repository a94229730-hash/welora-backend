import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  PhoneCall,
  ShieldAlert,
  X,
  ShieldCheck,
  Building,
  HeartPulse,
  Flame,
  UserCheck,
} from 'lucide-react';
import { EmergencyService } from '../types';
import { EMERGENCY_SERVICES } from '../data/emergencyServices';
import { EmergencyCallConfirmModal } from './EmergencyCallConfirmModal';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface EmergencyScreenProps {
  onClose?: () => void;
  language?: string;
}

export const EmergencyScreen: React.FC<EmergencyScreenProps> = ({ onClose }) => {
  const { t, displayLanguage } = useLanguage();
  const [services, setServices] = useState<EmergencyService[]>(EMERGENCY_SERVICES);
  const [loading, setLoading] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [selectedService, setSelectedService] = useState<EmergencyService | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Web Audio Context reference for synthesized siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    // Attempt fetch from backend, fall back immediately to verified local directory (Netlify ready)
    safeApiFetch<any>('/api/emergency/services')
      .then((res) => {
        if (res.success && Array.isArray(res.data?.services)) {
          setServices(res.data.services);
        }
      })
      .catch(() => {});
  }, []);

  // Web Audio Siren Generator
  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.value = 0.15; // Safe comfortable audible volume
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      setIsSirenPlaying(true);

      // Oscillate frequency like standard two-tone emergency ambulance siren
      let high = false;
      intervalRef.current = setInterval(() => {
        if (!oscRef.current || !audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        oscRef.current.frequency.cancelScheduledValues(now);
        oscRef.current.frequency.linearRampToValueAtTime(high ? 920 : 600, now + 0.35);
        high = !high;
      }, 400);
    } catch (e) {
      console.warn('Could not initialize web audio siren:', e);
      setIsSirenPlaying(false);
    }
  };

  const stopSiren = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  const handleServiceClick = (service: EmergencyService) => {
    setSelectedService(service);
    setIsCallModalOpen(true);
  };

  const getServiceIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'medical':
        return <HeartPulse className="w-5 h-5 text-[#EF4444]" />;
      case 'safety':
        return <ShieldCheck className="w-5 h-5 text-[#66D9E8]" />;
      case 'rescue':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'disaster relief':
        return <Building className="w-5 h-5 text-orange-400" />;
      case 'child care':
      case 'protection':
      case 'elderly care':
        return <UserCheck className="w-5 h-5 text-[#20B8A8]" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-[#EF4444]" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* High-visibility Emergency Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#142536] border-2 border-[#EF4444] p-6 sm:p-8 shadow-2xl shadow-[#EF4444]/20">
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-[#EF4444]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#EF4444]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
              <span>SOS EMERGENCY • {displayLanguage}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#F4F8FB] tracking-tight">
              {t('emergencyHelplines', 'All-in-One Emergency Services')}
            </h1>

            <p className="text-[#F4F8FB]/85 text-sm sm:text-base leading-relaxed">
              {t('demoNotice', 'Quick access to verified national emergency helplines. No automated dispatch occurs without direct phone dial confirmation.')}
            </p>

            {/* Mandatory Demo Notice */}
            <div className="inline-flex items-center gap-2 text-xs text-amber-300 font-medium bg-[#0B1724]/90 px-3 py-1.5 rounded-lg border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>DEMO APP NOTICE:</strong> Siren audio and emergency dispatch simulations are for testing. Real calls require user confirmation via the calling prompt.
              </span>
            </div>
          </div>

          {/* Siren Controls & Exit */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {isSirenPlaying ? (
              <button
                type="button"
                onClick={stopSiren}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#F4F8FB] hover:bg-[#F4F8FB]/90 text-[#EF4444] font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] border-2 border-[#EF4444] animate-pulse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
              >
                <VolumeX className="w-5 h-5 text-[#EF4444]" />
                <span>{t('stopSiren', 'Stop Siren')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startSiren}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#F4F8FB] font-bold text-sm sm:text-base shadow-lg shadow-[#EF4444]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-[#EF4444]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
              >
                <Volume2 className="w-5 h-5 text-[#F4F8FB]" />
                <span>{t('testSiren', 'Test Demo Siren')}</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#142536] hover:bg-[#1A3044] text-[#94A3B8] hover:text-[#F4F8FB] font-semibold text-sm border border-[#1E354A] hover:border-[#20B8A8]/40 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                <X className="w-4 h-4" />
                <span>{t('close', 'Exit SOS')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Emergency First-Aid Triage Advice Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#142536] border border-[#1E354A] text-xs text-[#94A3B8] space-y-1.5">
          <strong className="text-[#EF4444] block text-sm font-semibold">1. Unconscious / No Pulse</strong>
          <p className="leading-relaxed">
            Call 108 immediately. Begin CPR: 100-120 hard and fast chest compressions per minute in the center of the chest.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#142536] border border-[#1E354A] text-xs text-[#94A3B8] space-y-1.5">
          <strong className="text-[#EF4444] block text-sm font-semibold">2. Acute Chest Pain / Stroke Signs</strong>
          <p className="leading-relaxed">
            Check FAST: Face drooping, Arm weakness, Slurred speech, Time to call 108. Keep patient seated and calm.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#142536] border border-[#1E354A] text-xs text-[#94A3B8] space-y-1.5">
          <strong className="text-[#EF4444] block text-sm font-semibold">3. Severe Bleeding / Trauma</strong>
          <p className="leading-relaxed">
            Apply direct, firm, continuous pressure with a clean cloth. Elevate injured limb if possible.
          </p>
        </div>
      </div>

      {/* Verified Helplines Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#F4F8FB] flex items-center gap-2">
            <span>{t('emergencyHelplines', 'Verified Emergency Services')}</span>
            <span className="text-xs font-normal text-[#94A3B8]">• 10 Verified National Services</span>
          </h2>
          <span className="text-xs text-[#94A3B8]">Confirmation popup required before dialing</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#EF4444]/60 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[#0B1724] border border-[#1E354A] group-hover:border-[#EF4444]/40 transition-colors">
                    {getServiceIcon(service.category)}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded">
                    {service.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#F4F8FB] group-hover:text-[#EF4444] transition-colors">
                  {service.name}
                </h3>
                <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#1E354A] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-[#94A3B8] block font-medium">Helpline Number</span>
                  <span className="text-xl font-black font-mono text-[#F4F8FB] tracking-wide">
                    {service.number}
                  </span>
                  {service.altNumber && (
                    <span className="text-[11px] text-[#94A3B8] ml-2 font-mono">
                      (Alt: {service.altNumber})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleServiceClick(service)}
                  className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#F4F8FB] font-bold text-xs shadow-md shadow-[#EF4444]/30 active:scale-[0.98] transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t('callNow', 'Call Now')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedService && (
        <EmergencyCallConfirmModal
          isOpen={isCallModalOpen}
          serviceName={selectedService.name}
          phoneNumber={selectedService.number}
          onConfirm={() => setIsCallModalOpen(false)}
          onCancel={() => setIsCallModalOpen(false)}
          language={displayLanguage}
        />
      )}
    </div>
  );
};
