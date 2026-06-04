import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const MOCK_MOVIES = [
  { 
    id: 1, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/episode1.webp' 
  },
  { 
    id: 2, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/episode2.webp' 
  },
  { 
    id: 3, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/poster.png' 
  },
  { 
    id: 4, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/episode1.webp' 
  },
  { 
    id: 5, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/episode2.webp' 
  },
  { 
    id: 6, 
    title: 'Midnight Mass', 
    tags: 'THRILLER • DRAMA', 
    description: 'Amet deserunt mollit non estere ullamco est sit aliqua dolor do non sint et consectum lorem non es.', 
    image: '/assets/poster.png' 
  },
];

const MoviesTabSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-20 px-4 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="w-full aspect-video rounded-lg" />
          <Skeleton className="w-24 h-3 rounded" />
          <Skeleton className="w-32 h-5 rounded" />
          <Skeleton className="w-full h-12 rounded" />
        </div>
      ))}
    </div>
  </div>
);

const MoviesTab = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for the skeleton
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0">
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-black/90 backdrop-blur-md z-50 flex items-center justify-between px-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Center Logo */}
        <img 
          src="/assets/logo.png" 
          alt="AVR Cinema" 
          className="h-8 object-contain absolute left-1/2 -translate-x-1/2" 
        />

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      {isLoading ? (
        <MoviesTabSkeleton />
      ) : (
        <div className="pt-24 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-8">
            {MOCK_MOVIES.map((movie) => (
              <div 
                key={movie.id} 
                className="flex flex-col group cursor-pointer"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                {/* Image */}
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-zinc-900 border border-zinc-800/50">
                  <img 
                    src={movie.image} 
                    alt={movie.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                </div>
                
                {/* Tags */}
                <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-1">
                  {movie.tags}
                </span>
                
                {/* Title */}
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-primary transition-colors">
                  {movie.title}
                </h3>
                
                {/* Description */}
                <p className="text-[11px] text-zinc-500 line-clamp-3 leading-relaxed">
                  {movie.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default MoviesTab;
