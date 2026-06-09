import { Skeleton } from "@/components/ui/skeleton";

export const HomePageSkeleton = () => {
  return (
    <div className="animate-pulse w-full">
      {/* Hero Section Skeleton */}
      <section className="relative w-full h-[70vh] md:h-[85vh] flex flex-col justify-end">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none bg-zinc-900" />
        
        {/* Content placeholder */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 pb-8 md:pb-16 max-w-4xl mx-auto space-y-4 w-full">
          <Skeleton className="h-12 w-3/4 max-w-md bg-zinc-800" />
          <Skeleton className="h-4 w-1/2 max-w-xs bg-zinc-800" />
          
          <div className="flex items-center gap-4 w-full md:w-auto px-4 mt-4">
            <Skeleton className="flex-1 md:w-36 h-14 rounded-md bg-zinc-800" />
            <Skeleton className="flex-1 md:w-36 h-14 rounded-md bg-zinc-800" />
          </div>
        </div>
      </section>

      {/* Content Rows Skeleton */}
      <section className="relative z-20 px-4 md:px-12 space-y-8 mt-2 w-full">
        {/* Row 1 */}
        <div className="w-full">
          <Skeleton className="h-6 w-48 mb-3 bg-zinc-800" />
          <div className="flex gap-4 overflow-hidden w-full">
            <Skeleton className="shrink-0 w-64 md:w-72 aspect-video rounded-md bg-zinc-900" />
            <Skeleton className="shrink-0 w-64 md:w-72 aspect-video rounded-md bg-zinc-900" />
          </div>
        </div>
        
        {/* Row 2 */}
        <div className="w-full">
          <Skeleton className="h-6 w-32 mb-3 bg-zinc-800" />
          <div className="flex gap-4 overflow-hidden w-full">
            <Skeleton className="shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md bg-zinc-900" />
            <Skeleton className="shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md bg-zinc-900" />
            <Skeleton className="shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md bg-zinc-900" />
          </div>
        </div>
      </section>
    </div>
  );
};
