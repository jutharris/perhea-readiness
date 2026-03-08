import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', inverted = false }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };

  const color = inverted ? 'text-white' : 'text-[#0A2E52]';

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/logo-social.png" 
        alt="PerHea" 
        className={`${sizeClasses[size]} h-auto object-contain`}
        onError={(e) => {
          // Fallback to CSS logo if PNG is missing
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.innerHTML = `
            <div class="flex items-center font-black tracking-tighter ${sizeClasses[size]}">
              <span class="${color}">Per</span>
              <span class="text-[#00C4A7]">Hea</span>
            </div>
          `;
        }}
      />
    </div>
  );
};

export default Logo;
