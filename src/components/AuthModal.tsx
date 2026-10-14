import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  Shield,
  CheckCircle,
  Users,
  KeyRound,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { User } from '../types';
import { WeloraLogo } from './WeloraLogo';
import { safeApiFetch } from '../utils/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [emailInput, setEmailInput] = useState('rahul.sharma@example.com');
  const [userName, setUserName] = useState('Rahul Sharma');
  const [phoneInput, setPhoneInput] = useState('+91-9876543210');
  const [otpStep, setOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState('482910');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const demoAccounts = [
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+91-9876543210',
      blood: 'B+',
      age: 34,
      allergies: ['Penicillin'],
    },
    {
      name: 'Pooja Patel',
      email: 'pooja.patel@example.com',
      phone: '+91-9820012345',
      blood: 'O+',
      age: 29,
      allergies: ['Sulfa drugs', 'Pollen'],
    },
    {
      name: 'Vikram Joshi',
      email: 'vikram.joshi@example.com',
      phone: '+91-9811122233',
      blood: 'A+',
      age: 52,
      allergies: [],
    },
  ];

  const handleGoogleLogin = async (emailOverride?: string, nameOverride?: string) => {
    setLoading(true);
    setErrorMsg(null);
    const targetEmail = emailOverride || emailInput;
    const targetName = nameOverride || userName;

    try {
      const res = await safeApiFetch<any>('/api/auth/login-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
        }),
      });

      if (res.success && res.data?.user) {
        if (res.data.token) {
          localStorage.setItem('welora_token', res.data.token);
        }
        onLoginSuccess(res.data.user);
        onClose();
      } else {
        // Resilient client fallback (for Netlify static demo)
        const mockUser: User = {
          id: 'usr_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 15),
          email: targetEmail,
          name: targetName,
          phone: phoneInput,
          authProvider: 'google',
          displayLanguage: 'English',
          communicationLanguage: 'English',
          createdAt: new Date().toISOString(),
          emergencyContacts: [
            { name: 'Primary Emergency Contact', phone: '+91-9876543210', relation: 'Family' },
          ],
          healthProfile: {
            age: 34,
            bloodGroup: 'B+',
            allergies: ['Penicillin'],
            chronicConditions: ['None'],
            currentMedications: ['Daily Multivitamin'],
          },
        };
        onLoginSuccess(mockUser);
        onClose();
      }
    } catch {
      setErrorMsg('Failed to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await safeApiFetch<any>('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });

      setOtpStep(true);
    } catch {
      setOtpStep(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await safeApiFetch<any>('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneInput,
          otp: otpInput,
          name: userName,
        }),
      });

      if (res.success && res.data?.user) {
        if (res.data.token) {
          localStorage.setItem('welora_token', res.data.token);
        }
        onLoginSuccess(res.data.user);
        onClose();
      } else {
        // Resilient client fallback
        const mockPhoneUser: User = {
          id: 'usr_ph_' + phoneInput.replace(/[^0-9]/g, '').slice(-10),
          phone: phoneInput,
          email: `${userName.toLowerCase().replace(/\s+/g, '.')}@welora.health`,
          name: userName || 'Welora Member',
          authProvider: 'phone',
          displayLanguage: 'English',
          communicationLanguage: 'English',
          createdAt: new Date().toISOString(),
          emergencyContacts: [
            { name: 'Family Contact', phone: '+91-9876543210', relation: 'Family' },
          ],
          healthProfile: {
            age: 30,
            bloodGroup: 'O+',
            allergies: [],
            chronicConditions: [],
            currentMedications: [],
          },
        };
        onLoginSuccess(mockPhoneUser);
        onClose();
      }
    } catch {
      setErrorMsg('Phone authentication verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#142536] border border-[#20B8A8]/40 rounded-3xl p-6 sm:p-7 shadow-2xl my-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F4F8FB] p-1.5 rounded-xl hover:bg-[#1A3044] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <WeloraLogo size="sm" showSubtitle={false} />
          <h2 className="text-xl font-bold text-[#F4F8FB] mt-2">
            Secure User Sign-In
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Personal medical records and consultation history are strictly confidential.
          </p>
        </div>

        {/* Auth Method Selector */}
        <div className="flex items-center gap-2 p-1 bg-[#0B1724] border border-[#1E354A] rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('google');
              setOtpStep(false);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
              authMethod === 'google'
                ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F4F8FB]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Google Sign-In</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('phone')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
              authMethod === 'phone'
                ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F4F8FB]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs">
            {errorMsg}
          </div>
        )}

        {/* Method 1: Google Login */}
        {authMethod === 'google' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                Your Email Address
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
              />
            </div>

            <button
              type="button"
              disabled={loading || !emailInput.trim()}
              onClick={() => handleGoogleLogin()}
              className="w-full py-3 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Quick Demo Accounts Switcher */}
            <div className="pt-3 border-t border-[#1E354A] space-y-2">
              <span className="text-[11px] text-[#94A3B8] block font-semibold">
                Or select a test demonstration profile:
              </span>
              <div className="space-y-1.5">
                {demoAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEmailInput(acc.email);
                      setUserName(acc.name);
                      handleGoogleLogin(acc.email, acc.name);
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] border border-[#1E354A] text-left flex items-center justify-between text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
                  >
                    <div>
                      <span className="font-bold text-[#F4F8FB] block">{acc.name}</span>
                      <span className="text-[10px] text-[#94A3B8]">
                        {acc.email} • Age: {acc.age} • Blood: {acc.blood}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#20B8A8]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Method 2: Mobile Phone OTP */}
        {authMethod === 'phone' && (
          <div>
            {!otpStep ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8] font-mono"
                  />
                  <span className="text-[10px] text-[#94A3B8] mt-1 block">
                    A 6-digit OTP code will be sent to verify your device.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <span>Request Verification OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-[#0B1724] rounded-xl border border-[#1E354A] text-xs text-[#94A3B8]">
                  <span>OTP code sent to </span>
                  <strong className="text-[#20B8A8] font-mono">{phoneInput}</strong>
                  <div className="text-[10px] text-[#66D9E8] mt-1 font-mono">
                    (Verified Demo Code: 482910)
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-3 text-center tracking-widest text-lg font-mono font-bold text-[#20B8A8] outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Verify & Access Account</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpStep(false)}
                  className="w-full text-center text-xs text-[#94A3B8] hover:text-[#F4F8FB] pt-1"
                >
                  Change Phone Number
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
