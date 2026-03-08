import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', inverted = false }) => {
  const [hasError, setHasError] = React.useState(false);

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-20',
  };

  const textFallbackClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };

  const color = inverted ? 'text-white' : 'text-[#0A2E52]';

  // For inverted (dark background) or error states, use CSS rendering
  // This ensures "Per" is white and "Hea" stays turquoise without the "white box" PNG issue
  if (inverted || hasError) {
    return (
      <div className={`flex items-center font-black tracking-tighter ${textFallbackClasses[size]} ${className}`}>
        <span className={color}>Per</span>
        <span className="text-[#00C4A7]">Hea</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/logo-social.png" 
        alt="PerHea" 
        className={`${sizeClasses[size]} w-auto object-contain`}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default Logo;
