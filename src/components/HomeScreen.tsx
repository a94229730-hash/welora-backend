import React from 'react';
import {
  AlertTriangle,
  Stethoscope,
  Bot,
  Mic,
  FileText,
  FileCheck2,
  HeartHandshake,
  MapPin,
  Calendar,
  History,
  BookOpen,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { WeloraLogo } from './WeloraLogo';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HomeScreenProps {
  onSelectTab: (tab: string) => void;
  onOpenSOS: () => void;
  onOpenVoice: () => void;
  user: User | null;
  language?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectTab,
  onOpenSOS,
  onOpenVoice,
  user,
}) => {
  const { t, displayLanguage } = useLanguage();

  const quickFeatures = [
    {
      id: 'symptoms',
      title: t('symptomChecker', 'AI Symptom Checker'),
      desc: t('assessmentOverview', 'Clinical triage, possible explanations, and emergency red-flag safety warnings.'),
      icon: Stethoscope,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'voice',
      title: t('voiceAssistant', 'Dedicated Voice Avatar'),
      desc: t('speakToWelora', 'Hands-free two-way voice conversations with animated circular avatar interface.'),
      icon: Mic,
      accent: 'text-[#66D9E8] bg-[#0B1724] border-[#66D9E8]/30',
      action: onOpenVoice,
    },
    {
      id: 'chat',
      title: t('aiAssistant', 'AI Health Assistant'),
      desc: t('aiAssistant', 'Continuous multi-turn health guidance, medicine info, and TTS read aloud.'),
      icon: Bot,
      accent: 'text-[#66D9E8] bg-[#0B1724] border-[#66D9E8]/30',
    },
    {
      id: 'prescription',
      title: t('prescriptionScan', 'Prescription Scanner (OCR)'),
      desc: t('prescriptionTitle', 'Extract medicine names, dosages, timings, and verify handwritten clarity.'),
      icon: FileText,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'lab',
      title: t('labReports', 'Lab Report Scanner & Compare'),
      desc: t('labReportsTitle', 'Understand lab results and compare 2 reports side by side over time.'),
      icon: FileCheck2,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'homecare',
      title: t('homeRemedies', 'Home Care Remedies'),
      desc: t('homeCareTitle', 'Safe non-prescription home relief screened against age and reported allergies.'),
      icon: HeartHandshake,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'hospitals',
      title: t('nearbyHospitals', 'Nearby Hospitals & Trauma Care'),
      desc: t('findHospitalsTitle', 'GPS-calculated distances to verified hospitals with call authorization.'),
      icon: MapPin,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'appointments',
      title: t('appointments', 'Doctor Appointment Booking'),
      desc: t('appointmentBookingTitle', 'Schedule consultations with verified specialists and receive reminders.'),
      icon: Calendar,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'history',
      title: t('medicalHistory', 'Personal Medical History'),
      desc: t('medicalHistoryTitle', 'Confidential vault for records, consults, allergies, and encrypted export.'),
      icon: History,
      accent: 'text-[#20B8A8] bg-[#0B1724] border-[#20B8A8]/30',
    },
    {
      id: 'journal',
      title: t('healthJournal', 'Personal Health Journal'),
      desc: t('healthJournalTitle', 'Daily wellness log, symptoms diary, energy & vitals tracker, and doctor visit questions.'),
      icon: BookOpen,
      accent: 'text-[#66D9E8] bg-[#0B1724] border-[#66D9E8]/30',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#142536] border border-[#20B8A8]/25 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#66D9E8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#20B8A8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B1724] border border-[#20B8A8]/30 text-[#20B8A8] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#66D9E8]" />
              <span>Welora Avatar AI • {t('nextGenIntelligence', 'Next Generation Healthcare Intelligence')} • {displayLanguage}</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F4F8FB] tracking-tight leading-tight">
                Welora Avatar AI
              </h1>
              <p className="text-base sm:text-lg font-bold text-[#20B8A8] tracking-wide">
                {t('nextGenIntelligence', 'Next Generation Healthcare Intelligence')}
              </p>
            </div>

            <p className="text-base sm:text-lg text-[#66D9E8] font-medium italic">
              &ldquo;{t('tagline', 'Understand Your Health. Make Informed Decisions. Care with Confidence.')}&rdquo;
            </p>

            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-xl">
              {t('demoNotice', 'An all-in-one medical companion featuring AI clinical triage, two-way voice avatars, prescription & lab OCR, side-by-side report tracking, verified doctor appointments, and instant emergency helplines.')}
            </p>

            {/* Quick Hero Action CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => onSelectTab('symptoms')}
                className="px-6 py-3 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                <Stethoscope className="w-4 h-4" />
                <span>{t('analyzeSymptoms', 'Check Symptoms')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenVoice}
                className="px-5 py-3 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#66D9E8] font-bold text-xs sm:text-sm border border-[#66D9E8]/40 shadow-md active:scale-95 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                <Mic className="w-4 h-4 text-[#66D9E8]" />
                <span>{t('voiceAssistant', 'Launch Voice Avatar')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSOS}
                className="px-5 py-3 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#F4F8FB] font-extrabold text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 border border-[#EF4444]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
              >
                <AlertTriangle className="w-4 h-4 text-[#F4F8FB]" />
                <span>{t('sosButton', 'SOS Emergency')}</span>
              </button>
            </div>
          </div>

          {/* Welora Emblem Centerpiece */}
          <div className="flex flex-col items-center justify-center">
            <WeloraLogo size="xl" showSubtitle showTagline={false} />
            {user && (
              <div className="mt-4 px-3 py-1.5 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#94A3B8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#20B8A8]" />
                <span>
                  {t('healthProfile', 'Profile')}: <strong className="text-[#F4F8FB]">{user.name}</strong> ({user.healthProfile.bloodGroup || 'Patient'})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Red Emergency / SOS Direct Banner Card (Exclusively reserved for emergencies) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#EF4444]/15 border-2 border-[#EF4444] p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-[#EF4444] border border-[#EF4444]/80 flex items-center justify-center text-[#F4F8FB] shrink-0 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#EF4444] text-xs font-bold uppercase tracking-wider">
              <span>{t('urgentAttention', 'Immediate Emergency Access')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F4F8FB]">
              {t('emergencyHelplines', 'SOS Emergency Helplines')}
            </h2>
            <p className="text-xs sm:text-sm text-[#F4F8FB]/85 leading-relaxed max-w-2xl">
              {t('demoNotice', '1-click access to Ambulance (108), Police (100), Fire (101), Trauma and verified services with siren audio simulation.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSOS}
          className="px-6 py-3.5 rounded-xl bg-[#F4F8FB] hover:bg-[#F4F8FB]/90 text-[#EF4444] font-extrabold text-sm shadow-xl flex items-center gap-2 active:scale-95 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
        >
          <PhoneCall className="w-4 h-4 text-[#EF4444]" />
          <span>{t('callNow', 'Open Emergency Screen')}</span>
        </button>
      </div>

      {/* Shortcuts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#F4F8FB] flex items-center gap-2">
            <span>{t('assessmentOverview', 'Clinical Tools & Services')}</span>
            <span className="text-xs font-normal text-[#94A3B8]">• 10 Comprehensive Modules</span>
          </h2>
          <span className="text-xs text-[#94A3B8]">{t('details', 'Tap any service to open')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() => (feat.action ? feat.action() : onSelectTab(feat.id))}
                className="cursor-pointer group p-5 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/45 hover:bg-[#1A3044] transition-all flex flex-col justify-between space-y-4 shadow-md active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl border ${feat.accent}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#20B8A8] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F4F8FB] group-hover:text-[#20B8A8] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed mt-1">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Helplines Quick Banner Strip */}
      <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#20B8A8] shrink-0" />
          <span>
            <strong className="text-[#F4F8FB]">{t('emergencyHelplines', 'Verified Emergency Directory')}:</strong> Ambulance <strong className="text-[#F4F8FB]">108 / 112</strong> • Police <strong className="text-[#F4F8FB]">100</strong> • Fire <strong className="text-[#F4F8FB]">101</strong> • Health <strong className="text-[#F4F8FB]">104</strong> • Women <strong className="text-[#F4F8FB]">1091</strong> • Tele-MANAS <strong className="text-[#F4F8FB]">14416</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSOS}
          className="text-[#EF4444] hover:text-[#DC2626] font-semibold flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444] rounded-md px-1"
        >
          <span>{t('details', 'View All Services')}</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
};
