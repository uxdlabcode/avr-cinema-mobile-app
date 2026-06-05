import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bookmark, Share2, Play, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMatchingData, getSignedUrl } from '@/Firebase';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

interface MovieItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  [key: string]: any;
}

const MoviesTabSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-24 px-4 animate-pulse">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero banner skeleton */}
      <div className="w-full h-[50vh] md:h-[65vh] bg-zinc-950 rounded-lg" />
      
      {/* Dynamic categories skeleton */}
      {[1, 2].map((categoryIdx) => (
        <div key={categoryIdx} className="space-y-4">
          <Skeleton className="h-6 w-40 bg-zinc-900 rounded" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-[140px] sm:w-[170px] md:w-[200px] aspect-[2/3] rounded-md bg-zinc-900 shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MoviesTab = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [groupedMovies, setGroupedMovies] = useState<Record<string, MovieItem[]>>({});
  
  // Featured hero carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        const fetchedMovies = await getMatchingData("media", "category", "==", "Movie");

        const signedMovies = await Promise.all(
          fetchedMovies.map(async (movie) => {
            let signedThumb = movie.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(movie.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...movie,
              signedThumbnailUrl: signedThumb
            } as MovieItem;
          })
        );

        setMovies(signedMovies);
      } catch (error) {
        console.error("Error fetching movies from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Dynamically group movies by genre
  useEffect(() => {
    if (movies.length === 0) return;

    const groups: Record<string, MovieItem[]> = {};

    movies.forEach((movie) => {
      if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach((genre) => {
          if (!groups[genre]) {
            groups[genre] = [];
          }
          if (!groups[genre].some(m => m.id === movie.id)) {
            groups[genre].push(movie);
          }
        });
      } else {
        const fallback = "Trending Movies";
        if (!groups[fallback]) {
          groups[fallback] = [];
        }
        if (!groups[fallback].some(m => m.id === movie.id)) {
          groups[fallback].push(movie);
        }
      }
    });

    if (!groups["Trending Now"]) {
      groups["Trending Now"] = movies;
    }

    setGroupedMovies(groups);
  }, [movies]);

  // Synchronize carousel slide snaps
  useEffect(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Auto scroll featured hero movies every 6 seconds
  useEffect(() => {
    if (!carouselApi) return;
    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [carouselApi]);

  const featuredList = movies.slice(0, 4); // Use first 4 movies as featured banners

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 relative">
      
      {/* Semi-transparent Header */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm z-50 flex items-center justify-between px-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/60 border border-zinc-900/60 hover:bg-zinc-800 text-white"
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
            className="w-10 h-10 rounded-full bg-black/60 border border-zinc-900/60 hover:bg-zinc-800 text-white"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-full bg-black/60 border border-zinc-900/60 hover:bg-zinc-800 text-white"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <MoviesTabSkeleton />
      ) : (
        <div className="flex flex-col">
          
          {/* Featured Hero Slideshow Carousel */}
          {featuredList.length > 0 && (
            <div className="relative w-full h-[55vh] md:h-[70vh] bg-black border-b border-zinc-900 overflow-hidden group/hero">
              <Carousel
                setApi={setCarouselApi}
                opts={{ align: 'start', loop: true }}
                className="w-full h-full [&>[data-slot=carousel-content]]:h-full"
              >
                <CarouselContent className="ml-0 h-full">
                  {featuredList.map((featuredMovie) => (
                    <CarouselItem
                      key={featuredMovie.id}
                      className="pl-0 w-full h-full relative shrink-0"
                    >
                      <div className="relative w-full h-full select-none">
                        <img 
                          src={featuredMovie.signedThumbnailUrl || "/assets/poster.png"} 
                          alt={featuredMovie.title} 
                          className="w-full h-full object-cover opacity-80" 
                        />
                        {/* Rich cinematic fades */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-[2]" />
                        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-[2]" />

                        {/* Text and buttons overlay details */}
                        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-16 pb-14 md:pb-20 z-[3] text-left">
                          <span className="text-xs uppercase tracking-widest font-extrabold text-[#E50914] mb-2">Featured Movie</span>
                          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-md max-w-2xl mb-3">
                            {featuredMovie.title}
                          </h1>
                          <p className="hidden md:block text-zinc-300 text-sm max-w-xl leading-relaxed font-normal mb-6 line-clamp-3">
                            {featuredMovie.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <Button 
                              onClick={() => navigate(`/video/${featuredMovie.id}`)}
                              className="bg-white hover:bg-white/95 text-black font-extrabold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
                            >
                              <Play className="w-4 h-4 fill-current text-black" />
                              <span>Play</span>
                            </Button>
                            <Button 
                              onClick={() => navigate(`/video/${featuredMovie.id}`)}
                              variant="outline"
                              className="bg-zinc-800/40 hover:bg-zinc-700/60 border-zinc-650 text-white font-extrabold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm"
                            >
                              <span>More Info</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Slider Dots indicators */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                {featuredList.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => carouselApi?.scrollTo(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentSlide === index
                        ? 'w-6 bg-[#E50914]'
                        : 'w-2 bg-zinc-650 hover:bg-zinc-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Category Sliders */}
          <div className="px-4 md:px-12 lg:px-16 pt-10 pb-24 space-y-10 w-full max-w-7xl mx-auto">
            {Object.keys(groupedMovies).map((genreName) => {
              const list = groupedMovies[genreName];
              if (list.length === 0) return null;
              
              return (
                <div key={genreName} className="space-y-4 text-left">
                  <h3 className="text-lg md:text-2xl font-extrabold text-white tracking-wide">
                    {genreName}
                  </h3>
                  
                  {/* Horizontal Scrollable Row */}
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                    {list.map((movie) => (
                      <div 
                        key={movie.id} 
                        className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 snap-start"
                        onClick={() => navigate(`/video/${movie.id}`)}
                      >
                        <img 
                          src={movie.signedThumbnailUrl || "/assets/poster.png"} 
                          alt={movie.title} 
                          className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300"
                        />

                        {/* Mobile Title bar fallback (Visible when not hovered on touch devices) */}
                        <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                          <p className="text-[10px] font-extrabold text-white truncate text-center drop-shadow-md">
                            {movie.title}
                          </p>
                        </div>
                        
                        {/* The theatrical hover details overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                          
                          {/* Genre/Category Badge */}
                          <div className="flex justify-end mb-1 md:mb-2">
                            <span className="text-[8px] md:text-[9px] font-extrabold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {movie.genres && movie.genres.length > 0 ? movie.genres[0] : "Movie"}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs md:text-sm font-extrabold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                            {movie.title}
                          </h4>

                          {/* Metadata Row */}
                          <div className="flex items-center justify-between text-[8px] md:text-[9px] font-semibold text-zinc-400 mb-1.5 md:mb-2.5">
                            <span className="truncate">English (UK)</span>
                            <div className="flex items-center gap-0.5">
                              <span className="text-[8px] md:text-[9px] opacity-85">🌐</span>
                              <span>{movie.duration || "N/A"}</span>
                            </div>
                          </div>

                          {/* Actions row */}
                          <div className="flex items-center gap-1 md:gap-1.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/video/${movie.id}`);
                              }}
                              className="flex-1 py-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-extrabold text-[9px] md:text-[10px] rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                            >
                              Play Now
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};

export default MoviesTab;
