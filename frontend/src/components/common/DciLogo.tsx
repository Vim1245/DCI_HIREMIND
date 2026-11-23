import React from 'react';

interface DciLogoProps {
  className?: string;
  size?: number | string;
}

export const DciLogo: React.FC<DciLogoProps> = ({
  className = 'w-9 h-9',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-label="DCI Logo"
    >
      <defs>
        {/* Dark navy background gradient */}
        <linearGradient id="dci-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#070D1E" />
        </linearGradient>

        {/* Teal #00D6B5 border accent */}
        <linearGradient id="dci-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D6B5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#008f7a" stopOpacity="0.35" />
        </linearGradient>

        {/* Teal monogram gradient */}
        <linearGradient id="dci-teal-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D6B5" />
          <stop offset="100%" stopColor="#00A389" />
        </linearGradient>
      </defs>

      {/* Dark Navy Rounded Container with Crisp Teal Border */}
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="10"
        fill="url(#dci-bg-grad)"
        stroke="url(#dci-border-grad)"
        strokeWidth="1.5"
      />

      {/* DCI Monogram Geometry */}
      {/* 'D' - White Vertical Spine */}
      <rect x="9" y="11" width="3.5" height="22" rx="1.75" fill="#FFFFFF" />

      {/* 'D' - Bold Teal Outer Curve */}
      <path
        d="M11 11H18.5C23.5 11 27 14.5 27 22C27 29.5 23.5 33 18.5 33H11"
        stroke="url(#dci-teal-accent)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 'C' - White Central Precision Contour */}
      <path
        d="M22 17.5C20.5 15.5 18 14.5 15.5 14.5C11.5 14.5 8.5 17.5 8.5 22C8.5 26.5 11.5 29.5 15.5 29.5C18 29.5 20.5 28.5 22 26.5"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* 'I' - Teal Vertical Accent Stem with White Top Illuminating Node */}
      <rect x="31" y="17" width="3.5" height="16" rx="1.75" fill="url(#dci-teal-accent)" />
      <circle cx="32.75" cy="12" r="2" fill="#FFFFFF" />
    </svg>
  );
};

interface DciBrandProps {
  badgeText?: string;
  subtitle?: string;
  className?: string;
  logoSize?: string;
  textColor?: string;
}

export const DciBrand: React.FC<DciBrandProps> = ({
  badgeText = 'ENTERPRISE',
  subtitle = 'AI HR & Recruitment Platform',
  className = '',
  logoSize = 'w-9 h-9',
  textColor = 'text-white',
}) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <DciLogo className={logoSize} />
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-extrabold text-xl sm:text-2xl tracking-tight leading-none ${textColor} font-sans`}>
            DCI
          </span>
          {badgeText && (
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#00D6B5]/15 text-[#00D6B5] border border-[#00D6B5]/30 shadow-xs">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium tracking-tight truncate hidden sm:block mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
