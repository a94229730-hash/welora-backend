import React, { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { Stethoscope, HeartPulse, Upload, AlertCircle, Camera, Check } from 'lucide-react';

interface DoctorAvatarProps {
  doctor: Doctor;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  allowCustomUpload?: boolean;
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  doctor,
  size = 'md',
  className = '',
  allowCustomUpload = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load any verified custom image URL saved in localStorage for this doctor
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`welora_doctor_avatar_${doctor.id}`);
      if (saved) {
        setCustomAvatar(saved);
        setHasError(false);
      }
    } catch {}
  }, [doctor.id]);

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-28 h-28 text-lg',
  }[size];

  // Extract doctor initials (e.g. Dr. Priya Sundaram -> PS)
  const getInitials = (name: string) => {
    const clean = name.replace(/^Dr\.?\s+/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    try {
      localStorage.setItem(`welora_doctor_avatar_${doctor.id}`, inputUrl.trim());
      setCustomAvatar(inputUrl.trim());
      setHasError(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowUploadModal(false);
      }, 1200);
    } catch {}
  };

  const activeSrc = customAvatar || doctor.avatar;

  // Render neutral clinical monogram placeholder if missing or failed to load
  if (hasError || !activeSrc) {
    return (
      <div className="relative group inline-block shrink-0">
        <div
          role="img"
          aria-label={`${doctor.name} - Official Profile Placeholder`}
          className={`${sizeClasses} ${className} rounded-xl bg-gradient-to-br from-[#142536] via-[#1A3044] to-[#0B1724] border-2 border-[#20B8A8]/40 flex flex-col items-center justify-center text-[#66D9E8] font-bold shadow-md select-none relative overflow-hidden`}
        >
          {/* Subtle medical watermark in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            {doctor.specialty.toLowerCase().includes('cardio') ? (
              <HeartPulse className="w-12 h-12 text-[#20B8A8]" />
            ) : (
              <Stethoscope className="w-12 h-12 text-[#20B8A8]" />
            )}
          </div>

          <span className="relative z-10 font-extrabold tracking-wider text-[#66D9E8]">
            {getInitials(doctor.name)}
          </span>
          <span className="relative z-10 text-[9px] uppercase tracking-tighter text-[#94A3B8] font-semibold mt-0.5">
            MD
          </span>
        </div>

        {/* Informative hover badge showing authentic photo status */}
        {allowCustomUpload && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            title="Upload or configure authentic doctor photo"
            className="absolute -bottom-1 -right-1 p-1 bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-[#20B8A8]"
          >
            <Camera className="w-3 h-3" />
          </button>
        )}

        {/* Modal for setting verified photo URL */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/80 backdrop-blur-sm">
            <div className="bg-[#142536] border border-[#20B8A8]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
              <h4 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#20B8A8]" />
                <span>Set Photo for {doctor.name}</span>
              </h4>
              <p className="text-xs text-[#94A3B8]">
                Provide an authentic photo URL or local public path for {doctor.name}.
              </p>
              <form onSubmit={handleSaveCustomUrl} className="space-y-3">
                <input
                  type="url"
                  required
                  placeholder="https://... or /assets/priya-sundaram.jpg"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2 text-xs text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B1724] text-[#94A3B8] text-xs font-semibold hover:text-[#F4F8FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#20B8A8] text-[#0B1724] text-xs font-bold hover:bg-[#1AA394] flex items-center gap-1"
                  >
                    {saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>Save Photo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group inline-block shrink-0">
      <img
        src={activeSrc}
        alt={doctor.name}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${sizeClasses} ${className} rounded-xl object-cover border border-[#1E354A] shrink-0`}
      />
      {allowCustomUpload && (
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          title="Update doctor photo"
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-1 -right-1 p-1 bg-[#142536] hover:bg-[#20B8A8] hover:text-[#0B1724] text-[#94A3B8] border border-[#1E354A] rounded-full shadow-lg"
        >
          <Camera className="w-3 h-3" />
        </button>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/80 backdrop-blur-sm">
          <div className="bg-[#142536] border border-[#20B8A8]/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h4 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#20B8A8]" />
              <span>Update Photo for {doctor.name}</span>
            </h4>
            <form onSubmit={handleSaveCustomUrl} className="space-y-3">
              <input
                type="url"
                required
                placeholder="https://... or /assets/priya-sundaram.jpg"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2 text-xs text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B1724] text-[#94A3B8] text-xs font-semibold hover:text-[#F4F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#20B8A8] text-[#0B1724] text-xs font-bold hover:bg-[#1AA394]"
                >
                  Save Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
