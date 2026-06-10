import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { getCollectionData, getSignedUrl } from "@/Firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface TrailerItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  category: string;
  [key: string]: any;
}

const Trailer = () => {
  const navigate = useNavigate();
  const [trailers, setTrailers] = useState<TrailerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrailers = async () => {
      try {
        const mediaList = await getCollectionData("media");

        // Filter media that belong to Movie, TV Show, or Documentary categories
        const filteredMedia = mediaList.filter(
          (item) =>
            item.category === "Movie" ||
            item.category === "TV Show" ||
            item.category === "Documentary"
        );

        // Sign all thumbnail URLs
        const signedList = await Promise.all(
          filteredMedia.map(async (item) => {
            let signedThumb = item.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(item.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...item,
              signedThumbnailUrl: signedThumb,
            } as TrailerItem;
          })
        );

        setTrailers(signedList);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrailers();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-12 lg:px-16  pb-24 w-full">
      <div className=" mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-bold text-white tracking-wide">Trailers</h1>
          <p className="text-zinc-400 text-sm">
            Watch the latest trailers for movies, TV shows, and documentaries.
          </p>
        </div>

        {isLoading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="w-full aspect-video rounded-lg bg-zinc-900" />
                <Skeleton className="h-5 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : trailers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center border border-zinc-900 rounded-2xl bg-zinc-950/20">
            <h3 className="text-lg font-bold text-white mb-2">No Trailers Found</h3>
            <p className="text-zinc-500 text-sm">Check back later for new releases.</p>
          </div>
        ) : (
          /* Trailers Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {trailers.map((item) => {
              // Format Title: Ensure it ends with Trailer or add "| Banner Trailer"
              const displayTitle = item.title.toLowerCase().includes("trailer")
                ? item.title
                : `${item.title} | Banner Trailer`;

              // Subtitle: Trailer, Genre1, Genre2 or Category
              const genresList = item.genres && item.genres.length > 0
                ? item.genres.slice(0, 2).join(", ")
                : item.category;
              const displaySubtitle = `Trailer, ${genresList}`;

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/video/${item.id}`)}
                  className="flex flex-col rounded-lg overflow-hidden cursor-pointer group bg-[#181d24] border border-zinc-900 transition-all hover:scale-[1.02] hover:border-zinc-700 shadow-md text-left"
                >
                  {/* Thumbnail / Image container */}
                  <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden">
                    <img
                      src={item.signedThumbnailUrl || "/assets/poster.png"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/poster.png";
                      }}
                    />
                    {/* Play Button Icon Overlay on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Play className="w-6 h-6 text-black fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-[#12161b]">
                    <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-zinc-250 transition-colors">
                      {displayTitle}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-2 truncate">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trailer;
