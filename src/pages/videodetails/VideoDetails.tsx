import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import {
  Play, Pause, Plus, ChevronLeft, ChevronDown, Share2, Cast, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocumentData, getMatchingData, getSignedUrl, compoundQuery, deleteDocument, createDocument } from '@/Firebase';
import { CustomVideoPlayer, type CustomVideoPlayerRef } from './CustomVideoPlayer';
import { FeedbackModal } from './FeedbackModal';

// Static movie data store as fallback
const MOVIES_DATA: Record<string, {
  id: string;
  title: string;
  image: string;
  year: string;
  duration: string;
  rating: string;
  quality: string;
  description: string;
  category: string;
  seasons: { label: string; episodes: { id: number; episodeNumber?: number; title: string; image: string; duration: string; videoUrl?: string; signedVideoUrl?: string }[] }[];
  cast: { name: string; image: string }[];
  related: { id: string | number; title: string; image: string }[];
  movieUrl?: string;
}> = {
  '1': {
    id: '1',
    title: 'Anweshippin Kandethum',
    image: '/assets/poster.png',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.',
    category: 'Movie',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m' },
          { id: 3, title: 'The Beginning', image: '/assets/poster.png', duration: '45m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '2', title: 'The Office', image: '/assets/episode1.webp' },
      { id: '3', title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: '4', title: 'Stranger Things', image: '/assets/poster.png' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '2': {
    id: '2',
    title: 'The Office',
    image: '/assets/episode1.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A mockumentary on a group of typical office workers, where the weights of the day are carried by the employees.',
    category: 'TV Show',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m', videoUrl: 'https://example.com/video1.mp4' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m', videoUrl: 'https://example.com/video2.mp4' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '1', title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: '3', title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '3': {
    id: '3',
    title: 'Lord of the Rings',
    image: '/assets/episode2.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth.',
    category: 'Movie',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'The Fellowship', image: '/assets/episode2.webp', duration: '178m' },
          { id: 2, title: 'The Two Towers', image: '/assets/episode1.webp', duration: '179m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '1', title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: '2', title: 'The Office', image: '/assets/episode1.webp' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  }
};

// Fallback for any ID not in our data
const DEFAULT_MOVIE = MOVIES_DATA['1'];

const VideoDetailsSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-2 px-4 animate-pulse">
    <div className="w-full aspect-video bg-zinc-900 rounded-lg mb-6" />
    <div className="px-4 md:px-8 max-w-4xl mx-auto space-y-6 pt-2">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1 mr-4">
          <div className="w-2/3 h-8 bg-zinc-900 rounded" />
          <div className="w-1/3 h-4 bg-zinc-900 rounded" />
        </div>
        <div className="w-16 h-8 bg-zinc-900 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 h-12 bg-zinc-900 rounded-lg" />
        <div className="flex-1 h-12 bg-zinc-900 rounded-lg" />
      </div>
      <div className="w-24 h-6 bg-zinc-900 rounded" />
      <div className="w-full h-24 bg-zinc-900 rounded-lg" />
    </div>
  </div>
);

const VideoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as { episode?: any; seasonNumber?: number; videoUrl?: string; title?: string } | null;

  // Stable random match percentage per video details session (between 90% and 99%)
  const matchPercentage = useMemo(() => {
    return 90 + Math.floor(Math.random() * 10);
  }, [id]);

  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id || "";
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [movie, setMovie] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getRelatedItemDetails = (item: any) => {
    const staticData = MOVIES_DATA[item.id];
    return {
      ...item,
      description: item.description || staticData?.description || "No description available.",
      ageRating: item.ageRating || item.rating || staticData?.rating || "U/A",
      language: item.language || staticData?.language || "",
      seasons: item.seasons || staticData?.seasons || []
    };
  };

  // Netflix-style player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInternalPlaying, setIsInternalPlaying] = useState(false);
  const playerRef = React.useRef<CustomVideoPlayerRef>(null);
  const [videoUrlToPlay, setVideoUrlToPlay] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [currentPlayingEpisodeTitle, setCurrentPlayingEpisodeTitle] = useState("");
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [forceFullscreen, setForceFullscreen] = useState(false);

  // Navigation tabs selection state
  const [activeTab, setActiveTab] = useState<'episodes' | 'related' | 'details'>('episodes');

  // Backdrop image loading state
  const [isImageLoading, setIsImageLoading] = useState(true);

  // TV Show Specific States
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Reset image loading state on id navigation changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [id]);

  // Watch progress state
  const [watchProgress, setWatchProgress] = useState<{ currentTime: number; duration: number; episodeId?: string | number } | null>(null);
  const [episodesProgress, setEpisodesProgress] = useState<Record<string, { currentTime: number; duration: number }>>({});

  // Watchlist (My List) states
  const [isInMyList, setIsInMyList] = useState<boolean>(false);
  const [isListToggling, setIsListToggling] = useState<boolean>(false);
  const [myListIds, setMyListIds] = useState<string[]>([]);

  // Dynamic feedback and average rating states
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [hasAlreadyRated, setHasAlreadyRated] = useState<boolean>(false);

  const loadFeedbackStats = async (movieId: string) => {
    if (!movieId) return;
    try {
      const feedbacks = await getMatchingData("feedback", "movieId", "==", movieId);
      if (feedbacks && feedbacks.length > 0) {
        const total = feedbacks.reduce((acc: number, f: any) => acc + (f.rating || 0), 0);
        const avg = total / feedbacks.length;
        setAverageRating(avg);
        setReviewCount(feedbacks.length);

        if (userId) {
          const userHasRated = feedbacks.some((f: any) => f.userId === userId);
          setHasAlreadyRated(userHasRated);
        } else {
          try {
            const localFeedback = localStorage.getItem('avr_local_feedback') || '{}';
            const localRatings = JSON.parse(localFeedback);
            setHasAlreadyRated(!!localRatings[movieId]);
          } catch (_) {
            setHasAlreadyRated(false);
          }
        }
      } else {
        setAverageRating(null);
        setReviewCount(0);

        if (userId) {
          setHasAlreadyRated(false);
        } else {
          try {
            const localFeedback = localStorage.getItem('avr_local_feedback') || '{}';
            const localRatings = JSON.parse(localFeedback);
            setHasAlreadyRated(!!localRatings[movieId]);
          } catch (_) {
            setHasAlreadyRated(false);
          }
        }
      }
    } catch (err) {
      console.error("Error loading feedback statistics:", err);
    }
  };

  useEffect(() => {
    if (id) {
      loadFeedbackStats(id);
    }
  }, [id, userId]);

  // Helper function to sign URLs
  const signUrl = async (url: string) => {
    if (!url) return "";
    try {
      return await getSignedUrl(url);
    } catch (err) {
      console.error("Error signing URL:", err);
      return url;
    }
  };

  // Check if there's an episode from navigation state (from Episode.tsx)
  useEffect(() => {
    if (locationState?.videoUrl && locationState?.episode) {
      // Directly play the episode from navigation state
      const playFromNavigation = async () => {
        setCurrentEpisode(locationState.episode);
        setCurrentPlayingEpisodeTitle(locationState.title || `S${locationState.seasonNumber}:E${locationState.episode.episodeNumber} - ${locationState.episode.title}`);
        setVideoUrlToPlay(locationState.videoUrl!);
        setForceFullscreen(true);
        setIsPlaying(true);
      };
      playFromNavigation();
    }
  }, [locationState]);

  // Reload watch progress when the movie ID changes or when player exits (isPlaying changes to false)
  useEffect(() => {
    if (!movie || isPlaying) return;

    const loadProgress = async () => {
      if (userId) {
        try {
          const saved = await getDocumentData("watch_progress", `${userId}_${movie.id}`);
          if (saved && saved.currentTime > 0 && saved.duration > 0) {
            setWatchProgress({
              currentTime: saved.currentTime,
              duration: saved.duration,
              episodeId: saved.episodeId
            });
            return;
          }
          setWatchProgress(null);
        } catch (err) {
          console.error("Error loading watch progress from DB:", err);
          setWatchProgress(null);
        }
      } else {
        try {
          const progressDataStr = localStorage.getItem('avr_watch_progress');
          if (progressDataStr) {
            const progressData = JSON.parse(progressDataStr);
            const saved = progressData[movie.id];
            if (saved && saved.currentTime > 0 && saved.duration > 0) {
              setWatchProgress(saved);
              return;
            }
          }
          setWatchProgress(null);
        } catch (err) {
          console.error("Error loading watch progress:", err);
          setWatchProgress(null);
        }
      }
    };

    loadProgress();
  }, [movie, isPlaying, userId]);

  // Load if this movie is in My List
  useEffect(() => {
    if (!movie) return;

    const checkMyList = async () => {
      if (userId) {
        try {
          const listDocs = await compoundQuery("my_list", [
            { key: "userId", operator: "==", value: userId }
          ]);
          const ids = listDocs.map((d: any) => d.movieId?.toString() || "");
          setMyListIds(ids);
          setIsInMyList(ids.includes(movie.id.toString()));
        } catch (err) {
          console.error("Error loading watchlist state from DB:", err);
          setIsInMyList(false);
          setMyListIds([]);
        }
      } else {
        try {
          const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
          const ids = JSON.parse(myListDataStr);
          setMyListIds(ids);
          setIsInMyList(ids.includes(movie.id.toString()));
        } catch (err) {
          console.error("Error loading local watchlist:", err);
          setIsInMyList(false);
          setMyListIds([]);
        }
      }
    };

    checkMyList();
  }, [movie, userId]);

  // Load progress of all episodes for this show
  useEffect(() => {
    if (!movie || isPlaying) return;

    const loadEpisodesProgress = async () => {
      if (!(movie.category === "TV Show" || movie.category === "Documentary") || !movie.seasons || movie.seasons.length === 0) {
        setEpisodesProgress({});
        return;
      }

      if (userId) {
        try {
          const docs = await compoundQuery("watch_progress", [
            { key: "userId", operator: "==", value: userId },
            { key: "movieId", operator: "==", value: movie.id }
          ]);

          const progressDict: Record<string, { currentTime: number; duration: number }> = {};
          docs.forEach((d: any) => {
            if (d.episodeId) {
              progressDict[d.episodeId.toString()] = {
                currentTime: d.currentTime,
                duration: d.duration
              };
            }
          });
          setEpisodesProgress(progressDict);
        } catch (err) {
          console.error("Error loading episodes progress from DB:", err);
        }
      } else {
        try {
          const progressDataStr = localStorage.getItem('avr_watch_progress');
          if (progressDataStr) {
            const progressData = JSON.parse(progressDataStr);
            const progressDict: Record<string, { currentTime: number; duration: number }> = {};

            Object.keys(progressData).forEach((key) => {
              if (key.startsWith(`${movie.id}_ep_`)) {
                const epId = key.replace(`${movie.id}_ep_`, "");
                const saved = progressData[key];
                if (saved) {
                  progressDict[epId] = {
                    currentTime: saved.currentTime,
                    duration: saved.duration
                  };
                }
              }
            });
            setEpisodesProgress(progressDict);
          } else {
            setEpisodesProgress({});
          }
        } catch (err) {
          console.error("Error loading local episodes progress:", err);
        }
      }
    };

    loadEpisodesProgress();
  }, [movie, isPlaying, userId]);

  const formatProgressTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEpisodeProgress = (epId: string | number) => {
    return episodesProgress[epId.toString()] || null;
  };

  const handleToggleMyList = async () => {
    if (!movie) return;
    setIsListToggling(true);

    const movieIdStr = movie.id.toString();
    if (userId) {
      const docId = `${userId}_${movieIdStr}`;
      if (isInMyList) {
        try {
          await deleteDocument("my_list", docId);
          setIsInMyList(false);
          setMyListIds(prev => prev.filter(id => id !== movieIdStr));
          toast.success("Removed from wishlist");
        } catch (err) {
          console.error("Error removing from My List in DB:", err);
        }
      } else {
        try {
          const payload = {
            id: docId,
            userId,
            movieId: movieIdStr,
            addedAt: serverTimestamp(),
            title: movie.title,
            image: movie.image,
            category: movie.category,
            year: movie.year,
            rating: movie.rating,
            duration: movie.duration
          };
          await createDocument("my_list", docId, payload);
          setIsInMyList(true);
          setMyListIds(prev => [...prev, movieIdStr]);
          toast.success("Added to wishlist");
        } catch (err) {
          console.error("Error adding to My List in DB:", err);
        }
      }
    } else {
      // LocalStorage fallback
      try {
        const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
        let myList = JSON.parse(myListDataStr);
        if (isInMyList) {
          myList = myList.filter((item: string) => item !== movieIdStr);
          setIsInMyList(false);
          setMyListIds(prev => prev.filter(id => id !== movieIdStr));
          toast.success("Removed from wishlist");
        } else {
          myList.push(movieIdStr);
          setIsInMyList(true);
          setMyListIds(prev => [...prev, movieIdStr]);
          toast.success("Added to wishlist");
        }
        localStorage.setItem('avr_my_list', JSON.stringify(myList));
      } catch (err) {
        console.error("Error toggling local watchlist:", err);
      }
    }
    setIsListToggling(false);
  };

  const handleToggleRelatedMyList = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!item || isListToggling) return;
    setIsListToggling(true);

    const itemIdStr = item.id.toString();
    const isCurrentlyIn = myListIds.includes(itemIdStr);

    if (userId) {
      const docId = `${userId}_${itemIdStr}`;
      if (isCurrentlyIn) {
        try {
          await deleteDocument("my_list", docId);
          setMyListIds(prev => prev.filter(id => id !== itemIdStr));
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(false);
          }
          toast.success("Removed from wishlist");
        } catch (err) {
          console.error("Error removing related item from My List:", err);
        }
      } else {
        try {
          const payload = {
            id: docId,
            userId,
            movieId: itemIdStr,
            addedAt: serverTimestamp(),
            title: item.title,
            image: item.image,
            category: item.category || "Movie",
            year: item.year || "N/A",
            rating: item.rating || "PG-13",
            duration: item.duration || "N/A"
          };
          await createDocument("my_list", docId, payload);
          setMyListIds(prev => [...prev, itemIdStr]);
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(true);
          }
          toast.success("Added to wishlist");
        } catch (err) {
          console.error("Error adding related item to My List:", err);
        }
      }
    } else {
      // LocalStorage fallback
      try {
        const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
        let myList = JSON.parse(myListDataStr);
        if (isCurrentlyIn) {
          myList = myList.filter((id: string) => id !== itemIdStr);
          setMyListIds(prev => prev.filter(id => id !== itemIdStr));
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(false);
          }
          toast.success("Removed from wishlist");
        } else {
          myList.push(itemIdStr);
          setMyListIds(prev => [...prev, itemIdStr]);
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(true);
          }
          toast.success("Added to wishlist");
        }
        localStorage.setItem('avr_my_list', JSON.stringify(myList));
      } catch (err) {
        console.error("Error toggling local watchlist for related item:", err);
      }
    }
    setIsListToggling(false);
  };

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        // Reset player states
        setIsPlaying(false);
        setVideoUrlToPlay("");

        // 1. Try fetching from Firestore "media" collection
        const dbMovie = await getDocumentData("media", id);
        if (dbMovie) {
          let signedThumb = dbMovie.thumbnailUrl || "";
          if (signedThumb) {
            signedThumb = await signUrl(dbMovie.thumbnailUrl);
          }
          let signedTrailerUrl = dbMovie.videoUrl || "";
          if (signedTrailerUrl) {
            signedTrailerUrl = await signUrl(dbMovie.videoUrl);
          }

          // Map Firestore document structure to UI model and SIGN ALL VIDEO URLs
          let mappedSeasons: any[] = [];

          if ((dbMovie.category === "TV Show" || dbMovie.category === "Documentary") && dbMovie.seasons) {
            mappedSeasons = await Promise.all(
              dbMovie.seasons.map(async (s: any) => {
                let signedEpisodes: any[] = [];
                if (s.episodes) {
                  signedEpisodes = await Promise.all(
                    s.episodes.map(async (ep: any) => {
                      let signedVideoUrl = ep.videoUrl || "";
                      let signedEpThumb = ep.thumbnailUrl || "";

                      // CRITICAL: Sign the video URL for each episode
                      if (signedVideoUrl) {
                        signedVideoUrl = await signUrl(ep.videoUrl);
                      }
                      if (signedEpThumb) {
                        signedEpThumb = await signUrl(ep.thumbnailUrl);
                      }

                      return {
                        id: ep.id,
                        episodeNumber: ep.episodeNumber,
                        title: ep.title,
                        image: signedEpThumb || "/assets/episode1.webp",
                        duration: ep.duration || "N/A",
                        videoUrl: ep.videoUrl || "",
                        signedVideoUrl: signedVideoUrl, // Store signed URL
                        description: ep.description || ""
                      };
                    })
                  );
                }
                return {
                  id: s.id,
                  label: s.label || `Season ${s.seasonNumber}`,
                  episodes: signedEpisodes
                };
              })
            );
          }

          const mappedMovie = {
            id: dbMovie.id,
            title: dbMovie.title,
            image: signedThumb || "/assets/poster.png",
            year: dbMovie.releaseYear?.toString() || "N/A",
            duration: dbMovie.duration || "N/A",
            rating: dbMovie.ageRating || "13+",
            quality: dbMovie.category === "Movie" || dbMovie.category === "Documentary" ? "4K" : "HD",
            description: dbMovie.description || "",
            category: dbMovie.category,
            movieUrl: dbMovie.movieUrl || dbMovie.videoUrl || "",
            trailerUrl: signedTrailerUrl || "",
            seasons: mappedSeasons,
            cast: dbMovie.cast ? dbMovie.cast.map((c: any) => ({
              name: c.name,
              image: c.imageUrl || "/assets/cast1.webp"
            })) : [],
            related: [] as { id: string; title: string; image: string }[],
            director: dbMovie.director || "Robbie Grewal",
            contentDescriptor: dbMovie.contentDescriptor || "tobacco depictions, alcohol use, foul language",
            language: dbMovie.language || "Hindi",
            publisher: dbMovie.publisher || "Almighty Motion Picture",
            genres: dbMovie.genres || (dbMovie.genre ? [dbMovie.genre] : [])
          };

          // Fetch related items from the same category dynamically
          try {
            const allOfCategory = await getMatchingData("media", "category", "==", dbMovie.category);

            const currentGenres = dbMovie.genres || (dbMovie.genre ? [dbMovie.genre] : []);
            let filtered = allOfCategory.filter(m => {
              if (m.id === dbMovie.id) return false;
              if (currentGenres.length === 0) return true;

              const itemGenres = m.genres || (m.genre ? [m.genre] : []);
              return currentGenres.some((cg: string) =>
                itemGenres.some((ig: string) => ig.toLowerCase() === cg.toLowerCase())
              );
            });

            // Fallback: if we have fewer than 4 matches, fill in with items from same category
            if (filtered.length < 4) {
              const remaining = allOfCategory.filter(m =>
                m.id !== dbMovie.id && !filtered.some(f => f.id === m.id)
              );
              filtered = [...filtered, ...remaining].slice(0, 4);
            } else {
              filtered = filtered.slice(0, 4);
            }

            // Sign the thumbnails of related items
            mappedMovie.related = await Promise.all(filtered.map(async (m) => {
              let signedRelatedThumb = m.thumbnailUrl || "";
              if (signedRelatedThumb) {
                signedRelatedThumb = await signUrl(m.thumbnailUrl);
              }
              return {
                id: m.id,
                title: m.title,
                image: signedRelatedThumb || "/assets/poster.png",
                duration: m.duration || "N/A",
                category: m.category || "Movie",
                year: m.releaseYear?.toString() || "N/A",
                ageRating: m.ageRating || m.rating || "U/A",
                description: m.description || "",
                language: m.language || "",
                seasons: m.seasons || []
              };
            }));
          } catch (relatedErr) {
            console.error("Error fetching related items:", relatedErr);
          }

          setMovie(mappedMovie);
          setActiveTab((mappedMovie.category === "TV Show" || mappedMovie.category === "Documentary") && mappedMovie.seasons && mappedMovie.seasons.length > 0 ? "episodes" : "related");
        } else if (MOVIES_DATA[id]) {
          setMovie(MOVIES_DATA[id]);
          setActiveTab((MOVIES_DATA[id].category === "TV Show" || MOVIES_DATA[id].category === "Documentary") && MOVIES_DATA[id].seasons && MOVIES_DATA[id].seasons.length > 0 ? "episodes" : "related");
        } else {
          setMovie(DEFAULT_MOVIE);
          setActiveTab((DEFAULT_MOVIE.category === "TV Show" || DEFAULT_MOVIE.category === "Documentary") && DEFAULT_MOVIE.seasons && DEFAULT_MOVIE.seasons.length > 0 ? "episodes" : "related");
        }
      } catch (err) {
        console.error("Error loading movie data:", err);
        if (MOVIES_DATA[id]) {
          setMovie(MOVIES_DATA[id]);
          setActiveTab((MOVIES_DATA[id].category === "TV Show" || MOVIES_DATA[id].category === "Documentary") && MOVIES_DATA[id].seasons && MOVIES_DATA[id].seasons.length > 0 ? "episodes" : "related");
        } else {
          setMovie(DEFAULT_MOVIE);
          setActiveTab((DEFAULT_MOVIE.category === "TV Show" || DEFAULT_MOVIE.category === "Documentary") && DEFAULT_MOVIE.seasons && DEFAULT_MOVIE.seasons.length > 0 ? "episodes" : "related");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovieData();
  }, [id]);

  const handlePlayClick = async (url: string, epInfo?: string, shouldFullscreen = false) => {
    if (!url) return;
    try {
      setIsSigning(true);
      setCurrentPlayingEpisodeTitle(epInfo || "");

      let finalUrl = url;

      // Only sign if it contains /authenticated/ and doesn't already have a signature
      if (url.includes("/authenticated/") && !url.includes("s--")) {
        try {
          finalUrl = await signUrl(url);
          console.log("URL signed successfully");
        } catch (signErr) {
          console.warn("Failed to sign URL, using original:", signErr);
          finalUrl = url;
        }
      } else if (url.startsWith('http') && !url.includes("/authenticated/")) {
        // Public URL, use as-is
        finalUrl = url;
      }

      setVideoUrlToPlay(finalUrl);
      setForceFullscreen(shouldFullscreen);
      setIsPlaying(true);
    } catch (err) {
      console.error("Error preparing video stream URL:", err);
      setVideoUrlToPlay(url);
      setForceFullscreen(shouldFullscreen);
      setIsPlaying(true);
    } finally {
      setIsSigning(false);
    }
  };

  const playEpisode = async (ep: any, shouldFullscreen = false) => {
    setCurrentEpisode(ep);
    // Use pre-signed URL if available, otherwise sign it now
    const videoUrl = ep.signedVideoUrl || ep.videoUrl;
    await handlePlayClick(videoUrl, `E${ep.episodeNumber || ep.id} • ${ep.title}`, shouldFullscreen);
  };

  const handleStartPlayback = async (shouldFullscreen = false) => {
    if (movie.category === "TV Show" || (movie.category === "Documentary" && movie.seasons && movie.seasons.length > 0)) {
      const lastWatchedEpId = watchProgress?.episodeId;
      let epToPlay = null;

      if (lastWatchedEpId) {
        // Find the episode in any season
        for (const season of movie.seasons || []) {
          epToPlay = season.episodes?.find((e: any) =>
            e.id === lastWatchedEpId || e.episodeNumber === lastWatchedEpId
          );
          if (epToPlay) break;
        }
      }

      if (!epToPlay && movie.seasons?.[0]?.episodes?.[0]) {
        epToPlay = movie.seasons[0].episodes[0];
      }

      if (epToPlay) {
        await playEpisode(epToPlay, shouldFullscreen);
      }
    } else {
      setCurrentEpisode(null);
      await handlePlayClick(movie.movieUrl || movie.videoUrl || "", movie.category || "Movie", shouldFullscreen);
    }
  };

  const playNextEpisode = async () => {
    if (!movie || !currentEpisode) return;

    // Find current season and episode
    for (let seasonIdx = 0; seasonIdx < (movie.seasons?.length || 0); seasonIdx++) {
      const season = movie.seasons[seasonIdx];
      const currentEpIndex = season.episodes?.findIndex((e: any) => e.id === currentEpisode.id);

      if (currentEpIndex !== -1 && currentEpIndex !== undefined) {
        // Check if there's a next episode in same season
        if (currentEpIndex + 1 < (season.episodes?.length || 0)) {
          await playEpisode(season.episodes[currentEpIndex + 1], forceFullscreen);
          return;
        }
        // Check next season
        if (seasonIdx + 1 < (movie.seasons?.length || 0)) {
          const nextSeason = movie.seasons[seasonIdx + 1];
          if (nextSeason.episodes?.length > 0) {
            await playEpisode(nextSeason.episodes[0], forceFullscreen);
            return;
          }
        }
        break;
      }
    }

    // No next episode found, just exit player
    handleExitPlayer();
  };

  const handleExitPlayer = () => {
    setIsPlaying(false);
    setVideoUrlToPlay("");
    setCurrentPlayingEpisodeTitle("");
    setCurrentEpisode(null);
    setForceFullscreen(false);
  };

  const handleViewAllEpisodes = () => {
    setActiveTab('episodes');
    setTimeout(() => {
      const el = document.getElementById("episodes-tabs") || document.getElementById("episodes-section");
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  if (isLoading) {
    return <VideoDetailsSkeleton />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white w-full flex flex-col items-center justify-center gap-4">
        <span className="text-zinc-550">Asset metadata could not be retrieved.</span>
        <Button onClick={() => navigate(-1)} className="focusable bg-primary text-secondary">Go Back</Button>
      </div>
    );
  }

  if (movie.category === "TV Show" || movie.category === "Documentary") {
    return (
      <div className="min-h-screen bg-black text-white w-full pb-7 md:pb-0 relative select-none">

        {/* Top Video/Banner Header Section */}
        <div
          className={(isPlaying && forceFullscreen) ? "fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in" : "relative w-full aspect-video md:h-[50vh] lg:h-[65vh] bg-black overflow-hidden border-b border-zinc-900"}
        >
          {isPlaying && videoUrlToPlay ? (
            <CustomVideoPlayer
              ref={playerRef}
              onPlayStateChange={setIsInternalPlaying}
              movie={movie}
              currentEpisode={currentEpisode}
              videoUrlToPlay={videoUrlToPlay}
              currentPlayingEpisodeTitle={currentPlayingEpisodeTitle}
              onExit={handleExitPlayer}
              playNextEpisode={playNextEpisode}
              userId={userId}
              playInline={!forceFullscreen}
              hasAlreadyRated={hasAlreadyRated}
              onFeedbackSubmitted={() => loadFeedbackStats(movie.id)}
              trailerUrl={movie.trailerUrl}
            />
          ) : (
            <>
              <img
                src={movie.image || "/assets/poster.png"}
                alt={movie.title}
                className="w-full h-full object-cover opacity-80"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-[2]" />

              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
                <button 
                  onClick={() => navigate(-1)}
                  className="focusable focusable p-2.5 rounded-full bg-black/55 border border-zinc-900/60 text-white hover:bg-black/85 transition-all cursor-pointer flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  {/* <button tabIndex={-1} className="focusable p-2.5 rounded-full bg-black/55 border border-zinc-900/60 hover:bg-black/85 text-white transition-all cursor-pointer">
                    <Cast className="w-5 h-5 text-white" />
                  </button> */}
                  {/* <button tabIndex={-1} className="focusable p-2.5 rounded-full bg-black/55 border border-zinc-900/60 hover:bg-black/85 text-white transition-all cursor-pointer">
                    <Share2 className="w-5 h-5 text-white" />
                  </button> */}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center z-[3]">
                <button 
                  onClick={() => handleStartPlayback(false)}
                  className="focusable focusable w-14 h-14 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all border-2 border-white/20 cursor-pointer shadow-lg active:scale-95"
                >
                  {isSigning ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  )}
                </button>
              </div>

              {/* Progress helper */}
              {!isPlaying && watchProgress && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 pb-3 z-10">
                  <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary-foreground rounded-full"
                      style={{ width: `${(watchProgress.currentTime / watchProgress.duration) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">
                    {formatProgressTime(watchProgress.currentTime)} / {formatProgressTime(watchProgress.duration)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* MOBILE VIEW (block md:hidden) */}
        <div className="block md:hidden max-w-md mx-auto px-4 pt-4 space-y-5">
          {/* Title and Metadata Details */}
          <div className="text-left space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{movie.title}</h1>
            <div className="flex items-center flex-wrap gap-2 text-xs font-bold text-zinc-400">
              {reviewCount > 0 && averageRating !== null && (
                <span 
                  tabIndex={0}
                  onClick={() => setShowFeedbackModal(true)}
                  className="focusable focusable text-secondary-foreground font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                  title="Click to rate this title"
                >
                  ⭐ {averageRating.toFixed(1)} ({reviewCount})
                </span>
              )}
              <span className="text-green-500 font-bold">{matchPercentage}% Match</span>
              <span>{movie.year}</span>
              <span className="px-1.5 py-0.5 border border-zinc-700 rounded text-[10px] uppercase">{movie.rating || "PG-13"}</span>
              <span>{movie.seasons && movie.seasons.length > 0 ? `${movie.seasons.length} Seasons` : (movie.duration || "N/A")}</span>
              <span className="px-1.5 py-0.5 border border-zinc-700 text-zinc-350 rounded text-[9px] font-bold">4K</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (isPlaying) {
                  playerRef.current?.togglePlayPause();
                } else {
                  handleStartPlayback(false);
                }
              }}
              disabled={isSigning}
              className="flex-1 bg-white hover:bg-white/95 text-black font-semibold py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-55"
            >
              {isSigning ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                isPlaying && isInternalPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-current text-black" />
                )
              )}
              <span>
                {isPlaying && isInternalPlaying
                  ? "Pause"
                  : (watchProgress ? "Resume" : (movie.seasons && movie.seasons.length > 0 ? "Play S1·E1" : "Play"))}
              </span>
            </Button>
            <Button
              onClick={handleToggleMyList}
              disabled={isListToggling}
              variant="outline"
              className="flex-1 bg-zinc-900/80 border-zinc-800 text-white hover:bg-zinc-850 hover:text-white font-semibold py-5 rounded-md cursor-pointer disabled:opacity-55"
            >
              {isInMyList ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              <span>{isInMyList ? "In My List" : "My List"}</span>
            </Button>
          </div>

          {/* Season Selector Tabs */}
          {movie.seasons && movie.seasons.length > 0 && (
            <div className="w-full text-left">
              <div className="flex gap-3 w-full justify-start overflow-x-auto scrollbar-hide mb-4 border-b border-zinc-800 pb-2">
                {movie.seasons.map((season: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedSeason(idx)}
                    className={`focusable focusable flex-1 min-w-[80px] max-w-[150px] py-2.5 text-xs font-bold text-center transition-all cursor-pointer whitespace-nowrap rounded-md ${selectedSeason === idx ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                  >
                    {season.label || `Season ${idx + 1}`}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {(movie.seasons[selectedSeason]?.episodes || []).map((ep: any) => (
                  <div 
                    key={ep.id}
                    tabIndex={0}
                    onClick={() => playEpisode(ep, false)}
                    className="focusable focusable flex gap-4 items-center bg-zinc-900/30 border border-zinc-850 p-3 rounded-lg hover:bg-zinc-900/60 transition-colors cursor-pointer group shadow-sm relative"
                  >
                    {/* Left: Episode Thumbnail */}
                    <div className="relative w-28 sm:w-36 aspect-video rounded-md overflow-hidden bg-zinc-950 shrink-0 shadow-sm">
                      <img
                        src={ep.image || movie.image || "/assets/poster.png"}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>

                      {/* Episode specific progress bar */}
                      {(() => {
                        const epProgress = getEpisodeProgress(ep.id);
                        if (epProgress) {
                          return (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-850">
                              <div
                                className="h-full bg-secondary-foreground"
                                style={{ width: `${(epProgress.currentTime / epProgress.duration) * 100}%` }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Middle: Episode Info & Description */}
                    <div className="flex-1 min-w-0 text-left space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                        E{ep.episodeNumber || ep.id} - {ep.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold">
                        <span>{ep.duration || "22m"}</span>
                        <span className="px-1.5 py-0.25 border border-zinc-800 text-[8px] bg-zinc-900/65 rounded font-extrabold text-zinc-350 uppercase">4K</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-zinc-500 leading-normal font-medium line-clamp-2">
                        {ep.description || `Episode ${ep.episodeNumber || ep.id} of ${movie.title}. Enjoy the premium streaming experience on AVR Cinema.`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="text-left space-y-1.5 border-t border-zinc-900 pt-4">
            <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
              Description <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed font-normal animate-in fade-in duration-200">
              {isDescExpanded ? movie.description : `${(movie.description || "").slice(0, 150)}${(movie.description || "").length > 150 ? "..." : ""}`}
              {(movie.description || "").length > 150 && (
                <button 
                  tabIndex={-1}
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="focusable text-primary font-semibold ml-1 hover:underline focus:outline-none cursor-pointer"
                >
                  {isDescExpanded ? " less" : " more"}
                </button>
              )}
            </p>
          </div>

          {/* Cast & Crew Section */}
          {movie.cast && movie.cast.length > 0 && (
            <div className="text-left space-y-3 border-t border-zinc-900 pt-4">
              <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
                Cast & Crew <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
              </h2>

              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                {movie.cast.map((member: any, index: number) => (
                  <div key={index} className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                      <img
                        src={member.image || member.imageUrl || "/assets/cast1.webp"}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[9px] font-bold text-zinc-450 text-center w-14 truncate">
                      {member.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related TV Shows Section */}
          {movie.related && movie.related.length > 0 && (
            <div className="text-left space-y-3 border-t border-zinc-900 pt-4">
              <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
                Related <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
              </h2>

              <div className="grid grid-cols-2 gap-3 pb-8">
                {movie.related.map((item: any) => (
                  <div 
                    key={item.id}
                    tabIndex={0}
                    onClick={() => {
                      // Clear any state before navigation
                      setIsPlaying(false);
                      navigate(`/video/${item.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="focusable focusable relative aspect-video rounded-lg overflow-hidden border border-zinc-900 cursor-pointer group shadow-sm bg-zinc-950"
                  >
                    <img
                      src={item.image || item.signedThumbnailUrl || "/assets/poster.png"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-bold text-white z-10">
                      <span className="truncate max-w-[80%]">{item.title}</span>
                      <span className="text-[8px] text-zinc-400 shrink-0 bg-black/60 px-1 py-0.25 rounded">
                        {item.year || item.releaseYear || "2020"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WEB VIEW (hidden md:block) */}
        <div className="hidden md:block px-12 lg:px-16 py-6 space-y-6 text-left   mx-auto pb-16">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold select-none">
            <span tabIndex={-1} className="focusable hover:text-white cursor-pointer" onClick={() => navigate("/")}>Home</span>
            <span>&gt;</span>
            <span tabIndex={-1} className="focusable hover:text-white cursor-pointer" onClick={() => navigate("/tv")}>Shows</span>
            <span>&gt;</span>
            <span tabIndex={-1} className="focusable hover:text-white cursor-pointer" onClick={() => navigate(`/video/${movie.id}`)}>{movie.title}</span>
            {movie.seasons && movie.seasons.length > 0 && (
              <>
                <span>&gt;</span>
                <span className="text-zinc-400">{movie.seasons[selectedSeason]?.label || `Season ${selectedSeason + 1}`}</span>
              </>
            )}
            {currentEpisode && (
              <>
                <span>&gt;</span>
                <span className="text-zinc-200">{currentEpisode.title}</span>
              </>
            )}
          </div>

          {/* Title inline with info & Actions */}
          <div className="flex justify-between items-center w-full pt-2">
            <div className="flex items-baseline gap-4">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight select-text uppercase">
                {movie.title}
              </h1>
              {movie.seasons && movie.seasons.length > 0 && (
                <span className="text-lg font-bold text-zinc-450 select-none">
                  S{selectedSeason + 1} E{currentEpisode?.episodeNumber || 1} &nbsp;&nbsp;&nbsp; {currentEpisode?.title || movie.seasons[selectedSeason]?.episodes?.[0]?.title || "The Watch Project"}
                </span>
              )}
            </div>

            {/* Actions on the right */}
            <div className="flex items-center gap-6">
              <button
                onClick={handleToggleMyList}
                disabled={isListToggling}
                className="focusable flex items-center gap-2 text-sm font-bold text-zinc-300 border border-2 border-primary/40 px-4 py-2 rounded-md hover:text-white transition-colors cursor-pointer select-none disabled:opacity-55"
              >
                {isInMyList ? <Check className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5 text-primary" />}
                <span>{isInMyList ? "In My List" : "Add to My List"}</span>
              </button>
              {/* 
              <button tabIndex={-1} className="focusable flex items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer select-none">
                <Share2 className="w-4 h-4 text-white" />
                <span>Share</span>
              </button> */}
            </div>
          </div>

          {/* Badges tag row */}
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-450 select-none">
            {reviewCount > 0 && averageRating !== null && (
              <span 
                tabIndex={0}
                onClick={() => setShowFeedbackModal(true)}
                className="focusable focusable text-secondary-foreground font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                title="Click to rate this title"
              >
                ⭐ {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            )}
            <span className="px-2 py-0.5 border border-zinc-700 bg-zinc-950 rounded uppercase text-[10px] text-zinc-350">{movie.rating}</span>
            <span>{movie.year}</span>
            <span>{currentEpisode?.duration || movie.duration || "57 min"}</span>
            <span>{movie.language || "Hindi"}</span>
          </div>
          {/* Description Block */}
          <div className="text-xs md:text-sm text-zinc-450 leading-relaxed font-normal pt-2 max-w-4xl">
            {showFullDescription ? (
              <div className="space-y-4 animate-fade-in select-text">
                {movie.description ? (
                  movie.description.split("\n").map((p: string, idx: number) => (
                    <p key={idx}>{p.trim()}</p>
                  ))
                ) : (
                  <p>No description available.</p>
                )}
                <button 
                  onClick={() => setShowFullDescription(false)}
                  className="focusable focusable text-primary font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors outline-none"
                >
                  See Less
                </button>
              </div>
            ) : (
              <div className="animate-fade-in">
                <p className="line-clamp-3 select-all leading-relaxed">{movie.description || "No description available."}</p>
                {movie.description && movie.description.length > 150 && (
                  <button 
                    onClick={() => setShowFullDescription(true)}
                    className="focusable focusable text-[#3B82F6] hover:text-[#2563EB] font-bold flex items-center gap-1 mt-1 cursor-pointer transition-colors outline-none"
                  >
                    See More <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
                  </button>
                )}
              </div>
            )}
          </div>


          {/* Details fields */}
          <div className="space-y-1 text-xs text-zinc-450 leading-relaxed max-w-4xl">
            <div>
              <span className="text-zinc-500 font-bold select-none">Genre:</span>{" "}
              <span className="text-zinc-300 select-text">{movie.genres?.join(", ") || (movie.category === "TV Show" ? "Biopic, Drama, Web Series" : "Action & Adventure, Drama")}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold select-none">Content Descriptor:</span>{" "}
              <span className="text-zinc-300 select-text">{movie.contentDescriptor || "tobacco depictions, alcohol use, foul language"}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold select-none">Director:</span>{" "}
              <span className="text-zinc-300 select-text">{movie.director || "Robbie Grewal"}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold select-none">Starring:</span>{" "}
              <span className="text-zinc-300 select-text">
                {movie.cast && movie.cast.length > 0
                  ? movie.cast.map((c: any) => c.name).join(", ")
                  : "Naseeruddin Shah, Jim Sarbh, Namita Dubey, Vaibhav Tatwawadi, Asif Ali Beg"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-bold select-none">Publisher:</span>{" "}
              <span className="text-zinc-300 select-text">{movie.publisher || "Almighty Motion Picture"}</span>
            </div>
          </div>


          {/* Seasons & Episodes Selector Header and List */}
          {movie.seasons && movie.seasons.length > 0 && (
            <div className="pt-6 space-y-4">

              {/* Selector Header Bar */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 select-none">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{movie.seasons[selectedSeason]?.label || `Season ${selectedSeason + 1}`}</span>
                  {movie.seasons.length > 1 && (
                    <button
                      onClick={handleViewAllEpisodes}
                      className="focusable text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer outline-none"
                    >
                      View All &gt;
                    </button>
                  )}
                </div>

                {/* Sort Option */}

              </div>

              {/* Horizontal Episodes Scroller */}
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                {(movie.seasons[selectedSeason]?.episodes || []).map((ep: any) => (
                  <div 
                    key={ep.id}
                    tabIndex={0}
                    onClick={() => playEpisode(ep, false)}
                    className="focusable focusable flex-none w-56 sm:w-64 space-y-2 cursor-pointer group outline-none"
                  >
                    {/* Header above card */}
                    <div className="bg-zinc-950 border border-zinc-900 px-3 py-2 rounded-t-md text-left transition-colors group-hover:bg-zinc-900/40">
                      <h4 className="text-xs font-bold text-white group-hover:text-primary truncate">
                        {ep.title}
                      </h4>
                    </div>

                    {/* Card Body */}
                    <div className="relative aspect-video rounded-b-md overflow-hidden bg-zinc-900 border-x border-b border-zinc-900">
                      <img
                        src={ep.image || movie.image || "/assets/poster.png"}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>

                      {/* Episode specific progress bar */}
                      {(() => {
                        const epProgress = getEpisodeProgress(ep.id);
                        if (epProgress) {
                          return (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-850">
                              <div
                                className="h-full bg-secondary-foreground"
                                style={{ width: `${(epProgress.currentTime / epProgress.duration) * 100}%` }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Cast & Crew Section */}
          {movie.cast && movie.cast.length > 0 && (
            <div className="pt-8 border-t border-zinc-900/60 text-left">
              <h3 className="text-lg font-bold text-white mb-4">Cast & Crew</h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {movie.cast.map((person: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:scale-105 transition-transform duration-200 shadow">
                      <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-450 text-center w-16 truncate">
                      {person.name}
                    </span>
                    {person.role && (
                      <span className="text-[8px] text-zinc-650 text-center w-16 truncate -mt-1 font-semibold">
                        {person.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related / More Like This Section */}
          {movie.related && movie.related.length > 0 && (
            <div className="pt-8 border-t border-zinc-900/60 text-left">
              <h3 className="text-lg font-bold text-white mb-4">More Like This</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6" style={{ overflow: 'visible' }}>
                {movie.related.map((item: any, index: number) => {
                  const isFirst = index === 0;
                  const isLast = index === movie.related.length - 1;
                  const detailedItem = getRelatedItemDetails(item);

                  return (
                    <div 
                      key={item.id}
                      className="relative group/card"
                      style={{ zIndex: 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                      onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
                    >
                      {/* Poster Card - always visible */}
                      <div
                        tabIndex={0}
                        className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                        onClick={() => {
                          setIsPlaying(false);
                          navigate(`/video/${item.id}`);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <img
                          src={item.image || "/assets/poster.png"}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Floating Popup - expands equally in all directions from center */}
                      <div
                        className={`absolute top-1/2 w-[340px] md:w-[380px] opacity-0 scale-90 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-visible z-50 ${
                          isFirst
                            ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                            : isLast
                            ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                            : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                        }`}
                      >
                        {/* Popup Container with shadow and border */}
                        <div className="relative rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50">
                          {/* Landscape Thumbnail - tall & prominent */}
                          <div className="w-full h-[180px] md:h-[200px] overflow-hidden relative">
                            <img
                              src={item.image || "/assets/poster.png"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                          </div>

                          {/* Details Panel */}
                          <div className="px-4 py-3 flex flex-col gap-2.5 text-left">
                            {/* Title */}
                            <p className="text-white font-bold text-[15px] leading-snug">{item.title}</p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsPlaying(false);
                                  navigate(`/video/${item.id}`);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                              >
                                <Play className="w-4 h-4 fill-current" /> Watch Now
                              </button>
                              <button
                                tabIndex={-1}
                                onClick={(e) => handleToggleRelatedMyList(e, item)}
                                disabled={isListToggling}
                                className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow disabled:opacity-55"
                              >
                                {myListIds.includes(item.id.toString()) ? (
                                  <Check className="w-4 h-4 text-[#DECB94]" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Metadata */}
                            <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                              <span className="text-white font-bold">{detailedItem.year}</span>
                              <span className="text-zinc-650">•</span>
                              <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-350">{detailedItem.ageRating}</span>
                              <span className="text-zinc-650">•</span>
                              <span>{detailedItem.seasons && detailedItem.seasons.length > 0 ? `${detailedItem.seasons.length} Seasons` : (detailedItem.duration || "N/A")}</span>
                              {detailedItem.language && <><span className="text-zinc-650">•</span><span>{detailedItem.language}</span></>}
                            </div>

                            {/* Description */}
                            <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                              {detailedItem.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    );
  }

  // Movie category rendering
  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0">

      {/* Netflix Fullscreen / Aspect box Video container */}
      <div
        className={(isPlaying && forceFullscreen) ? "fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in" : "relative w-full aspect-video md:h-[50vh] lg:h-[65vh] bg-black overflow-hidden group select-none border-b border-zinc-900"}
      >
        {isPlaying && videoUrlToPlay ? (
          <CustomVideoPlayer
            ref={playerRef}
            onPlayStateChange={setIsInternalPlaying}
            movie={movie}
            currentEpisode={currentEpisode}
            videoUrlToPlay={videoUrlToPlay}
            currentPlayingEpisodeTitle={currentPlayingEpisodeTitle}
            onExit={handleExitPlayer}
            playNextEpisode={playNextEpisode}
            userId={userId}
            playInline={!forceFullscreen}
            hasAlreadyRated={hasAlreadyRated}
            onFeedbackSubmitted={() => loadFeedbackStats(movie.id)}
            trailerUrl={movie.trailerUrl}
          />
        ) : (
          <>
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-[4]">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <img
              src={movie.image}
              alt={movie.title}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
              className={`w-full h-full object-cover animate-in fade-in duration-500 transition-opacity duration-300 ${isImageLoading ? "opacity-0" : "opacity-100"}`}
            />

            {/* Rich theatrical dark gradient fades */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-[2]" />
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-[2]" />

            {/* Desktop Branding & Action overlay (Hidden on Mobile) */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-[3] select-text">
              <div className="hidden md:flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <img src="/assets/headerLogo.png" alt="AVR" className="w-12 h-auto opacity-90" />
                <span className="text-xs  font-semibold  text-primary-foreground">Exclusive</span>
              </div>

              <h1 className="hidden md:block text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-md max-w-2xl text-left animate-in fade-in slide-in-from-left-4 duration-600">
                {movie.title}
              </h1>

              <div className="hidden md:flex items-center gap-4 mt-6 animate-in fade-in slide-in-from-left-4 duration-700">
                <Button
                  onClick={() => {
                    if (isPlaying) {
                      playerRef.current?.togglePlayPause();
                    } else {
                      handleStartPlayback(false);
                    }
                  }}
                  disabled={isSigning}
                  className="focusable bg-white hover:bg-white/95 text-black font-medium px-8 py-2 lg:py-2 rounded-md cursor-pointer flex items-center justify-center gap-2 text-base shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-55 outline-none"
                >
                  {isSigning ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isPlaying && isInternalPlaying ? (
                      <Pause className="w-5 h-5 fill-current text-black" />
                    ) : (
                      <Play className="w-5 h-5 fill-current text-black" />
                    )
                  )}
                  <span>
                    {isPlaying && isInternalPlaying
                      ? "Pause"
                      : (watchProgress
                        ? "Resume"
                        : (movie.category === "TV Show" ? "Play S1·E1" : "Play"))}
                  </span>
                </Button>



                <Button
                  onClick={handleToggleMyList}
                  disabled={isListToggling}
                  variant="outline"
                  className="focusable bg-zinc-800/40 hover:bg-zinc-700/60 border-zinc-650 text-white font-semibold px-6 py-2 lg:py-2 rounded-md cursor-pointer flex items-center justify-center gap-2 text-base transition-transform hover:scale-[1.02] disabled:opacity-55 outline-none"
                >
                  {isInMyList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{isInMyList ? "In My List" : "My List"}</span>
                </Button>
              </div>
            </div>

            {/* Play Button Overlay (Mobile Only, hidden on Web) */}
            <div className="md:hidden absolute inset-0 flex items-center justify-center z-[3]">
              <button 
                onClick={() => handleStartPlayback(false)}
                disabled={isSigning}
                className="focusable w-14 h-14 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors border-2 border-white/20 cursor-pointer disabled:opacity-55 shadow-lg active:scale-95"
              >
                {isSigning ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                )}
              </button>
            </div>
          </>
        )}

        {/* Floating Top Header Navigation */}
        {!isPlaying && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 z-20">
            <button 
              onClick={() => navigate(-1)}
              className="focusable focusable p-2 rounded-full bg-black/50 border border-zinc-900 text-white hover:bg-black/85 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center outline-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

          </div>
        )}

        {/* Progress helper, only shown when user has saved progress and NOT playing */}
        {!isPlaying && watchProgress && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 pb-3 z-10">
            <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-foreground rounded-full"
                style={{ width: `${(watchProgress.currentTime / watchProgress.duration) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {formatProgressTime(watchProgress.currentTime)} / {formatProgressTime(watchProgress.duration)}
            </span>
          </div>
        )}
      </div>

      {/* Grid Content wrapper */}
      <div className="px-4 md:px-12 lg:px-16  mx-auto pt-6 space-y-8 pb-16">

        {/* Main responsive splits: summary on left, detailed metadata/cast on right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">

          {/* Left Columns (Span 2): Summaries & Main descriptions */}
          <div className="md:col-span-2 space-y-6">

            {/* Mobile Title & Metadata Stack (Hidden on Web) */}
            <div className="md:hidden space-y-3">
              <h1 className="text-2xl font-bold text-white text-left">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
                {reviewCount > 0 && averageRating !== null && (
                  <span 
                    tabIndex={0}
                    onClick={() => setShowFeedbackModal(true)}
                    className="focusable focusable text-secondary-foreground font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                    title="Click to rate this title"
                  >
                    ⭐ {averageRating.toFixed(1)} ({reviewCount})
                  </span>
                )}
                <span className="text-green-500 font-semibold">{matchPercentage}% Match</span>
                <span>{movie.year}</span>
                <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-sm font-semibold uppercase">{movie.rating}</span>
                <span>{movie.duration}</span>
                <span className="px-1.5 py-0.25 border border-zinc-700 text-zinc-350 rounded text-[9px] font-bold">HDR</span>
              </div>
            </div>

            {/* Mobile action buttons (Hidden on Web) */}
            <div className="md:hidden flex items-center gap-3">
              <Button
                onClick={() => {
                  if (isPlaying) {
                    playerRef.current?.togglePlayPause();
                  } else {
                    handleStartPlayback(false);
                  }
                }}
                disabled={isSigning}
                className="flex-1 bg-primary hover:bg-primary/90 text-black font-semibold justify-center rounded-md cursor-pointer disabled:opacity-55"
              >
                {isSigning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  isPlaying && isInternalPlaying ? (
                    <Pause className="w-5 h-5 mr-2 fill-secondary text-secondary" />
                  ) : (
                    <Play className="w-5 h-5 mr-2 fill-secondary text-secondary" />
                  )
                )}
                {isPlaying && isInternalPlaying
                  ? "Pause"
                  : (watchProgress
                    ? "Resume"
                    : (movie.category === "TV Show" ? "Play S1·E1" : "Play"))}
              </Button>

              <Button
                onClick={handleToggleMyList}
                disabled={isListToggling}
                variant="outline"
                className="flex-1 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-850 hover:text-white font-semibold py-5 rounded-md cursor-pointer disabled:opacity-55"
              >
                {isInMyList ? <Check className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {isInMyList ? "In My List" : "My List"}
              </Button>
            </div>

            {/* Web Metadata info inline (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-3 text-sm font-semibold text-zinc-400">
              {reviewCount > 0 && averageRating !== null && (
                <span 
                  tabIndex={0}
                  onClick={() => setShowFeedbackModal(true)}
                  className="focusable focusable text-secondary-foreground font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                  title="Click to rate this title"
                >
                  ⭐ {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              )}
              <span className="text-green-500  text-base">{matchPercentage}% Match</span>
              <span>{movie.year}</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-xs font-bold uppercase">{movie.rating}</span>
              <span>{movie.duration}</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-[10px] font-bold text-zinc-350">HDR</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-[10px] font-bold text-zinc-350">{movie.quality}</span>
            </div>

            {/* Summary description paragraph */}
            <div className="space-y-2 text-left animate-in fade-in duration-200">
              <p className="text-zinc-350 text-xs md:text-sm leading-relaxed font-normal">
                {showFullDescription || (movie.description || "").length <= 150
                  ? (movie.description || "")
                  : `${(movie.description || "").slice(0, 150)}...`}
                {(movie.description || "").length > 150 && (
                  <button 
                    tabIndex={-1}
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="focusable text-primary font-semibold ml-1 hover:underline focus:outline-none cursor-pointer"
                  >
                    {showFullDescription ? " Less" : " More"}
                  </button>
                )}
              </p>
            </div>

          </div>

          {/* Right Column (Span 1): Cast & Genres Lists (Web Only) */}
          <div className="hidden md:flex flex-col gap-4 text-sm text-left border-l border-zinc-900 pl-8">
            <div>
              <span className="text-zinc-500 font-semibold">Cast: </span>
              <span className="text-zinc-300">
                {movie.cast && movie.cast.length > 0
                  ? movie.cast.map((c: any) => c.name).slice(0, 4).join(', ')
                  : "N/A"}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 font-semibold">Genres: </span>
              <span className="text-zinc-300">
                {movie.category === "TV Show" ? "TV Action & Adventure, Sci-Fi" : "Action & Adventure, Drama"}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 font-semibold">This title is: </span>
              <span className="text-zinc-300">Exciting, Suspenseful, Imaginative</span>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-zinc-900 my-4" />

        {/* Navigation Tabs (Episodes | More Like This | Details) */}
        <div className="space-y-6" id="episodes-tabs">
          <div className="flex items-center gap-8 border-b border-zinc-900 pb-3 text-sm md:text-base font-semibold text-zinc-400">
            {movie.category === "TV Show" && (
              <button 
                onClick={() => setActiveTab('episodes')}
                className={`focusable focusable relative pb-3 -mb-[14px] cursor-pointer transition-colors ${activeTab === 'episodes' ? "text-white border-b-2 border-primary" : "hover:text-white"
                  }`}
              >
                Episodes
              </button>
            )}
            <button 
              onClick={() => setActiveTab('related')}
              className={`focusable focusable relative pb-3 -mb-[14px] cursor-pointer transition-colors ${activeTab === 'related' ? "text-white border-b-2 border-primary" : "hover:text-white"
                }`}
            >
              More Like This
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`focusable focusable relative pb-3 -mb-[14px] cursor-pointer transition-colors ${activeTab === 'details' ? "text-white border-b-2 border-primary" : "hover:text-white"
                }`}
            >
              Details
            </button>
          </div>

          {/* Tab Panel contents */}
          <div className="pt-2 animate-in fade-in duration-200">

            {/* Episodes Panel */}
            {activeTab === 'episodes' && movie.category === "TV Show" && movie.seasons && movie.seasons.length > 0 && (
              <div className="space-y-6">
                {/* Season select dropdown box */}
                <div className="flex justify-start">
                  <button className="focusable flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md hover:text-white transition-all cursor-pointer">
                    <span>{movie.seasons[0].label}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Episodes listing vertically */}
                <div className="space-y-4 max-w-4xl" id="episodes-section">
                  {movie.seasons[0].episodes.map((ep: any, index: number) => (
                    <div 
                      key={ep.id}
                      tabIndex={0}
                      onClick={() => playEpisode(ep)}
                      className="focusable focusable grid grid-cols-12 gap-4 border-b border-zinc-900/60 pb-4 pt-2 hover:bg-zinc-900/40 rounded-lg p-2 transition-all cursor-pointer group"
                    >
                      {/* Left: Thumbnail aspect card */}
                      <div className="col-span-4 md:col-span-3 aspect-video relative rounded-md overflow-hidden bg-zinc-900 shadow-md">
                        <img src={ep.image} alt={ep.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white scale-90 group-hover:scale-100 transition-transform duration-300" />
                        </div>

                        {/* Episode specific progress bar */}
                        {(() => {
                          const epProgress = getEpisodeProgress(ep.id);
                          if (epProgress) {
                            return (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-850">
                                <div
                                  className="h-full bg-secondary-foreground"
                                  style={{ width: `${(epProgress.currentTime / epProgress.duration) * 100}%` }}
                                />
                              </div>
                            );
                          }
                          return (
                            <span className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-350">
                              {ep.duration}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Right: Info and description details */}
                      <div className="col-span-8 md:col-span-9 flex flex-col justify-center text-left gap-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm md:text-base font-bold text-white group-hover:text-primary-foreground transition-colors">
                            {index + 1}. {ep.title}
                          </h4>
                          <span className="hidden md:inline text-xs font-semibold text-zinc-500">{ep.duration}</span>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-400 leading-relaxed line-clamp-2 md:line-clamp-3">
                          {ep.description || "Suspended while pursuing a cold trail, the search uncovers shocking betrayals and triggers a complex race against the clock."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related/More Like This Panel */}
            {activeTab === 'related' && movie.related && movie.related.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-7 lg:h-[80%] gap-4 md:gap-6" style={{ overflow: 'visible' }}>
                {movie.related.map((item: any, index: number) => {
                  const isFirst = index === 0;
                  const isLast = index === movie.related.length - 1;
                  const detailedItem = getRelatedItemDetails(item);

                  return (
                    <div 
                      key={item.id}
                      className="relative group/card"
                      style={{ zIndex: 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                      onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
                    >
                      {/* Poster Card - always visible */}
                      <div
                        tabIndex={0}
                        className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                        onClick={() => {
                          setIsPlaying(false);
                          navigate(`/video/${item.id}`);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <img
                          src={item.image || "/assets/poster.png"}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Floating Popup - expands equally in all directions from center */}
                      <div
                        className={`absolute top-1/2 w-[340px] md:w-[380px] opacity-0 scale-90 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-visible z-50 ${
                          isFirst
                            ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                            : isLast
                            ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                            : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                        }`}
                      >
                        {/* Popup Container with shadow and border */}
                        <div className="relative rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50">
                          {/* Landscape Thumbnail - tall & prominent */}
                          <div className="w-full h-[180px] md:h-[200px] overflow-hidden relative">
                            <img
                              src={item.image || "/assets/poster.png"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                          </div>

                          {/* Details Panel */}
                          <div className="px-4 py-3 flex flex-col gap-2.5 text-left">
                            {/* Title */}
                            <p className="text-white font-bold text-[15px] leading-snug">{item.title}</p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsPlaying(false);
                                  navigate(`/video/${item.id}`);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                              >
                                <Play className="w-4 h-4 fill-current" /> Watch Now
                              </button>
                              <button
                                tabIndex={-1}
                                onClick={(e) => handleToggleRelatedMyList(e, item)}
                                disabled={isListToggling}
                                className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow disabled:opacity-55"
                              >
                                {myListIds.includes(item.id.toString()) ? (
                                  <Check className="w-4 h-4 text-[#DECB94]" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Metadata */}
                            <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                              <span className="text-white font-bold">{detailedItem.year}</span>
                              <span className="text-zinc-650">•</span>
                              <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-350">{detailedItem.ageRating}</span>
                              <span className="text-zinc-650">•</span>
                              <span>{detailedItem.seasons && detailedItem.seasons.length > 0 ? `${detailedItem.seasons.length} Seasons` : (detailedItem.duration || "N/A")}</span>
                              {detailedItem.language && <><span className="text-zinc-650">•</span><span>{detailedItem.language}</span></>}
                            </div>

                            {/* Description */}
                            <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                              {detailedItem.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cast & Metadata Details Panel */}
            {activeTab === 'details' && (
              <div className="space-y-6 text-left animate-in fade-in duration-200">
                {movie.cast && movie.cast.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-zinc-400">Cast Members</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                      {movie.cast.map((person: any, idx: number) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800/80 hover:scale-105 transition-transform duration-200 shadow">
                            <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-450 text-center w-16 truncate">
                            {person.name}
                          </span>
                          {person.role && (
                            <span className="text-[8px] text-zinc-650 text-center w-16 truncate -mt-1 font-semibold">
                              {person.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-550 text-sm">No cast metadata available.</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-zinc-900/60 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <span className="text-zinc-550 font-bold block">Genres</span>
                    <span className="text-zinc-300 font-semibold">{movie.category === "TV Show" ? "TV Action & Adventure, Sci-Fi & Fantasy, Crime Shows" : "Action & Adventure, Crime Thrillers, Dramas"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-550 font-bold block">Maturity Rating</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-350 font-bold px-2 py-0.5 border border-zinc-700 bg-zinc-950 rounded uppercase text-[10px]">{movie.rating}</span>
                      <span className="text-amber-500 font-semibold text-xs">
                        Recommended for ages {movie.rating.includes('18') || movie.rating.includes('A') ? '18' : '13'} and up
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmitSuccess={() => {
          setShowFeedbackModal(false);
          loadFeedbackStats(movie.id);
        }}
        movieId={movie.id}
        movieTitle={movie.title}
        userId={userId}
      />
    </div>
  );
};

export default VideoDetails;