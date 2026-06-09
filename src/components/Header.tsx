import React from 'react';

const Header = () => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 md:h-24 flex items-center justify-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md z-50 pointer-events-none">
      <img
        src="/assets/headerLogo.png"
        alt="AVR Cinema"
        className="h-10 md:h-14 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
};

export default Header;
