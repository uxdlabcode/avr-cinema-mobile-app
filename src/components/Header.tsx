import React from 'react';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = "" }) => {
  return (
    <div className={`md:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md z-50 pointer-events-none ${className}`}>
      <img
        src="/assets/headerLogo.png"
        alt="AVR Cinema"
        className="h-10 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
};

export default Header;

