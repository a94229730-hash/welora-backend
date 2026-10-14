import React from 'react';
import {
  AlertTriangle,
  Mic,
  Settings,
  User as UserIcon,
  Menu,
  X,
  Stethoscope,
  Bot,
  FileText,
  FileCheck2,
  HeartHandshake,
  MapPin,
  Calendar,
  History,
  BookOpen,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { WeloraLogo } from './WeloraLogo';
import { User } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onOpenSOS: () => void;
  onOpenVoice: () => void;
  onOpenAdmin: () => void;
  language?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onOpenAuth,
  onOpenSettings,
  onOpenSOS,
  onOpenVoice,
  onOpenAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { displayLanguage, setDisplayLanguage, t } = useLanguage();

  const navItems = [
    { id: 'symptoms', label: t('symptomChecker', 'Symptom Checker'), icon: Stethoscope },
    { id: 'chat', label: t('aiAssistant', 'AI Assistant'), icon: Bot },
    { id: 'prescription', label: t('prescriptionScan', 'Prescription OCR'), icon: FileText },
    { id: 'lab', label: t('labReports', 'Lab Reports'), icon: FileCheck2 },
    { id: 'homecare', label: t('homeRemedies', 'Home Care'), icon: HeartHandshake },
    { id: 'hospitals', label: t('nearbyHospitals', 'Find Hospitals'), icon: MapPin },
    { id: 'appointments', label: t('appointments', 'Appointments'), icon: Calendar },
    { id: 'history', label: t('medicalHistory', 'Medical History'), icon: History },
    { id: 'journal', label: t('healthJournal', 'Health Journal'), icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B1724]/95 backdrop-blur-xl border-b border-[#1E354A]">
      {/* Top Demo simulation notice & Tagline strip */}
      <div className="bg-[#142536] border-b border-[#20B8A8]/20 px-4 py-1 text-center text-[11px] text-[#66D9E8] font-medium flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#20B8A8] animate-pulse" />
        <span>
          <strong className="text-[#F4F8FB]">Welora Avatar AI:</strong>{' '}
          <span className="text-[#20B8A8] font-bold">{t('nextGenIntelligence', 'Next Generation Healthcare Intelligence')}</span>{' '}
          <span className="text-[#1E354A]">•</span>{' '}
          <span>{t('tagline', 'Understand Your Health. Make Informed Decisions. Care with Confidence.')}</span>
        </span>
        <span className="hidden md:inline text-[#1E354A]">•</span>
        <span className="hidden md:inline text-[#94A3B8]">
          Demo Application (Emergency simulations active)
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div
          onClick={() => onSelectTab('home')}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        >
          <WeloraLogo size="sm" showSubtitle horizontal />
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1 relative transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] rounded-md px-1 ${
                  isActive ? 'text-[#20B8A8] font-bold' : 'text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#20B8A8] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons & Primary Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prominent Red Emergency SOS Button */}
          <button
            type="button"
            onClick={onOpenSOS}
            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#F4F8FB] font-extrabold text-xs shadow-lg shadow-[#EF4444]/25 active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5 border border-[#EF4444]/60 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
            title="Open SOS Emergency Alert & Helplines"
            aria-label="Emergency SOS"
          >
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F4F8FB]" />
            <span className="tracking-wide text-[11px] sm:text-xs">SOS</span>
          </button>

          {/* Dedicated Voice Assistant Icon */}
          <button
            type="button"
            onClick={onOpenVoice}
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#142536] hover:bg-[#1A3044] text-[#66D9E8] hover:text-[#F4F8FB] font-semibold text-xs border border-[#20B8A8]/30 shadow-md active:scale-95 transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            title="Open Dedicated Voice Avatar Mode"
            aria-label="Voice Avatar Mode"
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#66D9E8]" />
            <span className="hidden sm:inline">{t('voiceAssistant', 'Voice Mode')}</span>
          </button>

          {/* Global Language Selector (13 Languages) */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/60 transition-colors">
            <Globe className="w-3.5 h-3.5 text-[#20B8A8] shrink-0" />
            <select
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="bg-transparent text-xs text-[#20B8A8] font-bold outline-none cursor-pointer max-w-[85px] sm:max-w-none"
              title="Select Application Language (13 Languages)"
              aria-label="Application Language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.name} className="bg-[#142536] text-[#F4F8FB] font-medium">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Admin Dashboard Trigger */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hidden sm:flex p-2 rounded-xl text-[#94A3B8] hover:text-[#20B8A8] hover:bg-[#142536] border border-transparent hover:border-[#1E354A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            title="Admin Audit Log"
            aria-label="Admin Dashboard"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#F4F8FB] bg-[#142536]/80 sm:bg-transparent hover:bg-[#142536] border border-[#1E354A]/80 sm:border-transparent hover:border-[#1E354A] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            title={t('settings', 'Settings & Language')}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Auth Profile */}
          {user ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              title="View Account"
            >
              <span className="text-xs font-semibold text-[#F4F8FB] max-w-[80px] truncate">
                {user.name}
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#20B8A8] text-[#0B1724] font-bold flex items-center justify-center text-xs">
                {user.name.charAt(0)}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:block px-3.5 py-1.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            >
              {t('signIn', 'Sign In')}
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-[#94A3B8] hover:text-[#F4F8FB] hover:bg-[#142536] border border-[#1E354A]/60 sm:border-transparent shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B1724] border-b border-[#1E354A] p-4 space-y-3 animate-fadeIn max-h-[85vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#1E354A]/60">
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 text-xs font-semibold text-[#F4F8FB] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#20B8A8]" />
              <span>{t('settings', 'Settings')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAdmin();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 text-xs font-semibold text-[#F4F8FB] transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-[#20B8A8]" />
              <span>Admin Access</span>
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-[#142536] border border-[#20B8A8]/30 text-xs font-semibold text-[#F4F8FB]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#20B8A8] text-[#0B1724] font-bold flex items-center justify-center text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <span>{user.name}</span>
                </div>
                <span className="text-[11px] text-[#20B8A8] font-semibold">Account Profile &rarr;</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#20B8A8] text-[#0B1724] font-bold text-xs"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t('signIn', 'Sign In / Register Profile')}</span>
              </button>
            )}
          </div>

          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#142536] border border-[#1E354A]">
            <span className="text-xs text-[#F4F8FB] font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#20B8A8]" />
              App Language (13 Languages):
            </span>
            <select
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="bg-[#0B1724] text-xs text-[#20B8A8] font-bold outline-none cursor-pointer px-2 py-1 rounded-lg border border-[#1E354A]"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.name} className="bg-[#142536] text-[#F4F8FB]">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* All 9 Clinical Feature Tabs */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#142536] text-[#20B8A8] border border-[#20B8A8]/30 font-bold'
                      : 'text-[#94A3B8] hover:bg-[#142536] hover:text-[#F4F8FB]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#20B8A8]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
