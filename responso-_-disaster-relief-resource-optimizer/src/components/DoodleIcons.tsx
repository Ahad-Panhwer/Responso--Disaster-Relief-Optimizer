import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const DoodleLogo: React.FC<IconProps> = ({ className = 'w-9 h-9', ...props }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Hand-drawn box with disaster relief cross and doodle tape */}
    <rect x="6" y="10" width="36" height="30" rx="3" stroke="#1E232A" strokeWidth="2.5" fill="#FAF7F2" />
    <path d="M6 22H42" stroke="#1E232A" strokeWidth="2" strokeDasharray="3 2" />
    <path d="M24 10V40" stroke="#1E232A" strokeWidth="2" strokeDasharray="3 2" />
    {/* Red relief cross with sketchy doodle stroke */}
    <path d="M24 16V34" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
    <path d="M15 25H33" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
    {/* Cute sun rays / urgency alert doodles */}
    <path d="M38 7L42 4" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <path d="M43 14L46 13" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 7L6 4" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DoodleBox: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4 10L16 4L28 10L16 16L4 10Z" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#FAF5ED" />
    <path d="M4 10V22L16 28V16" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#F3ECE0" />
    <path d="M28 10V22L16 28V16" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#EAE0D0" />
    <path d="M16 16L16 28" stroke="#1E232A" strokeWidth="2" />
    {/* Packing tape strip */}
    <path d="M12 7L20 11" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const DoodleWater: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="9" y="8" width="14" height="20" rx="3" stroke="#1E232A" strokeWidth="2" fill="#EBF8FF" />
    <path d="M13 4H19V8H13V4Z" stroke="#1E232A" strokeWidth="2" fill="#FAF7F2" />
    {/* Water wave inside */}
    <path d="M11 18C13 17 15 19 17 18C19 17 21 19 21 18V26C21 26.5 20.5 27 20 27H12C11.5 27 11 26.5 11 26V18Z" fill="#3B82F6" fillOpacity="0.3" />
    {/* Handle on side */}
    <path d="M23 11H26C26.5 11 27 11.5 27 12V18C27 18.5 26.5 19 26 19H23" stroke="#1E232A" strokeWidth="1.75" />
    {/* Droplet */}
    <path d="M16 12C16 12 14 14.5 14 16C14 17.1 14.9 18 16 18C17.1 18 18 17.1 18 16C18 14.5 16 12 16 12Z" stroke="#2563EB" strokeWidth="1.5" fill="#60A5FA" />
  </svg>
);

export const DoodleFood: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="6" y="8" width="20" height="18" rx="4" stroke="#1E232A" strokeWidth="2" fill="#FEF3C7" />
    <path d="M10 6H22" stroke="#1E232A" strokeWidth="2" strokeLinecap="round" />
    {/* Wheat ear / ration stamp */}
    <path d="M16 13V21" stroke="#D97706" strokeWidth="1.75" />
    <path d="M16 15L13 14" stroke="#D97706" strokeWidth="1.5" />
    <path d="M16 17L19 16" stroke="#D97706" strokeWidth="1.5" />
    <path d="M16 19L13 18" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="21" cy="21" r="2" fill="#D97706" fillOpacity="0.4" />
  </svg>
);

export const DoodleMedical: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="5" y="8" width="22" height="18" rx="3" stroke="#1E232A" strokeWidth="2" fill="#FFF1F2" />
    <path d="M12 8V6C12 4.9 12.9 4 14 4H18C19.1 4 20 4.9 20 6V8" stroke="#1E232A" strokeWidth="2" />
    {/* Red Cross */}
    <path d="M16 12V22" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
    <path d="M11 17H21" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const DoodleTent: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Triangle tent */}
    <path d="M16 5L3 25H29L16 5Z" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#F0FDF4" />
    {/* Central flap door */}
    <path d="M16 5V25" stroke="#1E232A" strokeWidth="1.75" strokeDasharray="3 2" />
    <path d="M16 13L11 25" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 13L21 25" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="5" r="1.5" fill="#1E232A" />
  </svg>
);

export const DoodleHygiene: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="7" y="11" width="18" height="14" rx="3" stroke="#1E232A" strokeWidth="2" fill="#F5F3FF" />
    <path d="M12 7H14V11H12V7Z" stroke="#1E232A" strokeWidth="1.75" fill="#FAF7F2" />
    <path d="M10 7H16" stroke="#1E232A" strokeWidth="1.75" strokeLinecap="round" />
    {/* Clean bubbles doodle */}
    <circle cx="13" cy="18" r="2.5" stroke="#7C3AED" strokeWidth="1.5" fill="#DDD6FE" />
    <circle cx="18" cy="16" r="1.5" stroke="#7C3AED" strokeWidth="1.25" fill="#DDD6FE" />
    <circle cx="19" cy="20" r="1" stroke="#7C3AED" strokeWidth="1" fill="#DDD6FE" />
  </svg>
);

export const DoodleTruck: React.FC<IconProps> = ({ className = 'w-7 h-7', ...props }) => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Cargo bed */}
    <rect x="3" y="10" width="19" height="15" rx="2" stroke="#1E232A" strokeWidth="2" fill="#FAF7F2" />
    {/* Cab */}
    <path d="M22 14H29L33 19V25H22V14Z" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#FAF7F2" />
    {/* Window */}
    <path d="M24 16H28.5L31 19H24V16Z" stroke="#1E232A" strokeWidth="1.5" fill="#E0F2FE" />
    {/* Wheels with scribble rims */}
    <circle cx="9" cy="26" r="3.5" stroke="#1E232A" strokeWidth="2" fill="#334155" />
    <circle cx="9" cy="26" r="1.2" fill="#FFFFFF" />
    <circle cx="26" cy="26" r="3.5" stroke="#1E232A" strokeWidth="2" fill="#334155" />
    <circle cx="26" cy="26" r="1.2" fill="#FFFFFF" />
    {/* Relief cross on side */}
    <path d="M12.5 14V20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    <path d="M9.5 17H15.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    {/* Exhaust speed lines */}
    <path d="M1 21H2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M0 24H2" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DoodlePin: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M16 28C16 28 24 18 24 12C24 7.6 20.4 4 16 4C11.6 4 8 7.6 8 12C8 18 16 28 16 28Z" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#FEE2E2" />
    <circle cx="16" cy="12" r="3" stroke="#DC2626" strokeWidth="2" fill="#FFFFFF" />
    {/* Ground shadow ripple */}
    <ellipse cx="16" cy="29" rx="5" ry="1.5" fill="#1E232A" fillOpacity="0.2" />
  </svg>
);

export const DoodleWarehouse: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Warehouse building */}
    <path d="M4 12L16 6L28 12V26H4V12Z" stroke="#1E232A" strokeWidth="2" strokeLinejoin="round" fill="#FAF5ED" />
    {/* Roller shutter door */}
    <rect x="11" y="16" width="10" height="10" stroke="#1E232A" strokeWidth="1.75" fill="#E2E8F0" />
    <line x1="11" y1="19" x2="21" y2="19" stroke="#1E232A" strokeWidth="1.2" />
    <line x1="11" y1="22" x2="21" y2="22" stroke="#1E232A" strokeWidth="1.2" />
    {/* Depot marker flag */}
    <path d="M16 6V2L21 4L16 6Z" fill="#16A34A" stroke="#1E232A" strokeWidth="1" />
  </svg>
);

export const DoodleVolunteer: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Head with safety helmet */}
    <circle cx="16" cy="10" r="4.5" stroke="#1E232A" strokeWidth="2" fill="#FAF7F2" />
    <path d="M11 9C11 6.5 13.2 4.5 16 4.5C18.8 4.5 21 6.5 21 9H11Z" stroke="#1E232A" strokeWidth="1.75" fill="#F59E0B" />
    {/* High-vis vest torso */}
    <path d="M10 27V19C10 16.5 12.5 15 16 15C19.5 15 22 16.5 22 19V27H10Z" stroke="#1E232A" strokeWidth="2" fill="#FDE047" />
    {/* Reflective stripes */}
    <line x1="13" y1="16" x2="13" y2="27" stroke="#1E232A" strokeWidth="1.5" strokeDasharray="2 2" />
    <line x1="19" y1="16" x2="19" y2="27" stroke="#1E232A" strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

export const DoodleClipboard: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="6" y="6" width="20" height="23" rx="3" stroke="#1E232A" strokeWidth="2" fill="#FFFFFF" />
    {/* Metal clip */}
    <rect x="11" y="3" width="10" height="5" rx="1.5" stroke="#1E232A" strokeWidth="1.75" fill="#E2E8F0" />
    {/* Check lines */}
    <path d="M10 13L12 15L15 11" stroke="#16A34A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="13" x2="22" y2="13" stroke="#1E232A" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 19L12 21L15 17" stroke="#16A34A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="17" y1="19" x2="22" y2="19" stroke="#1E232A" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10" y1="24" x2="20" y2="24" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DoodleWave: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M3 13C6 11 9 15 12 13C15 11 18 15 21 13C24 11 27 15 29 13" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M3 19C6 17 9 21 12 19C15 17 18 21 21 19C24 17 27 21 29 19" stroke="#0369A1" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M3 25C6 23 9 27 12 25C15 23 18 27 21 25C24 23 27 27 29 25" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const DoodleCheck: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M4 12.5L9 17.5L20 6.5" stroke="#16A34A" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DoodleEmptyIllustration: React.FC<{ message?: string; subMessage?: string }> = ({
  message = 'No records found',
  subMessage = 'Try adjusting your filters or search terms',
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 h-28 mb-3">
      {/* Hand drawn empty crate */}
      <rect x="35" y="45" width="90" height="55" rx="5" stroke="#1E232A" strokeWidth="2.5" fill="#FAF5ED" />
      <path d="M35 70H125" stroke="#1E232A" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M80 45V100" stroke="#1E232A" strokeWidth="2" strokeDasharray="4 3" />
      {/* Looking glass doodle */}
      <circle cx="70" cy="55" r="16" stroke="#1E232A" strokeWidth="2.5" fill="#E0F2FE" fillOpacity="0.7" />
      <line x1="82" y1="67" x2="98" y2="83" stroke="#1E232A" strokeWidth="3.5" strokeLinecap="round" />
      {/* Little floating question dust doodle */}
      <path d="M68 50C68 47 72 47 72 49C72 52 69 53 69 55" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
      <circle cx="69" cy="58" r="1" fill="#D97706" />
      <circle cx="110" cy="35" r="3" stroke="#1E232A" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
      <circle cx="45" cy="32" r="2" stroke="#1E232A" strokeWidth="1.5" fill="none" />
    </svg>
    <p className="font-doodle text-xl font-bold text-stone-800">{message}</p>
    <p className="text-xs text-stone-500 max-w-sm mt-1">{subMessage}</p>
  </div>
);
