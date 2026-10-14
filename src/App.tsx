/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeScreen } from './components/HomeScreen';
import { SymptomChecker } from './components/SymptomChecker';
import { AIHealthChatbot } from './components/AIHealthChatbot';
import { DedicatedVoiceAssistant } from './components/DedicatedVoiceAssistant';
import { PrescriptionScanner } from './components/PrescriptionScanner';
import { LabReportScanner } from './components/LabReportScanner';
import { HomeCareRemedies } from './components/HomeCareRemedies';
import { NearbyHospitals } from './components/NearbyHospitals';
import { DoctorAppointments } from './components/DoctorAppointments';
import { MedicalHistory } from './components/MedicalHistory';
import { HealthJournal } from './components/HealthJournal';
import { EmergencyScreen } from './components/EmergencyScreen';
import { MedicalDisclaimerModal } from './components/MedicalDisclaimerModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { User } from './types';
import { SUPPORTED_LANGUAGES } from './data/languages';
import { useLanguage } from './context/LanguageContext';
import { safeApiFetch } from './utils/apiClient';

const DEFAULT_USER: User = {
  id: 'usr_default_rahul',
  name: 'Rahul Sharma',
  email: 'rahul.sharma@example.com',
  phone: '+91-9876543210',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rahul',
  authProvider: 'google',
  displayLanguage: 'English',
  communicationLanguage: 'English',
  createdAt: new Date().toISOString(),
  emergencyContacts: [
    { name: 'Dr. Kavita Sharma (Spouse)', phone: '+91-9876543211', relation: 'Spouse' },
  ],
  healthProfile: {
    age: 34,
    bloodGroup: 'B+',
    allergies: ['Penicillin'],
    chronicConditions: ['None'],
    currentMedications: ['Daily Multivitamin'],
  },
};

export default function App() {
  const { displayLanguage } = useLanguage();

  // Disclaimer state (mandatory first screen)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    return localStorage.getItem('welora_disclaimer_accepted') === 'true';
  });
  const [showDisclaimerReview, setShowDisclaimerReview] = useState(false);

  // User state
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('welora_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_USER;
  });

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modals state
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync user changes to storage
  const handleUpdateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('welora_user', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('welora_user');
    localStorage.removeItem('welora_token');
    setIsSettingsOpen(false);
    setIsAuthOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to permanently delete your account and all health records?')) {
      return;
    }
    try {
      const token = localStorage.getItem('welora_token');
      await safeApiFetch(`/api/user/account/${user.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    localStorage.removeItem('welora_user');
    localStorage.removeItem('welora_token');
    setUser(DEFAULT_USER);
    setIsSettingsOpen(false);
  };

  const handleDisclaimerAccepted = () => {
    localStorage.setItem('welora_disclaimer_accepted', 'true');
    setDisclaimerAccepted(true);
    setShowDisclaimerReview(false);
  };

  const handleSaveToHistory = async (record: any) => {
    try {
      const token = localStorage.getItem('welora_token');
      const newRec = {
        ...record,
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        createdAt: new Date().toISOString(),
      };

      // Update local storage history immediately
      const saved = localStorage.getItem(`welora_records_${user.id}`);
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(newRec);
      localStorage.setItem(`welora_records_${user.id}`, JSON.stringify(list));

      await safeApiFetch(`/api/medical-records/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.warn('Record saved locally:', err);
    }
  };

  // Language & RTL handling
  const langObj = SUPPORTED_LANGUAGES.find((l) => l.name === displayLanguage);
  const isRTL = Boolean(langObj?.isRTL);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = langObj?.code || 'en';
  }, [isRTL, langObj]);

  // Bootstrap session token
  useEffect(() => {
    if (!localStorage.getItem('welora_token')) {
      safeApiFetch('/api/auth/demo-session')
        .then((res) => {
          if (res.success && res.data?.token) {
            localStorage.setItem('welora_token', res.data.token);
            if (!localStorage.getItem('welora_user') && res.data.user) {
              setUser(res.data.user);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className={`min-h-screen flex flex-col bg-[#0B1724] text-[#F4F8FB] selection:bg-[#20B8A8] selection:text-[#0B1724] overflow-x-hidden w-full max-w-full ${isRTL ? 'font-arabic' : ''}`}>
      {/* 1. Mandatory First-screen Medical Disclaimer */}
      {(!disclaimerAccepted || showDisclaimerReview) && (
        <MedicalDisclaimerModal
          onAccept={handleDisclaimerAccepted}
          language={displayLanguage}
        />
      )}

      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'sos') {
            setIsSOSOpen(true);
          } else {
            setCurrentTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSOS={() => setIsSOSOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        language={displayLanguage}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-8 overflow-x-hidden">
        {currentTab === 'home' && (
          <HomeScreen
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenSOS={() => setIsSOSOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            user={user}
            language={displayLanguage}
          />
        )}

        {currentTab === 'symptoms' && (
          <SymptomChecker
            user={user}
            onOpenSOS={() => setIsSOSOpen(true)}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}

        {currentTab === 'chat' && (
          <AIHealthChatbot
            user={user}
            onOpenSOS={() => setIsSOSOpen(true)}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}

        {currentTab === 'prescription' && (
          <PrescriptionScanner
            user={user}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}

        {currentTab === 'lab' && (
          <LabReportScanner
            user={user}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}

        {currentTab === 'homecare' && (
          <HomeCareRemedies
            user={user}
            onOpenSOS={() => setIsSOSOpen(true)}
            language={displayLanguage}
          />
        )}

        {currentTab === 'hospitals' && (
          <NearbyHospitals language={displayLanguage} />
        )}

        {currentTab === 'appointments' && (
          <DoctorAppointments
            user={user}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}

        {currentTab === 'history' && (
          <MedicalHistory
            user={user}
            onUpdateUser={handleUpdateUser}
            onNavigateTab={setCurrentTab}
            language={displayLanguage}
          />
        )}

        {currentTab === 'journal' && (
          <HealthJournal
            user={user}
            onSaveToHistory={handleSaveToHistory}
            language={displayLanguage}
          />
        )}
      </main>

      {/* Dedicated Separate Voice Assistant Modal Screen */}
      {isVoiceOpen && (
        <DedicatedVoiceAssistant
          onClose={() => setIsVoiceOpen(false)}
          user={user}
          onOpenSOS={() => {
            setIsVoiceOpen(false);
            setIsSOSOpen(true);
          }}
          language={displayLanguage}
        />
      )}

      {/* SOS Emergency Alert & Siren Screen */}
      {isSOSOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1724]/95 backdrop-blur-md overflow-y-auto p-4 sm:p-6 animate-fadeIn">
          <EmergencyScreen
            onClose={() => setIsSOSOpen(false)}
            language={displayLanguage}
          />
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => handleUpdateUser(u)}
      />

      {/* Settings & Profile Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenDisclaimer={() => setShowDisclaimerReview(true)}
      />

      {/* Admin Dashboard Audit Log Modal */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* Footer */}
      <Footer
        onOpenDisclaimer={() => setShowDisclaimerReview(true)}
        onOpenSOS={() => setIsSOSOpen(true)}
        language={displayLanguage}
      />
    </div>
  );
}
