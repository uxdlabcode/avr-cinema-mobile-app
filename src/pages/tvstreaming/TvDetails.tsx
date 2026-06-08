import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getMatchingData, getSignedUrl } from '@/Firebase';

interface TvShowItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  rating?: string;
  [key: string]: any;
}

// Static Data
const TABS = ['FOR YOU', 'TV GUIDE', 'NEWS', 'SPORTS', 'SHOWS'];

const TV_GUIDE_DAYS = ['YESTERDAY', 'TODAY', 'TOMORROW'];

const LIVE_CHANNELS = [
  { id: 1, name: 'StarGOLD', logo: '/assets/cast1.webp', color: 'from-red-600 to-yellow-500' },
  { id: 2, name: 'Sony TV', logo: '/assets/cast2.webp', color: 'from-blue-700 to-blue-500' },
  { id: 3, name: 'Star Sports', logo: '/assets/cast3.jpg', color: 'from-red-700 to-orange-500' },
  { id: 4, name: 'Sports Net', logo: '/assets/cast1.webp', color: 'from-green-600 to-teal-500' },
  { id: 5, name: 'News Live', logo: '/assets/cast2.webp', color: 'from-purple-700 to-purple-500' },
];

// Skeleton Loading Component
const TvDetailsSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 animate-pulse">
    {/* Logo */}
    <div className="flex justify-center pt-4 pb-2">
      <Skeleton className="w-24 h-8 rounded" />
    </div>

    {/* Tabs */}
    <div className="flex gap-4 px-4 py-3 overflow-x-auto">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
      ))}
    </div>

    {/* Hero */}
    <div className="px-4 pt-2">
      <Skeleton className="w-full aspect-video rounded-xl" />
    </div>

    {/* Dots */}
    <div className="flex gap-2 justify-center py-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="w-2 h-2 rounded-full" />
      ))}
    </div>

    {/* Live Channels */}
    <div className="px-4 space-y-3 pt-4">
      <Skeleton className="h-6 w-40 rounded" />
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-16 h-16 rounded-full shrink-0" />
        ))}
      </div>
    </div>

    {/* Live Movies */}
    <div className="px-4 space-y-3 pt-6">
      <Skeleton className="h-6 w-36 rounded" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-48 aspect-video rounded-lg shrink-0" />
        ))}
      </div>
    </div>
  </div>
);

const TvDetails = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('FOR YOU');
  const [activeDay, setActiveDay] = useState('TODAY');
  const [isLoading, setIsLoading] = useState(true);
  const [tvShows, setTvShows] = useState<TvShowItem[]>([]);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch TV shows from Firestore
  useEffect(() => {
    const fetchTvShows = async () => {
      try {
        setIsLoading(true);
        const fetchedShows = await getMatchingData("media", "category", "==", "TV Show");

        const signedShows = await Promise.all(
          fetchedShows.map(async (show) => {
            let signedThumb = show.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(show.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...show,
              signedThumbnailUrl: signedThumb
            } as TvShowItem;
          })
        );

        setTvShows(signedShows);
      } catch (error) {
        console.error("Error fetching TV Shows from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTvShows();
  }, []);

  // Synchronize carousel slide snaps
  useEffect(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on('select', () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Auto scroll featured hero TV shows every 6 seconds
  useEffect(() => {
    if (!carouselApi || tvShows.length === 0) return;
    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [carouselApi, tvShows]);

  if (isLoading) return <TvDetailsSkeleton />;

  const featuredShows = tvShows.slice(0, 4);

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0">

      {/* AVR Logo */}
      <div className="flex justify-center pt-4 pb-2">
        <img src="/assets/logo.png" alt="AVR Cinema" className="w-24 object-contain" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all border ${activeTab === tab
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TV GUIDE Sub-navigation */}
      {activeTab === 'TV GUIDE' && (
        <div className="space-y-3 px-4 pb-4">
          {/* Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button className="p-2 rounded-full border border-zinc-700 text-zinc-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
            </button>
            <button className="p-2 rounded-full border border-zinc-700 text-zinc-400">
              ❤️
            </button>
            <button className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-full bg-secondary-foreground text-black">
              Categories <ChevronDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-full border border-zinc-700 text-zinc-300">
              Languages <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Day Selector */}
          <div className="flex gap-4 justify-center border-b border-zinc-800 pb-2">
            {TV_GUIDE_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors ${activeDay === day
                    ? 'text-white border-white'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Guide Placeholder */}
          <div className="flex justify-center py-6">
            <Skeleton className="w-32 h-2 rounded" />
          </div>
        </div>
      )}

      {/* Hero Carousel (FOR YOU tab) */}
      {activeTab === 'FOR YOU' && featuredShows.length > 0 && (
        <div className="px-4 pt-2">
          <Carousel
            setApi={setCarouselApi}
            opts={{ align: 'start', loop: true }}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {featuredShows.map((slide) => (
                <CarouselItem
                  key={slide.id}
                  className="pl-0 cursor-pointer"
                  onClick={() => navigate(`/tv/episode/${slide.id}`)}
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <img src={slide.signedThumbnailUrl || "/assets/poster.png"} alt={slide.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <h3 className="text-lg font-bold text-white drop-shadow-lg">{slide.title}</h3>
                      <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded text-[10px] text-zinc-300">
                        ⭐ {slide.rating || "4.5"}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Carousel Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {featuredShows.map((_, index) => (
              <button
                key={index}
                onClick={() => carouselApi?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${currentSlide === index
                    ? 'w-4 bg-primary'
                    : 'w-2 bg-zinc-600 hover:bg-zinc-400'
                  }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popular TV Shows */}
      {tvShows.length > 0 && (
        <section className="px-4 pt-6 space-y-3">
          <h2 className="text-base font-bold flex items-center text-white cursor-pointer hover:text-primary transition-colors">
            Popular TV Shows <ChevronRight className="w-4 h-4 ml-1" />
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
            {tvShows.map((show) => (
              <div
                key={show.id}
                className="relative shrink-0 w-48 md:w-56 aspect-video rounded-lg overflow-hidden snap-start cursor-pointer group"
                onClick={() => navigate(`/tv/episode/${show.id}`)}
              >
                <img src={show.signedThumbnailUrl || "/assets/poster.png"} alt={show.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 z-10">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-white truncate">{show.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

export default TvDetails;
