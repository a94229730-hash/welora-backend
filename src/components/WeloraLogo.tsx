import React from 'react';

interface WeloraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showTagline?: boolean;
  className?: string;
  horizontal?: boolean;
}

export const WeloraLogo: React.FC<WeloraLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showTagline = false,
  className = '',
  horizontal = false,
}) => {
  const sizeMap = {
    sm: { icon: 38, title: 'text-base', sub: 'text-[9px]', tag: 'text-[10px]' },
    md: { icon: 56, title: 'text-xl', sub: 'text-[10px]', tag: 'text-xs' },
    lg: { icon: 84, title: 'text-3xl', sub: 'text-xs', tag: 'text-sm' },
    xl: { icon: 124, title: 'text-4xl', sub: 'text-xs', tag: 'text-base' },
  };

  const dim = sizeMap[size];

  const emblem = (
    <div className="relative inline-flex items-center justify-center select-none shrink-0" style={{ width: dim.icon, height: dim.icon }}>
      {/* Outer ambient glow using Welora Medical Teal & Soft Cyan */}
      <div
        className="absolute inset-0 rounded-full blur-md opacity-75 bg-gradient-to-br from-[#20B8A8] via-[#66D9E8] to-[#142536] animate-pulse"
        style={{ transform: 'scale(1.15)' }}
      />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_18px_rgba(32,184,168,0.75)]"
      >
        <defs>
          <linearGradient id="weloraRibbonGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#66D9E8" />
            <stop offset="45%" stopColor="#20B8A8" />
            <stop offset="80%" stopColor="#142536" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="orbitGrad" x1="10" y1="90" x2="190" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#20B8A8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#66D9E8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#20B8A8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="avatarFaceGrad" x1="110" y1="40" x2="155" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F4F8FB" />
            <stop offset="100%" stopColor="#66D9E8" />
          </linearGradient>
        </defs>

        {/* Orbital Ring behind */}
        <ellipse
          cx="100"
          cy="98"
          rx="82"
          ry="32"
          stroke="url(#orbitGrad)"
          strokeWidth="2.5"
          transform="rotate(-20 100 98)"
          strokeDasharray="4 2"
          opacity="0.85"
        />

        {/* Flowing 'W' Ribbon Body in Medical Teal & Soft Cyan */}
        <path
          d="M 45 65 C 35 75 40 135 70 148 C 88 156 100 130 108 108 C 115 88 126 50 145 42 C 160 36 150 55 140 70 C 130 85 118 140 100 156 C 85 170 56 160 40 138 C 24 116 28 85 45 65 Z"
          fill="url(#weloraRibbonGrad)"
        />

        {/* Central folded curve */}
        <path
          d="M 52 72 C 65 60 88 95 105 130 C 115 110 125 80 135 60 C 125 50 90 105 75 125 C 65 115 55 90 52 72 Z"
          fill="#20B8A8"
          opacity="0.95"
        />

        {/* Serene Avatar Profile Silhouette */}
        <path
          d="M 124 54 C 132 50 142 54 148 62 C 151 66 153 72 150 78 C 147 82 143 85 140 88 C 142 92 145 94 146 98 C 144 100 139 101 136 100 C 131 106 126 112 120 116 C 117 114 118 104 121 96 C 122 88 123 78 124 54 Z"
          fill="url(#avatarFaceGrad)"
        />

        {/* Serene closed eye eyelash */}
        <path
          d="M 136 71 C 139 74 143 73 145 71"
          stroke="#0B1724"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Celestial 4-Point Star Glint Top Right */}
        <path
          d="M 158 50 Q 158 60 168 60 Q 158 60 158 70 Q 158 60 148 60 Q 158 60 158 50 Z"
          fill="#F4F8FB"
          className="drop-shadow-[0_0_8px_#66D9E8]"
        />
        <circle cx="158" cy="60" r="1.5" fill="#66D9E8" />

        {/* Lower sparkling accent */}
        <path
          d="M 45 130 Q 45 136 51 136 Q 45 136 45 142 Q 45 136 39 136 Q 45 136 45 130 Z"
          fill="#66D9E8"
          opacity="0.85"
        />
      </svg>
    </div>
  );

  return (
    <div
      className={`inline-flex ${
        horizontal ? 'flex-row items-center gap-3.5' : 'flex-col items-center text-center gap-2'
      } ${className}`}
    >
      {emblem}
      <div className={`flex flex-col ${horizontal ? 'items-start text-left' : 'items-center text-center'}`}>
        {/* Brand Name Typography */}
        <div className={`font-black tracking-[0.22em] text-[#F4F8FB] flex items-center leading-none ${dim.title}`}>
          <span>WEL</span>
          {/* Stylized O with 4-point star inside in Medical Teal */}
          <span className="relative inline-flex items-center justify-center mx-[0.04em]">
            <span className="text-[#20B8A8]">O</span>
            <span className="absolute text-[0.45em] text-[#F4F8FB]">✦</span>
          </span>
          <span>RA</span>
        </div>

        {/* Under logo line: Next Generation Healthcare Intelligence */}
        {showSubtitle && (
          <div className={`tracking-[0.14em] uppercase font-bold text-[#66D9E8] mt-1 flex flex-wrap items-center gap-1.5 ${dim.sub}`}>
            <span>AVATAR AI</span>
            <span className="text-[#20B8A8] font-bold">•</span>
            <span className="text-[#20B8A8]">NEXT GENERATION HEALTHCARE INTELLIGENCE</span>
          </div>
        )}

        {/* Tagline */}
        {showTagline && (
          <p className={`text-[#94A3B8] font-normal mt-1.5 max-w-sm ${dim.tag}`}>
            Understand Your Health. Make Informed Decisions. Care with Confidence.
          </p>
        )}
      </div>
    </div>
  );
};
