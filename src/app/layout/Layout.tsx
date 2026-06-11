import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar/Navbar";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col relative pb-16 md:pb-0">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[100vw] flex flex-col">
        {children}
      </main>
    </div>
  );
}
