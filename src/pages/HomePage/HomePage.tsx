import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { compoundQuery, getSignedUrl } from "@/Firebase";
import RecentWatch from "./RecentWatch";
import TrendNow from "./TrendNow";
import Header from "@/components/Header";
import RecentTVShows from "../tvstreaming/Episode";
import DocumentaryList from "../tvstreaming/DocumentaryList";

const fallbackData = [
  {
    id: 1,
    title: "Anweshippin Kandethum",
    image: "/assets/poster.png",
    tags: ["Understated", "Dark", "Drama", "Detectives"],
  },
  {
    id: 2,
    title: "Lord of the Rings",
    image: "/assets/episode2.webp",
    tags: ["Fantasy", "Epic", "Adventure", "Action"],
  }
];

import { HomePageSkeleton } from "./HomePageSkeleton";

export const HomePage = () => {
  const [featuredMovies, setFeaturedMovies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const docs = await compoundQuery("media", [
          { key: "featured", operator: "==", value: true },
        ]);

        const sorted = (docs || [])
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return timeB - timeA;
          })
          .slice(0, 7);

        const enriched = await Promise.all(
          sorted.map(async (doc) => {
            let image = "/assets/poster.png";
            if (doc.thumbnailUrl) {
              try {
                image = await getSignedUrl(doc.thumbnailUrl);
              } catch {
                image = doc.thumbnailUrl;
              }
            }
            return {
              id: doc.id,
              title: doc.title,
              image: image,
              tags: doc.genres && doc.genres.length > 0 ? doc.genres : (doc.category ? [doc.category] : ["Featured", "Trending"]),
            };
          })
        );

        setFeaturedMovies(enriched.length > 0 ? enriched : fallbackData);
      } catch (err) {
        console.error("Error fetching featured movies", err);
        setFeaturedMovies(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeatured();
  }, []);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white w-full overflow-hidden pb-20 md:pb-0">
        <Header />
        <HomePageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white w-full overflow-hidden pb-20 md:pb-0">
      <Header />

      {/* Hero Section Carousel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full relative"
      >
        <CarouselContent className="ml-0">
          {featuredMovies.map((movie) => (
            <CarouselItem
              key={movie.id}
              className="pl-0 relative w-full h-[70vh] md:h-[85vh] flex flex-col justify-end cursor-pointer"
              onClick={() => navigate(`/video/${movie.id}`)}
            >
              {/* Background Image */}
              <div className="absolute inset-0 w-full h-full pointer-events-none">
                <img
                  src={movie.image}
                  alt={movie.title}
                  className="w-full h-full object-cover object-top"
                />
                {/* Top Gradient Overlay */}
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/80 to-transparent" />

                {/* Bottom Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/80 to-transparent" />
              </div>

              {/* Hero Content (Bottom aligned) */}
              <div className="relative z-10 flex flex-col items-center text-center px-4 pb-8 md:pb-16 max-w-4xl mx-auto w-full">
                <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-3 drop-shadow-xl uppercase text-[#ffffff]">
                  {movie.title}
                </h1>

                <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-medium text-primary mb-6 drop-shadow-md">
                  {movie.tags?.map((tag: string, index: number) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span>{tag}</span>
                      {index < movie.tags.length - 1 && (
                        <span className="w-1 h-1 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full pb-4 md:w-auto px-4">
                  {/* Play Button - full width, updated colors */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/video/${movie.id}`);
                    }}
                    className="flex-1 bg-[#ffffff] hover:bg-white/90 text-[#000000] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full"
                  >
                    <Play className="w-4 h-4 fill-current text-secondary" />
                    <span>Play</span>
                  </Button>

                  {/* My List Button */}
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // handle toggling my list
                    }}
                    className="flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-800 hover:text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm"
                  >
                    <Plus className="w-4 h-4 mr-1 text-primary" />
                    <span>My List</span>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Carousel Dots Indicator */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
          {featuredMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${current === index
                ? "w-4 bg-primary"
                : "w-2 bg-zinc-600 hover:bg-zinc-400"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </Carousel>

      {/* Content Rows */}
      <section className="relative z-20 px-4 md:px-12 space-y-4 mt-2">
        {/* Continue Watching Row */}
        <RecentWatch />

        {/* Trending Now Row */}
        <TrendNow />

        {/* Recent TV Shows Row */}
        <RecentTVShows />

        {/* Documentaries Row */}
        <DocumentaryList />
      </section>
    </div>
  );
};