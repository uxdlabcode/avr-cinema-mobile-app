import { Play, Plus, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-black text-white w-full overflow-hidden pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative w-full h-[70vh] md:h-[85vh] flex flex-col justify-end">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src="/assets/poster.png" 
            alt="Hero Poster" 
            className="w-full h-full object-cover object-top"
          />
          {/* Top Gradient Overlay */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/80 to-transparent" />
          
          {/* Bottom Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        {/* Logo at the top center */}
        <div className="absolute top-0 left-0 right-0 pt-10 flex justify-center">
          <img src="/assets/logo.png" alt="AVR Cinema" className="w-40 md:w-56 object-contain drop-shadow-lg" />
        </div>

        {/* Hero Content (Bottom aligned) */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 pb-8 md:pb-16 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-3 drop-shadow-xl uppercase">
            Anweshippin Kandethum
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-medium text-gray-200 mb-6 drop-shadow-md">
            <span>Understated</span>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <span>Dark</span>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <span>Drama</span>
            <span className="w-1 h-1 rounded-full bg-gray-400" />
            <span>Detectives</span>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto px-4">
            <Button className="flex-1 md:w-36 bg-white hover:bg-gray-200 text-black font-semibold text-lg py-6 rounded-md">
              <Play className="w-6 h-6 mr-2 fill-black" />
              Play
            </Button>
            <Button variant="outline" className="flex-1 md:w-36 bg-zinc-900/60 hover:bg-zinc-800/80 text-white border-zinc-700 backdrop-blur-sm font-semibold text-lg py-6 rounded-md">
              <Plus className="w-6 h-6 mr-2" />
              My List
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <div className="w-2 h-2 rounded-full bg-gray-600" />
            <div className="w-2 h-2 rounded-full bg-gray-600" />
          </div>
        </div>
      </section>

      {/* Content Rows */}
      <section className="relative z-20 -mt-2 px-4 md:px-12 space-y-8">
        
        {/* Continue Watching Row */}
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-3 flex items-center hover:text-gray-300 transition-colors cursor-pointer">
            Continue Watching on AVR <ChevronRight className="w-5 h-5 ml-1" />
          </h2>
          
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
            {/* Item 1 */}
            <div className="relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start cursor-pointer group">
              <img src="/assets/episode1.webp" alt="Episode 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                <Play className="w-6 h-6 text-white drop-shadow-md" />
                <span className="text-xs font-semibold drop-shadow-md">S1 : E4</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                <div className="h-full bg-[#E50813] w-1/3" />
              </div>
            </div>

            {/* Item 2 */}
            <div className="relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start cursor-pointer group">
              <img src="/assets/episode2.webp" alt="Episode 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                <Play className="w-6 h-6 text-white drop-shadow-md" />
                <span className="text-xs font-semibold drop-shadow-md">S2 : E1</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                <div className="h-full bg-[#E50813] w-2/3" />
              </div>
            </div>
          </div>
        </div>

        {/* Trending Now Row */}
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-3">Trending Now</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
             {/* Re-using assets for demo */}
             <div className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group">
                <img src="/assets/episode2.webp" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
             </div>
             <div className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group">
                <img src="/assets/episode1.webp" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
             </div>
             <div className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden snap-start cursor-pointer group">
                <img src="/assets/poster.png" alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
             </div>
          </div>
        </div>
      </section>
    </div>
  );
};
