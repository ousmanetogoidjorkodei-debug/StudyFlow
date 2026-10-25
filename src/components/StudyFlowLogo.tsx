import React from 'react';

interface StudyFlowLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
  useImage?: boolean;
}

export const StudyFlowLogo: React.FC<StudyFlowLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  layout = 'horizontal',
  useImage = true,
}) => {
  const [imgError, setImgError] = React.useState(false);

  // Size mapping for the icon
  const iconDimensions = {
    sm: { width: 32, height: 32, textClass: 'text-lg font-bold' },
    md: { width: 40, height: 40, textClass: 'text-xl font-bold' },
    lg: { width: 56, height: 56, textClass: 'text-2xl font-extrabold' },
    xl: { width: 80, height: 80, textClass: 'text-3xl font-extrabold' },
  }[size];

  // SVG representation matching the user's uploaded logo:
  // Black squircle icon with white book and rising diagonal arrow
  const LogoIcon = () => (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full select-none"
    >
      {/* Background: Rounded black square / app icon badge */}
      <rect width="200" height="200" rx="46" fill="#0A0A0C" />

      {/* Left side book depth / outer pages layer */}
      <path
        d="M40 72V136L34 130V78L40 72Z"
        fill="#FFFFFF"
      />

      {/* Outer book cover base (Bottom V-shape spine and book bottom) */}
      <path
        d="M48 66L100 78L152 66V138L100 166L48 138V66Z"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Main Left Page leaf */}
      <path
        d="M98 78C76 66 56 60 50 64V134C56 130 76 136 98 148V78Z"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="#0A0A0C"
      />

      {/* Main Right Page leaf */}
      <path
        d="M102 78C124 66 144 60 150 64V134C144 130 124 136 102 148V78Z"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="#0A0A0C"
      />

      {/* Inner page contour ridges */}
      <path
        d="M58 82C72 74 84 74 96 82"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M142 82C128 74 116 74 104 82"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M56 126C70 120 84 122 96 134"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M144 126C130 120 116 122 104 134"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Center spine crease line */}
      <path
        d="M100 76V152"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Black halo / cutout around ascending arrow for maximum definition */}
      <path
        d="M26 144C44 120 74 104 98 114C122 124 142 106 160 84"
        stroke="#0A0A0C"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* Dynamic Rising Arrow Swoosh Body (Pure White) */}
      <path
        d="M28 142C44 122 74 108 98 116C122 124 142 108 162 82L156 74C138 100 118 112 98 104C74 94 48 110 32 134L28 142Z"
        fill="#FFFFFF"
      />

      {/* Sharp Triangular Arrow Head pointing up-right */}
      <polygon
        points="152,60 184,56 172,88 163,75 152,60"
        fill="#FFFFFF"
        stroke="#0A0A0C"
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <div
      className={`inline-flex items-center select-none ${
        layout === 'vertical' ? 'flex-col gap-2' : 'gap-3'
      } ${className}`}
    >
      {/* Logo Emblem with rounded black squircle */}
      <div
        style={{ width: iconDimensions.width, height: iconDimensions.height }}
        className="relative shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95"
      >
        {useImage && !imgError ? (
          <img
            src="/studyflow-logo.png"
            alt="Studyflow Logo"
            className="w-full h-full object-contain select-none drop-shadow-xs"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden shadow-xs">
            <LogoIcon />
          </div>
        )}
      </div>

      {/* Typography */}
      {showText && (
        <span
          className={`tracking-tight text-slate-900 font-sans ${iconDimensions.textClass}`}
        >
          Study<span className="text-indigo-600">flow</span>
        </span>
      )}
    </div>
  );
};
