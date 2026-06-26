import { Skeleton } from "@/components/ui/skeleton";

export const HomePageSkeleton = () => {
  return (
    <div className="animate-pulse w-full">
      {/* Hero Section Skeleton - matches min-h-[75vh] md:min-h-[88vh] of CarouselItem */}
      <section className="relative w-full min-h-[75vh] md:min-h-[88vh] flex flex-col justify-end">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none bg-zinc-900" />

        {/* MOBILE hero content placeholder - centered */}
        <div className="md:hidden relative z-10 flex flex-col items-center text-center px-4 pb-12 space-y-3 w-full">
          <Skeleton className="h-9 w-3/4 max-w-xs bg-zinc-800 rounded" />
          <Skeleton className="h-4 w-1/2 max-w-[180px] bg-zinc-700 rounded" />
          <div className="flex items-center gap-3 w-full px-2 mt-2">
            <Skeleton className="flex-1 h-12 rounded-md bg-zinc-800" />
            <Skeleton className="flex-1 h-12 rounded-md bg-zinc-800" />
          </div>
        </div>

        {/* DESKTOP hero content placeholder - left-aligned */}
        <div className="hidden md:flex relative z-10 flex-col items-start px-16 pb-20 gap-3 max-w-2xl">
          <Skeleton className="h-5 w-24 bg-zinc-800 rounded" />
          <Skeleton className="h-14 w-80 bg-zinc-800 rounded" />
          <Skeleton className="h-5 w-48 bg-zinc-700 rounded" />
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-12 w-36 rounded-md bg-zinc-800" />
            <Skeleton className="h-12 w-36 rounded-md bg-zinc-800" />
            <Skeleton className="h-5 w-28 bg-zinc-700 rounded" />
          </div>
        </div>

        {/* Dot indicators at bottom */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full bg-zinc-700 ${i === 1 ? "w-6" : "w-1.5"}`}
            />
          ))}
        </div>
      </section>

      {/* Content Rows */}
      <section className="relative z-20 px-4 md:px-12 space-y-3 mt-1 pb-5 md:pb-5">

        {/* Row 1: Continue Watching — landscape 16:9 cards (w-64/w-72) */}
        <div className="w-full">
          <Skeleton className="h-6 w-56 mb-3 bg-zinc-800" />
          <div className="flex gap-4 overflow-hidden w-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="shrink-0 w-64 md:w-72 aspect-video rounded-md bg-zinc-900"
              />
            ))}
          </div>
        </div>

        {/* Row 2: Trending Now — portrait cards with large rank number offset */}
        <div className="w-full space-y-1">
          <Skeleton className="h-8 w-44 bg-zinc-800 rounded" />
          <div
            className="flex overflow-hidden gap-8 sm:gap-12 md:gap-11 w-full"
            style={{
              overflowY: 'visible',
              paddingTop: '80px',
              marginTop: '-80px',
              paddingBottom: '180px',
              marginBottom: '-180px',
              paddingLeft: '48px', // pl-12
              paddingRight: '48px',
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => {
              const isFirst = index === 0;
              return (
                <div
                  key={index}
                  className="flex-none relative pt-4"
                  style={{
                    paddingLeft: isFirst ? '20px' : '0px',
                  }}
                >
                  {/* Rank number placeholder */}
                  <span
                    className="absolute left-0 bottom-[-2px] md:bottom-[-8px] text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black leading-none select-none z-10 pointer-events-none"
                    style={{
                      WebkitTextStroke: "2px #27272a",
                      color: "transparent",
                      fontFamily: '"Oswald", "Arial Narrow", sans-serif',
                      transform: isFirst ? 'translateX(-25%)' : 'translateX(-45%)',
                      fontSize: isFirst ? 'clamp(2.5rem, 8vw, 6rem)' : undefined,
                    }}
                  >
                    {index + 1}
                  </span>
                  <Skeleton className="relative z-20 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 3: TV Shows — portrait cards */}
        <div className="w-full space-y-1">
          <Skeleton className="h-7 w-32 mb-3 bg-zinc-800 rounded" />
          <div className="flex gap-3 overflow-hidden w-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="shrink-0 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900"
              />
            ))}
          </div>
        </div>

        {/* Row 4: Documentaries — portrait cards */}
        <div className="w-full space-y-1">
          <Skeleton className="h-7 w-40 mb-3 bg-zinc-800 rounded" />
          <div className="flex gap-3 overflow-hidden w-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="shrink-0 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900"
              />
            ))}
          </div>
        </div>

        {/* Rows 5–6: Genre rows — portrait cards */}
        {[1, 2].map((rowIdx) => (
          <div key={rowIdx} className="w-full space-y-1">
            <Skeleton className="h-7 w-28 mb-3 bg-zinc-800 rounded" />
            <div className="flex gap-4 overflow-hidden w-full">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="shrink-0 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900"
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
