import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar/Navbar";
import { TVSidebar } from "@/components/navbar/TVSidebar";
import { isTvPlatform } from "@/lib/tvUtils";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const isTV = isTvPlatform();
  const [isMobileWidth, setIsMobileWidth] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobileWidth(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const showSidebar = !isMobileWidth;

  return (
    <div 
      className={`min-h-screen bg-[#141414] text-white flex relative ${
        showSidebar ? "flex-row pl-[80px]" : "flex-col pb-16 md:pb-0"
      }`}
    >
      {showSidebar ? <TVSidebar /> : <Navbar />}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[100vw] flex flex-col overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
