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
import RecentWatch from "./RecentWatch";
import TrendNow from "./TrendNow";

export const HomePage = () => {
  const featuredMovies = [
    {
      id: 1,
      title: "Anweshippin Kandethum",
      image: "/assets/poster.png",
      tags: ["Understated", "Dark", "Drama", "Detectives"],
    },
    {
      id: 2,
      title: "The Office",
      image: "/assets/episode1.webp",
      tags: ["Comedy", "Sitcom", "Workplace", "Classic"],
    },
    {
      id: 3,
      title: "Lord of the Rings",
      image: "/assets/episode2.webp",
      tags: ["Fantasy", "Epic", "Adventure", "Action"],
    },
    {
      id: 4,
      title: "Stranger Things",
      image: "/assets/episode1.webp",
      tags: ["Sci-Fi", "Horror", "Mystery", "80s"],
    },
    {
      id: 5,
      title: "Breaking Bad",
      image: "/assets/poster.png",
      tags: ["Crime", "Drama", "Thriller", "Masterpiece"],
    }
  ];

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

  return (
    <div className="min-h-screen bg-black text-white w-full overflow-hidden pb-20 md:pb-0">
      {/* Logo at the top center */}
      <div className="fixed top-0 left-0 right-0 pt-4 md:pt-10 flex justify-center z-50 pointer-events-none">
        <img src="/assets/logo.png" alt="AVR Cinema" className="w-32 md:w-56 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
      </div>

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
            <CarouselItem key={movie.id} className="pl-0 relative w-full h-[70vh] md:h-[85vh] flex flex-col justify-end">
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
              <div className="relative z-10 flex flex-col items-center text-center px-4 pb-8 md:pb-16 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight mb-3 drop-shadow-xl uppercase text-primary">
                  {movie.title}
                </h1>

                <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-medium text-primary mb-6 drop-shadow-md">
                  {movie.tags.map((tag, index) => (
                    <div key={tag} className="flex items-center gap-2">
                      <span>{tag}</span>
                      {index < movie.tags.length - 1 && (
                        <span className="w-1 h-1 rounded-full bg-secondary-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 w-full pb-4 md:w-auto px-4">
                  {/* Play Button - White bg, Black text */}
                  <Button
                    onClick={() => navigate(`/video/${movie.id}`)}
                    className="flex-1 md:w-36 bg-primary hover:bg-primary/90 text-secondary font-semibold text-lg py-3 rounded-md border border-primary"
                  >
                    <Play className="w-6 h-6 mr-2 fill-secondary  text-secondary dark:text-secondary" />
                    Play
                  </Button>

                  {/* My List Button - Dark bg, White text, Red accent on hover */}
                  <Button variant="outline" className="flex-1 md:w-36 bg-secondary/80 hover:bg-secondary-foreground text-primary hover:text-primary border-primary-foreground/50 backdrop-blur-sm font-semibold text-lg py-3 rounded-md transition-colors">
                    <Plus className="w-6 h-6 mr-2" />
                    My List
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
      <section className="relative z-20 px-4 md:px-12 space-y-4  mt-2">
        {/* Continue Watching Row */}
        <RecentWatch />

        {/* Trending Now Row */}
        <TrendNow />
      </section>
    </div>
  );
};
