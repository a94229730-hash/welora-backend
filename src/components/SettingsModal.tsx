import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Globe,
  Mic,
  Bell,
  Shield,
  Download,
  Trash2,
  LogOut,
  Info,
  Phone,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { User } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { WeloraLogo } from './WeloraLogo';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onOpenDisclaimer: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onDeleteAccount,
  onOpenDisclaimer,
}) => {
  const [activeTab, setActiveTab] = useState<
    'languages' | 'profile' | 'emergency' | 'notifications' | 'privacy' | 'about'
  >('languages');

  const {
    displayLanguage: globalDisplayLang,
    communicationLanguage: globalCommLang,
    setDisplayLanguage: setGlobalDisplayLang,
    setCommunicationLanguage: setGlobalCommLang,
    t,
  } = useLanguage();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(user?.healthProfile?.age || 30);
  const [bloodGroup, setBloodGroup] = useState(user?.healthProfile?.bloodGroup || 'B+');
  const [allergiesStr, setAllergiesStr] = useState(user?.healthProfile?.allergies?.join(', ') || '');
  const [chronicStr, setChronicStr] = useState(user?.healthProfile?.chronicConditions?.join(', ') || '');
  const [medsStr, setMedsStr] = useState(user?.healthProfile?.currentMedications?.join(', ') || '');

  // Emergency contact state
  const [contactName, setContactName] = useState(user?.emergencyContacts?.[0]?.name || 'Dr. Kavita Sharma (Spouse)');
  const [contactPhone, setContactPhone] = useState(user?.emergencyContacts?.[0]?.phone || '+91-9876543211');
  const [contactRelation, setContactRelation] = useState(user?.emergencyContacts?.[0]?.relation || 'Spouse');

  // Languages state
  const [displayLanguage, setDisplayLanguage] = useState(
    user?.displayLanguage || globalDisplayLang || 'English'
  );
  const [communicationLanguage, setCommunicationLanguage] = useState(
    user?.communicationLanguage || globalCommLang || 'English'
  );

  // Preferences
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAge(user.healthProfile.age);
      setBloodGroup(user.healthProfile.bloodGroup || 'B+');
      setAllergiesStr(user.healthProfile.allergies?.join(', ') || '');
      setChronicStr(user.healthProfile.chronicConditions?.join(', ') || '');
      setMedsStr(user.healthProfile.currentMedications?.join(', ') || '');
      setContactName(user.emergencyContacts?.[0]?.name || 'Family Contact');
      setContactPhone(user.emergencyContacts?.[0]?.phone || '+91-9876543210');
      setContactRelation(user.emergencyContacts?.[0]?.relation || 'Family');
      setDisplayLanguage(user.displayLanguage || globalDisplayLang || 'English');
      setCommunicationLanguage(user.communicationLanguage || globalCommLang || 'English');
    }
  }, [user, globalDisplayLang, globalCommLang]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: User = {
      ...user,
      name,
      phone,
      displayLanguage,
      communicationLanguage,
      emergencyContacts: [
        {
          name: contactName,
          phone: contactPhone,
          relation: contactRelation,
        },
      ],
      healthProfile: {
        ...user.healthProfile,
        age,
        bloodGroup,
        allergies: allergiesStr.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: chronicStr.split(',').map((s) => s.trim()).filter(Boolean),
        currentMedications: medsStr.split(',').map((s) => s.trim()).filter(Boolean),
      },
    };

    onUpdateUser(updated);
    setGlobalDisplayLang(displayLanguage);
    setGlobalCommLang(communicationLanguage);

    try {
      const token = localStorage.getItem('welora_token');
      await safeApiFetch(`/api/user/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updated),
      });
    } catch {}

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#142536] border border-[#20B8A8]/30 rounded-2xl p-6 shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E354A]">
          <div className="flex items-center gap-3">
            <WeloraLogo size="sm" showSubtitle={false} horizontal />
            <div>
              <h2 className="text-base font-bold text-[#F4F8FB]">Settings & Preferences</h2>
              <span className="text-xs text-[#94A3B8]">Account ID: {user.id}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F4F8FB] hover:bg-[#1A3044] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-3 border-b border-[#1E354A] text-xs">
          {[
            { id: 'languages', label: 'Language Preferences' },
            { id: 'profile', label: 'Edit Health Profile' },
            { id: 'emergency', label: 'Emergency Contacts' },
            { id: 'notifications', label: 'Reminders & Voice' },
            { id: 'privacy', label: 'Data & Privacy' },
            { id: 'about', label: 'App Information' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                activeTab === tab.id
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {/* TAB 1: Language and Regional Preferences (All 13 Languages) */}
          {activeTab === 'languages' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#0B1724] border border-[#20B8A8]/30 space-y-1">
                <h3 className="text-sm font-bold text-[#20B8A8] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#20B8A8]" />
                  <span>13 Indian Languages Supported</span>
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Welora supports separate preferences for your interface navigation and your AI healthcare dialogue, with full Right-to-Left (RTL) typography for Urdu.
                </p>
              </div>

              {/* Option A: App Display Language */}
              <div className="p-5 rounded-2xl bg-[#0B1724] border border-[#1E354A] space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#20B8A8] block">
                    Option A
                  </span>
                  <h4 className="text-sm font-bold text-[#F4F8FB]">
                    App Display Language
                  </h4>
                  <p className="text-xs text-[#94A3B8]">
                    Language used for menus, buttons, status indicators, and app navigation.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setDisplayLanguage(lang.name);
                        setGlobalDisplayLang(lang.name);
                      }}
                      className={`p-2.5 rounded-xl text-left border text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                        displayLanguage === lang.name
                          ? 'bg-[#20B8A8]/20 border-[#20B8A8] text-[#20B8A8] font-bold'
                          : 'bg-[#142536] border-[#1E354A] text-[#94A3B8] hover:border-[#20B8A8]/40 hover:text-[#F4F8FB]'
                      }`}
                    >
                      <div className="font-semibold">{lang.name}</div>
                      <div className="text-[10px] text-[#94A3B8]">{lang.nativeName}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option B: Preferred Communication Language */}
              <div className="p-5 rounded-2xl bg-[#0B1724] border border-[#1E354A] space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66D9E8] block">
                    Option B
                  </span>
                  <h4 className="text-sm font-bold text-[#F4F8FB]">
                    Preferred Communication Language (AI Assistant & Voice Mode)
                  </h4>
                  <p className="text-xs text-[#94A3B8]">
                    Language in which the AI Health Chatbot and Avatar Voice Assistant speak and explain clinical findings.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setCommunicationLanguage(lang.name);
                        setGlobalCommLang(lang.name);
                      }}
                      className={`p-2.5 rounded-xl text-left border text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                        communicationLanguage === lang.name
                          ? 'bg-[#66D9E8]/20 border-[#66D9E8] text-[#66D9E8] font-bold'
                          : 'bg-[#142536] border-[#1E354A] text-[#94A3B8] hover:border-[#20B8A8]/40 hover:text-[#F4F8FB]'
                      }`}
                    >
                      <div className="font-semibold">{lang.name}</div>
                      <div className="text-[10px] text-[#94A3B8]">{lang.nativeName}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Edit Health Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={110}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10) || 30)}
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  >
                    <option value="A+" className="bg-[#142536]">A+</option>
                    <option value="A-" className="bg-[#142536]">A-</option>
                    <option value="B+" className="bg-[#142536]">B+</option>
                    <option value="B-" className="bg-[#142536]">B-</option>
                    <option value="AB+" className="bg-[#142536]">AB+</option>
                    <option value="AB-" className="bg-[#142536]">AB-</option>
                    <option value="O+" className="bg-[#142536]">O+</option>
                    <option value="O-" className="bg-[#142536]">O-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Known Allergies (comma separated)
                </label>
                <input
                  type="text"
                  value={allergiesStr}
                  onChange={(e) => setAllergiesStr(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Chronic Medical Conditions
                </label>
                <input
                  type="text"
                  value={chronicStr}
                  onChange={(e) => setChronicStr(e.target.value)}
                  placeholder="e.g. Hypertension, Mild Asthma, Type 2 Diabetes"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Current Medications
                </label>
                <input
                  type="text"
                  value={medsStr}
                  onChange={(e) => setMedsStr(e.target.value)}
                  placeholder="e.g. Metformin 500mg, Daily Multivitamin"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>
            </form>
          )}

          {/* TAB 3: Emergency Contacts */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#F4F8FB]">
                Primary emergency contact is displayed on your personal medical history badge for rapid access during triage.
              </div>
              <div className="p-5 rounded-2xl bg-[#0B1724] border border-[#1E354A] space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-[#142536] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    placeholder="e.g. Spouse, Parent, Sibling"
                    className="w-full bg-[#142536] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Emergency Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full bg-[#142536] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notifications & Voice Preferences */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#0B1724] border border-[#1E354A] flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#F4F8FB] block">
                    Appointment Reminders
                  </span>
                  <span className="text-[#94A3B8]">
                    Receive weekly appointment reminders and preparation alerts.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#20B8A8] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#0B1724] border border-[#1E354A] flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#F4F8FB] block">
                    Automatic Spoken Voice Playback
                  </span>
                  <span className="text-[#94A3B8]">
                    Automatically speak AI responses in dedicated voice mode.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoVoiceReply}
                  onChange={(e) => setAutoVoiceReply(e.target.checked)}
                  className="w-5 h-5 accent-[#20B8A8] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Data & Privacy Controls */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-2">
                <span className="text-sm font-bold text-[#F4F8FB] block">
                  Confidentiality & Role-Based Isolation
                </span>
                <p className="text-[#94A3B8] leading-relaxed">
                  Your medical consultations, prescriptions, and lab comparisons are strictly partitioned to your individual user account ({user.id}) and are not shared across profiles.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-[#0B1724] hover:bg-[#1A3044] text-[#F4F8FB] border border-[#1E354A] flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account & Purge Records</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: App Information & Terms */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs">
              <div className="p-6 rounded-2xl bg-[#0B1724] border border-[#1E354A] text-center space-y-3">
                <WeloraLogo size="md" showSubtitle showTagline />
                <p className="text-[#94A3B8] max-w-md mx-auto pt-2 leading-relaxed">
                  Welora Avatar AI is a full-featured clinical health intelligence companion delivering symptom triage, OCR prescription parsing, longitudinal lab comparisons, emergency assistance, and doctor scheduling.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#F4F8FB] block">Medical Disclaimer</span>
                  <span className="text-[#94A3B8]">Review terms of educational AI use</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenDisclaimer}
                  className="px-3 py-1.5 rounded-lg bg-[#20B8A8]/20 border border-[#20B8A8] text-[#20B8A8] font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
                >
                  View Disclaimer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Save Changes */}
        <div className="pt-4 border-t border-[#1E354A] flex items-center justify-between">
          <span className="text-xs text-[#94A3B8]">
            {saveSuccess ? (
              <span className="text-[#20B8A8] font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Preferences Saved Successfully!
              </span>
            ) : (
              'Changes saved instantly to your profile'
            )}
          </span>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="px-6 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
