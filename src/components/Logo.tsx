import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColorClass?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  textColorClass = 'text-[#0b5cd5]'
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Logo Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Blue Rounded Square Background */}
        <rect width="100" height="100" rx="24" fill="#0b5cd5" />
        
        {/* White Clock/Circle outline with a gap at top-right */}
        <path
          d="M 68.3 31.7 A 26 26 0 1 0 76 50"
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
        />
        
        {/* White Checkmark */}
        <path
          d="M 45 51 L 54 60 L 76 34"
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col select-none">
          {/* TIGi */}
          <span className={`text-xl font-black italic tracking-tight leading-none ${textColorClass} flex items-center`}>
            TIGi
          </span>
          {/* PRESENZE */}
          <span className="text-[9px] font-bold tracking-[0.2em] leading-none text-slate-500 mt-1 uppercase">
            PRESENZE
          </span>
        </div>
      )}
    </div>
  );
};
