import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, ChevronRight, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getMatchingData, getSignedUrl } from '@/Firebase';
import Header from '@/components/Header';
import RecentTVShows from './Episode';
import DocumentaryList from './DocumentaryList';

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
const TABS = ['For You', 'TV Shows', 'Documentaries'];

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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'For You';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
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
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-20">
      <Header />

      {/* Tab Navigation */}
      <div className="flex gap-6 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-zinc-900">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-xs font-semibold  transition-colors relative whitespace-nowrap ${activeTab === tab
              ? 'text-primary'
              : 'text-zinc-400 hover:text-white'
              }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
          </button>
        ))}
      </div>



      {/* Hero Carousel (FOR YOU tab) */}
      {activeTab === 'For You' && featuredShows.length > 0 && (
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
                  onClick={() => navigate(`/video/${slide.id}`)}
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
      {activeTab === 'For You' && tvShows.length > 0 && (
        <section className="px-4 pt-6 space-y-3">
          <h2
            className="text-base font-bold flex items-center text-white cursor-pointer hover:text-primary transition-colors"
            onClick={() => setActiveTab('TV Shows')}
          >
            Popular TV Shows <ChevronRight className="w-4 h-4 ml-1" />
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
            {tvShows.map((show) => (
              <div
                key={show.id}
                className="relative shrink-0 w-48 md:w-56 aspect-video rounded-lg overflow-hidden snap-start cursor-pointer group"
                onClick={() => navigate(`/video/${show.id}`)}
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

      {/* Documentaries in FOR YOU tab */}
      {activeTab === 'For You' && (
        <div className="px-4 pb-6">
          <DocumentaryList />
        </div>
      )}

      {/* TV Shows Tab */}
      {activeTab === 'TV Shows' && (
        <div className="px-4 pt-6">
          <RecentTVShows isGrid={true} />
        </div>
      )}

      {/* Documentaries Tab */}
      {activeTab === 'Documentaries' && (
        <div className="px-4 pt-6">
          <DocumentaryList isGrid={true} />
        </div>
      )}

    </div>
  );
};

export default TvDetails;
