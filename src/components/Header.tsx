import React from 'react';

const Header = () => {
  return (
    <div className="fixed top-0 left-0 right-0  pb-2 md:pt-10 flex justify-center bg-gradient-to-b from-black/80 to-transparent z-50 pointer-events-none">
      <img
        src="/assets/headerLogo.png"
        alt="AVR Cinema"
        className="w-30 md:w-40 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
};

export default Header;
