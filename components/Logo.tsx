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
    <div className={`flex items-center font-black tracking-tighter ${sizeClasses[size]} ${className}`}>
      <span className={color}>Per</span>
      <span className="text-[#00C4A7]">Hea</span>
    </div>
  );
};

export default Logo;
