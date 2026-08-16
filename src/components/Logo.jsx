import React from 'react';

export const Logo = ({ size = 'md', showTagline = false, light = false, className = '' }) => {
  const iconSizeClass = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }[size] || 'w-9 h-9';

  const titleSizeClass = {
    sm: 'text-base font-bold',
    md: 'text-lg font-extrabold tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight'
  }[size] || 'text-lg font-extrabold';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Integrated Calendar Grid + Pulse + Checkmark Stethoscope Element */}
      <div className={`relative ${iconSizeClass} shrink-0`}>
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-xs">
          {/* Base rounded container */}
          <rect width="48" height="48" rx="12" fill={light ? '#FFFFFF' : '#047857'} />
          
          {/* Inner subtle glow */}
          <rect
            x="3"
            y="3"
            width="42"
            height="42"
            rx="9"
            fill={light ? '#F0FDF4' : '#065F46'}
            fillOpacity="0.4"
          />

          {/* Calendar top hanger pins */}
          <line
            x1="16"
            y1="8"
            x2="16"
            y2="14"
            stroke={light ? '#047857' : '#34D399'}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="32"
            y1="8"
            x2="32"
            y2="14"
            stroke={light ? '#047857' : '#34D399'}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Calendar Header Line */}
          <line
            x1="10"
            y1="20"
            x2="38"
            y2="20"
            stroke={light ? '#047857' : '#A7F3D0'}
            strokeWidth="2"
            strokeOpacity="0.7"
          />

          {/* Medical Cross / Pulse Wave within Calendar Grid */}
          <path
            d="M13 32L18 32L21 26L24 36L27 28L30 32L35 32"
            stroke={light ? '#059669' : '#FFFFFF'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Precision Clock Check Badge */}
          <circle cx="36" cy="14" r="5.5" fill="#10B981" />
          <path
            d="M34 14L35.5 15.5L38.5 12.5"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1">
          <span className={`${titleSizeClass} ${light ? 'text-white' : 'text-slate-900'}`}>
            Medi<span className="text-emerald-800">Sched</span>
          </span>
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            NG
          </span>
        </div>
        {showTagline && (
          <span className={`text-[11px] font-medium tracking-normal mt-0.5 ${light ? 'text-emerald-100' : 'text-slate-500'}`}>
            Find the Right Specialist. Book the Right Time.
          </span>
        )}
      </div>
    </div>
  );
};
