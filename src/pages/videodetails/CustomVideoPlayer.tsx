import React, { useState, useEffect, useRef } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import {
  Play, Pause, ChevronLeft, Cast, Volume2, VolumeX, Maximize, Minimize,
  Settings, ChevronsLeft, ChevronsRight, Heart, Sun, X, Check,
  WifiOff, MessageSquare, ListVideo, Crown, Subtitles, AlertCircle
} from 'lucide-react';
import { createDocument, deleteDocument, getDocumentData, addDocument } from '@/Firebase';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { FeedbackModal } from './FeedbackModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isTvPlatform } from '@/lib/tvUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CustomVideoPlayerProps {
  movie: any;
  currentEpisode: any;
  videoUrlToPlay: string;
  currentPlayingEpisodeTitle: string;
  onExit: () => void;
  playNextEpisode: () => void;
  userId: string;
  playInline?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  hasAlreadyRated?: boolean;
  onFeedbackSubmitted?: () => void;
  trailerUrl?: string;
}

const parseResolutionToHeight = (res: string): number => {
  if (!res) return 1080;
  const cleaned = res.toLowerCase().replace(/\s+/g, "");
  if (cleaned.includes("4k") || cleaned.includes("2160p")) return 2160;
  if (cleaned.includes("1080p")) return 1080;
  if (cleaned.includes("720p")) return 720;
  if (cleaned.includes("480p")) return 480;
  if (cleaned.includes("360p")) return 360;
  return 1080;
};

export interface CustomVideoPlayerRef {
  togglePlayPause: () => void;
}

export const CustomVideoPlayer = React.forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(({
  movie,
  currentEpisode,
  videoUrlToPlay,
  currentPlayingEpisodeTitle,
  onExit,
  playNextEpisode,
  userId,
  playInline = false,
  onPlayStateChange,
  hasAlreadyRated = false,
  onFeedbackSubmitted,
  trailerUrl
}, ref) => {
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const navigate = useNavigate();

  // User Feedback States
  const [showFeedbackOverlay, setShowFeedbackOverlay] = useState(false);

  // Trailer sequential playback states
  const [currentSourceUrl, setCurrentSourceUrl] = useState<string>("");
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);

  // Sync trailer state when props change
  useEffect(() => {
    if (trailerUrl && trailerUrl !== videoUrlToPlay) {
      setCurrentSourceUrl(trailerUrl);
      setIsPlayingTrailer(true);
    } else {
      setCurrentSourceUrl(videoUrlToPlay);
      setIsPlayingTrailer(false);
    }
  }, [videoUrlToPlay, trailerUrl]);

  React.useImperativeHandle(ref, () => ({
    togglePlayPause: () => togglePlayPause()
  }));

  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isCurrentlyPlaying);
    }
  }, [isCurrentlyPlaying, onPlayStateChange]);
  const user = useAppSelector((state) => state.auth.user);
  const hasActiveMembership = user?.membershipStatus === "active";
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [qualities, setQualities] = useState<{ id: number; name: string; height: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [maxResolutionHeight, setMaxResolutionHeight] = useState<number>(2160);

  useEffect(() => {
    if (!user?.membershipPlanId) {
      setMaxResolutionHeight(2160);
      return;
    }
    const fetchPlanResolution = async () => {
      try {
        const plan = await getDocumentData("plans", user.membershipPlanId as string);
        if (plan && plan.resolution) {
          setMaxResolutionHeight(parseResolutionToHeight(plan.resolution));
        }
      } catch (err) {
        console.error("Error fetching plan resolution:", err);
      }
    };
    fetchPlanResolution();
  }, [user?.membershipPlanId]);

  // Custom Settings overlay states
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showReportSection, setShowReportSection] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'quality' | 'audio' | 'speed' | 'subtitles'>('quality');
  const [brightness, setBrightness] = useState<number>(100);
  const [audioLanguage, setAudioLanguage] = useState<string>("English [Original]");
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>("Off");
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1); // -1 = Off
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isRated, setIsRated] = useState<boolean>(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);

  // Next Episode Countdown states
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  // Persists the height (e.g. 720) the user last manually selected so it can be
  // re-applied when switching from trailer → main content.
  const preferredQualityHeight = useRef<number | null>(null);

  const saveCurrentProgress = async (time: number) => {
    if (!movie || isPlayingTrailer) return;
    const currentDur = videoRef.current?.duration || duration;
    if (!currentDur) return;

    const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
    const isCompleted = (time / currentDur) > 0.95;

    if (userId) {
      try {
        const docId = `${userId}_${progressKey}`;
        if (isCompleted) {
          await deleteDocument("watch_progress", docId);
          if (currentEpisode) {
            await deleteDocument("watch_progress", `${userId}_${movie.id}`);
          }
        } else {
          const payload: any = {
            userId,
            movieId: movie.id,
            currentTime: time,
            duration: currentDur,
            updatedAt: serverTimestamp()
          };
          if (currentEpisode) {
            payload.episodeId = currentEpisode.id;
          }
          await createDocument("watch_progress", docId, payload);

          if (currentEpisode) {
            // Also update the main summary pointer for the TV show
            await createDocument("watch_progress", `${userId}_${movie.id}`, payload);
          }
        }
      } catch (err) {
        console.error("Error updating watch progress in DB:", err);
      }
    } else {
      // LocalStorage fallback
      try {
        const progressDataStr = localStorage.getItem('avr_watch_progress') || '{}';
        const progressData = JSON.parse(progressDataStr);

        if (isCompleted) {
          delete progressData[progressKey];
          if (currentEpisode) {
            const mainProgress = progressData[movie.id];
            if (mainProgress && mainProgress.episodeId === currentEpisode.id) {
              delete progressData[movie.id];
            }
          }
        } else {
          progressData[progressKey] = {
            currentTime: time,
            duration: currentDur,
            updatedAt: Date.now()
          };

          if (currentEpisode) {
            progressData[movie.id] = {
              currentTime: time,
              duration: currentDur,
              episodeId: currentEpisode.id,
              updatedAt: Date.now()
            };
          }
        }

        localStorage.setItem('avr_watch_progress', JSON.stringify(progressData));
      } catch (err) {
        console.error("Error saving progress to localStorage:", err);
      }
    }
  };

  // Save progress on unmount or when changing episode
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        saveCurrentProgress(videoRef.current.currentTime);
      }
    };
  }, [movie, currentEpisode]);

  // Sync fullscreen state from native listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      // When entering fullscreen, try locking to landscape again to assist the browser orientation manager
      if (inFullscreen) {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => { });
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle mobile landscape orientation lock & rotation fallback
  useEffect(() => {
    const handleOrientationCheck = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    // Initial check
    handleOrientationCheck();

    window.addEventListener("resize", handleOrientationCheck);
    window.addEventListener("orientationchange", handleOrientationCheck);

    // Attempt native screen orientation lock
    const lockScreen = async () => {
      if (playInline) return; // Do not lock orientation if playing inline
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (err) {
        console.log("Native screen orientation lock failed or unsupported:", err);
      }
    };
    lockScreen();

    return () => {
      window.removeEventListener("resize", handleOrientationCheck);
      window.removeEventListener("orientationchange", handleOrientationCheck);

      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (err) {
        console.log("Native screen orientation unlock failed:", err);
      }
    };
  }, [playInline]);

  // Next Episode Countdown effect
  useEffect(() => {
    if (nextEpisodeCountdown === null) return;
    if (nextEpisodeCountdown === 0) {
      playNextEpisode();
      setNextEpisodeCountdown(null);
      return;
    }

    countdownIntervalRef.current = setTimeout(() => {
      setNextEpisodeCountdown(nextEpisodeCountdown - 1);
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [nextEpisodeCountdown]);

  // Load HLS.js script dynamically and bind to the video element
  useEffect(() => {
    if (!hasActiveMembership) {
      setIsVideoLoading(false);
      return;
    }
    if (!currentSourceUrl || !videoRef.current) return;
    setIsVideoLoading(true);
    const video = videoRef.current;
    let hlsInstance: any = null;

    const initPlayer = async () => {
      let startFromTime = 0;

      if (!isPlayingTrailer) {
        if (userId) {
          try {
            const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
            const savedDoc = await getDocumentData("watch_progress", `${userId}_${progressKey}`);
            if (savedDoc && savedDoc.currentTime > 0) {
              startFromTime = savedDoc.currentTime;
            }
          } catch (err) {
            console.error("Error reading saved progress from DB:", err);
          }
        } else {
          try {
            const progressDataStr = localStorage.getItem('avr_watch_progress');
            if (progressDataStr) {
              const progressData = JSON.parse(progressDataStr);
              const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
              const saved = progressData[progressKey];
              if (saved && saved.currentTime > 0) {
                startFromTime = saved.currentTime;
              }
            }
          } catch (err) {
            console.error("Error reading saved progress:", err);
          }
        }
      }

      const HlsClass = (window as any).Hls;
      if (currentSourceUrl.includes(".m3u8") && HlsClass && HlsClass.isSupported()) {
        hlsInstance = new HlsClass();
        hlsInstance.loadSource(currentSourceUrl);
        hlsInstance.attachMedia(video);
        hlsRef.current = hlsInstance;

        // Listen for Hls subtitle tracks updating
        hlsInstance.on(HlsClass.Events.SUBTITLE_TRACKS_UPDATED, (_event: any, data: any) => {
          const dbCaptions = movie?.caption || currentEpisode?.caption || movie?.subtitles || currentEpisode?.subtitles || [];
          if (dbCaptions.length > 0) return;
          if (data && data.subtitleTracks) {
            const tracks = data.subtitleTracks.map((t: any) => ({
              id: t.id,
              name: t.name || t.lang || `Track ${t.id}`,
              lang: t.lang || ""
            }));
            setSubtitleTracks(tracks);
          }
        });

        // Sync local subtitle track selection state
        hlsInstance.on(HlsClass.Events.SUBTITLE_TRACK_SWITCH, (_event: any, data: any) => {
          if (data) {
            setCurrentSubtitleTrack(data.id);
            if (data.id === -1) {
              setSubtitleLanguage("Off");
            } else {
              const activeTrack = hlsInstance.subtitleTracks[data.id];
              setSubtitleLanguage(activeTrack ? (activeTrack.name || activeTrack.lang || "On") : "On");
            }
          }
        });

        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
          // Standard quality series — only show options the stream can actually provide
          const STANDARD_HEIGHTS = [1080, 720, 480, 360, 240, 144];
          const actualLevels: { idx: number; height: number }[] = hlsInstance.levels.map((level: any, idx: number) => ({ idx, height: level.height }));

          // The highest resolution the stream actually has
          const actualMaxHeight = actualLevels.reduce((max, l) => Math.max(max, l.height), 0);

          // Map each standard height to the closest real HLS level index
          const findClosestLevel = (targetHeight: number) => {
            if (actualLevels.length === 0) return -1;
            return actualLevels.reduce((best, cur) => {
              return Math.abs(cur.height - targetHeight) < Math.abs(best.height - targetHeight) ? cur : best;
            }, actualLevels[0]).idx;
          };

          // Only keep standard heights that the stream can actually serve (cap at actualMaxHeight)
          const filteredHeights = STANDARD_HEIGHTS.filter((h) => h <= actualMaxHeight);

          const standardQualities = filteredHeights.map((h) => ({
            id: findClosestLevel(h),
            height: h,
            name: `${h}p`
          }));

          setQualities([{ id: -1, name: "Auto", height: 0 }, ...standardQualities]);
          setCurrentQuality(hlsInstance.currentLevel);


          // Cap the auto selection level of Hls.js to user's plan limit
          // Trailers are always free — skip the cap when playing trailer
          const effectiveMaxHeight = isPlayingTrailer ? 2160 : maxResolutionHeight;
          let maxAllowedIdx = -1;
          let maxAllowedHeight = 0;
          hlsInstance.levels.forEach((level: any, idx: number) => {
            if (level.height <= effectiveMaxHeight && level.height > maxAllowedHeight) {
              maxAllowedHeight = level.height;
              maxAllowedIdx = idx;
            }
          });
          if (maxAllowedIdx === -1 && hlsInstance.levels.length > 0) {
            let minHeight = Infinity;
            hlsInstance.levels.forEach((level: any, idx: number) => {
              if (level.height < minHeight) {
                minHeight = level.height;
                maxAllowedIdx = idx;
              }
            });
          }
          if (maxAllowedIdx !== -1) {
            hlsInstance.maxAutoLevel = maxAllowedIdx;
          }

          // If user chose a quality during trailer playback, restore it now for main content
          if (!isPlayingTrailer && preferredQualityHeight.current !== null) {
            const prefHeight = preferredQualityHeight.current;
            // Only restore if it's within the plan limit
            if (prefHeight <= effectiveMaxHeight) {
              // Find the best matching HLS level for the preferred height
              let bestIdx = -1;
              let bestDiff = Infinity;
              hlsInstance.levels.forEach((level: any, idx: number) => {
                const diff = Math.abs(level.height - prefHeight);
                if (diff < bestDiff) {
                  bestDiff = diff;
                  bestIdx = idx;
                }
              });
              if (bestIdx !== -1) {
                hlsInstance.currentLevel = bestIdx;
                setCurrentQuality(bestIdx);
              }
            }
            // Clear so it doesn't persist beyond first apply
            preferredQualityHeight.current = null;
          }

          // Apply current playback speed
          video.playbackRate = playbackSpeed;

          if (startFromTime > 0) {
            video.currentTime = startFromTime;
            lastSavedTimeRef.current = startFromTime;
          }

          video.play()
            .then(() => setIsCurrentlyPlaying(true))
            .catch(e => console.log("Play error:", e));
        });
      } else {
        video.src = currentSourceUrl;
        video.playbackRate = playbackSpeed;

        const onCanPlay = () => {
          if (startFromTime > 0) {
            video.currentTime = startFromTime;
            lastSavedTimeRef.current = startFromTime;
          }
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);

        video.play()
          .then(() => setIsCurrentlyPlaying(true))
          .catch(e => console.log("Play error:", e));
      }
    };

    if (currentSourceUrl.includes(".m3u8") && !(window as any).Hls) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
      script.async = true;
      script.onload = initPlayer;
      document.body.appendChild(script);
      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsRef.current = null;
        }
        try {
          document.body.removeChild(script);
        } catch (_) { }
      };
    } else {
      initPlayer();
      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsRef.current = null;
        }
      };
    }
  }, [currentSourceUrl, hasActiveMembership, isPlayingTrailer]);

  // Handle controls auto-hide
  const triggerControlsShow = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!showSettingsOverlay) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isCurrentlyPlaying && !showSettingsOverlay) {
          setShowControls(false);
        }
      }, 3500);
    }
  };

  useEffect(() => {
    if (showSettingsOverlay) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      triggerControlsShow();
    }
  }, [showSettingsOverlay]);

  useEffect(() => {
    if (!showSettingsOverlay) {
      setShowReportSection(false);
    }
  }, [showSettingsOverlay]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Handle video errors
    const handleVideoError = (e: any) => {
      const error = videoRef.current?.error;
      if (error?.code === 4) {
        // MEDIA_ERR_SRC_NOT_SUPPORTED - Try direct playback
        console.warn("Retrying video playback with direct URL...", currentSourceUrl);
      } else if (error?.code === 3) {
        // MEDIA_ERR_DECODE
        console.error("Video decode error. Check video format and URL.");
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener("error", handleVideoError);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (videoRef.current) {
        videoRef.current.removeEventListener("error", handleVideoError);
      }
    };
  }, []);

  // TV Remote controls handler (D-pad left/right for seeking, enter for play/pause, up/down to toggle controls, back/esc to exit)
  useEffect(() => {
    if (!isTvPlatform()) return;

    const handleTVPlayerKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA");

      if (isInputActive) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
          }
          triggerControlsShow();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
          }
          triggerControlsShow();
          break;
        case "Enter":
          e.preventDefault();
          if (videoRef.current) {
            if (isCurrentlyPlaying) {
              videoRef.current.pause();
              setIsCurrentlyPlaying(false);
              saveCurrentProgress(videoRef.current.currentTime);
            } else {
              videoRef.current.play()
                .then(() => setIsCurrentlyPlaying(true))
                .catch(err => console.log("TV Enter play failed:", err));
            }
          }
          triggerControlsShow();
          break;
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          setShowControls((prev) => !prev);
          break;
        case "Escape":
        case "Backspace":
          e.preventDefault();
          onExit();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleTVPlayerKeys);
    return () => {
      window.removeEventListener("keydown", handleTVPlayerKeys);
    };
  }, [isCurrentlyPlaying, duration, onExit]);

  // Global keyboard shortcuts for volume and brightness (non-TV platforms)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(prev + 0.05, 1);
            if (videoRef.current) videoRef.current.volume = newVol;
            setIsMuted(newVol === 0);
            return newVol;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(prev - 0.05, 0);
            if (videoRef.current) videoRef.current.volume = newVol;
            setIsMuted(newVol === 0);
            return newVol;
          });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setBrightness(prev => Math.min(prev + 5, 100));
          break;
        case '-':
          e.preventDefault();
          setBrightness(prev => Math.max(prev - 5, 10));
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isCurrentlyPlaying) {
        videoRef.current.pause();
        setIsCurrentlyPlaying(false);
        saveCurrentProgress(videoRef.current.currentTime);
      } else {
        videoRef.current.play()
          .then(() => setIsCurrentlyPlaying(true))
          .catch(e => console.log("Play failed:", e));
      }
    }
    triggerControlsShow();
  };

  const skipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
    triggerControlsShow();
  };

  const skipBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
    triggerControlsShow();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Save progress to localStorage every 5 seconds
      if (Math.abs(time - lastSavedTimeRef.current) >= 5) {
        saveCurrentProgress(time);
        lastSavedTimeRef.current = time;
      }
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    triggerControlsShow();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
    triggerControlsShow();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
    triggerControlsShow();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
            if (screen.orientation && (screen.orientation as any).lock) {
              (screen.orientation as any).lock('landscape').catch(() => { });
            }
          })
          .catch(err => console.log("Request fullscreen error:", err));
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            setIsFullscreen(false);
            if (playInline && screen.orientation && screen.orientation.unlock) {
              screen.orientation.unlock();
            }
          })
          .catch(err => console.log("Exit fullscreen error:", err));
      }
    }
    triggerControlsShow();
  };

  const handleQualityChange = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);

      if (qualityId === -1) {
        // Auto selected — clear preference and re-enforce the plan's resolution cap
        preferredQualityHeight.current = null;

        // Re-compute maxAutoLevel so Auto never exceeds the plan limit
        const effectiveMax = isPlayingTrailer ? 2160 : maxResolutionHeight;
        let maxAllowedIdx = -1;
        let maxAllowedHeight = 0;
        (hlsRef.current.levels as any[]).forEach((level: any, idx: number) => {
          if (level.height <= effectiveMax && level.height > maxAllowedHeight) {
            maxAllowedHeight = level.height;
            maxAllowedIdx = idx;
          }
        });
        // Fallback to lowest level if none fit
        if (maxAllowedIdx === -1 && hlsRef.current.levels.length > 0) {
          let minH = Infinity;
          (hlsRef.current.levels as any[]).forEach((level: any, idx: number) => {
            if (level.height < minH) { minH = level.height; maxAllowedIdx = idx; }
          });
        }
        if (maxAllowedIdx !== -1) {
          hlsRef.current.maxAutoLevel = maxAllowedIdx;
        }
      } else {
        // Manual level — persist height for trailer→main content carry-over
        const chosenLevel = hlsRef.current.levels?.[qualityId];
        if (chosenLevel && chosenLevel.height) {
          preferredQualityHeight.current = chosenLevel.height;
        }
      }
    }
  };


  const handleSpeedChange = (speedVal: number) => {
    setPlaybackSpeed(speedVal);
    if (videoRef.current) {
      videoRef.current.playbackRate = speedVal;
    }
  };

  const handleSubtitleChange = (trackId: number) => {
    setCurrentSubtitleTrack(trackId);

    // For Hls.js
    if (hlsRef.current && hlsRef.current.subtitleTracks && hlsRef.current.subtitleTracks.length > 0) {
      hlsRef.current.subtitleTrack = trackId;
    }

    // For Native HTML5 TextTracks (e.g. mp4 with <track> tags)
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        if (i === trackId) {
          tracks[i].mode = "showing";
          setSubtitleLanguage(tracks[i].label || tracks[i].language || "On");
        } else {
          tracks[i].mode = "disabled";
        }
      }
      if (trackId === -1) {
        setSubtitleLanguage("Off");
      }
    }
  };

  const handleReportIssue = async (issueType: string) => {
    if (!userId) {
      toast.error("You must be logged in to report an issue.");
      return;
    }
    try {
      const payload = {
        userId,
        movieId: movie?.id || "",
        movieTitle: movie?.title || "",
        episodeId: currentEpisode?.id || null,
        episodeTitle: currentPlayingEpisodeTitle || null,
        issueType,
        timestamp: serverTimestamp(),
      };
      await addDocument("reports", payload);
      toast.success("Thank you! Your report has been submitted.");
      setShowSettingsOverlay(false);
      setShowReportSection(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    }
  };

  const toggleCC = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (subtitleTracks.length === 0) {
      toast.info("No captions available for this video");
      return;
    }
    setShowSettingsOverlay(true);
    setActiveSettingTab('subtitles');
  };

  // Sync Native HTML5 text tracks (if dynamically added or parsed from standard mp4 container)
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const syncTextTracks = () => {
      const dbCaptions = movie?.caption || currentEpisode?.caption || movie?.subtitles || currentEpisode?.subtitles || [];
      if (dbCaptions.length > 0) return;
      const tracksList = Array.from(video.textTracks);
      if (tracksList.length > 0 && subtitleTracks.length === 0) {
        const mapped = tracksList.map((track: any, idx: number) => ({
          id: idx,
          name: track.label || track.language || `Track ${idx}`,
          lang: track.language || ""
        }));
        setSubtitleTracks(mapped);
      }
    };

    video.addEventListener("loadstart", syncTextTracks);
    if (video.textTracks) {
      video.textTracks.addEventListener("addtrack", syncTextTracks);
    }
    return () => {
      video.removeEventListener("loadstart", syncTextTracks);
      if (video.textTracks) {
        video.textTracks.removeEventListener("addtrack", syncTextTracks);
      }
    };
  }, [subtitleTracks.length, movie, currentEpisode]);

  // Hydrate subtitle tracks list dynamically from Firebase media collection database metadata
  useEffect(() => {
    const dbCaptions = movie?.caption || currentEpisode?.caption || movie?.subtitles || currentEpisode?.subtitles || [];
    if (dbCaptions.length > 0) {
      const tracks = dbCaptions.map((sub: any, idx: number) => ({
        id: idx,
        name: sub.language || sub.label || sub.name || `Track ${idx}`,
        lang: sub.language || sub.lang || ""
      }));
      setSubtitleTracks(tracks);
    }
  }, [movie, currentEpisode]);

  const handleEnded = () => {
    if (isPlayingTrailer) {
      setIsPlayingTrailer(false);
      setCurrentSourceUrl(videoUrlToPlay);
      return;
    }

    // Check if it's a show and there is a next episode
    if ((movie.category === "TV Show" || movie.category === "Documentary") && currentEpisode) {
      const currentEpNum = currentEpisode.episodeNumber;
      const nextEp = movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpNum + 1);
      if (nextEp) {
        setNextEpisodeCountdown(5);
        return;
      }
    }

    // If not already rated, trigger feedback overlay
    if (!hasAlreadyRated) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsCurrentlyPlaying(false);
      setShowFeedbackOverlay(true);
      setShowControls(false);
    } else {
      onExit();
    }
  };



  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center bg-black select-none"
      onMouseMove={triggerControlsShow}
      onTouchStart={triggerControlsShow}
    >
      <div
        className="w-full h-full relative flex items-center justify-center bg-black"
        style={(isMobilePortrait && (isFullscreen || !playInline)) ? {
          width: '100vh',
          height: '100vw',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          zIndex: 9999
        } : undefined}
      >
        {!hasActiveMembership ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-4 z-50">
            <div className={`max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 ${playInline ? "p-4 space-y-3" : "p-8 space-y-6"
              }`}>
              <div className="flex justify-center">
                <div className={`rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/25 ${playInline ? "w-10 h-10" : "w-16 h-16"
                  }`}>
                  <Crown className={`text-yellow-500 animate-pulse ${playInline ? "w-5 h-5" : "w-8 h-8"
                    }`} />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className={`font-bold text-white tracking-tight text-center ${playInline ? "text-sm md:text-base" : "text-xl"
                  }`}>Premium Membership Required</h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-sm mx-auto text-center">
                  Streaming of <span className="text-white font-semibold">{movie?.title || "exclusive content"}</span> requires an active premium membership.
                </p>
              </div>

              <div className={`flex w-full justify-center gap-3 pt-1 ${playInline ? "flex-row max-w-xs mx-auto" : "flex-col"
                }`}>
                <button
                  onClick={() => navigate('/membership')}
                  className={`focusable bg-yellow-500 hover:bg-yellow-450 text-black font-bold rounded-lg transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${playInline ? "flex-1 py-1.5 text-[11px] md:text-xs" : "w-full py-3 text-sm"
                    }`}
                >
                  <Crown className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>Get Premium</span>
                </button>

                <button
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(() => { });
                    }
                    onExit();
                  }}
                  className={`focusable bg-zinc-800 hover:bg-zinc-750 text-white font-semibold rounded-lg transition-all active:scale-[0.98] cursor-pointer text-center ${playInline ? "flex-1 py-1.5 text-[11px] md:text-xs" : "w-full py-3 text-sm"
                    }`}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              tabIndex={-1}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlayPause}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onEnded={handleEnded}
              onWaiting={() => setIsVideoLoading(true)}
              onPlaying={() => setIsVideoLoading(false)}
              onSeeking={() => setIsVideoLoading(true)}
              onSeeked={() => setIsVideoLoading(false)}
              onCanPlay={() => setIsVideoLoading(false)}
              onLoadedData={() => setIsVideoLoading(false)}
              crossOrigin="anonymous"
              playsInline
            >
              {((movie?.caption || currentEpisode?.caption || movie?.subtitles || currentEpisode?.subtitles || []) as any[]).map((sub: any, idx: number) => (
                <track
                  key={idx}
                  src={sub.caption_file || sub.src}
                  label={sub.language || sub.label || sub.name}
                  srcLang={sub.language?.substring(0, 2).toLowerCase() || sub.lang || "en"}
                  kind="subtitles"
                />
              ))}
            </video>

            {/* Loading Spinner Overlay */}
            {isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 pointer-events-none">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {/* Skip Trailer Button */}
            {isPlayingTrailer && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlayingTrailer(false);
                  setCurrentSourceUrl(videoUrlToPlay);
                }}
                className="focusable absolute bottom-12 right-6 md:bottom-24 md:right-8 z-30 bg-transparent hover:bg-transparent border-none p-0 text-white font-semibold shadow-none text-sm md:bg-zinc-950/90 md:hover:bg-zinc-950/90 md:border md:border-zinc-700 md:hover:border-zinc-500 md:px-3 md:py-3 md:rounded-lg md:shadow-2xl transition-all active:scale-[0.98] cursor-pointer flex items-center md:gap-2 outline-none"
              >
                <span>Skip</span>
                {/* <ChevronsRight className="w-4 h-4" /> */}
              </Button>
            )}



            {/* Simulated Brightness Overlay */}
            <div
              className="absolute inset-0 bg-black pointer-events-none z-[5]"
              style={{ opacity: ((100 - brightness) / 100) * 0.75 }}
            />

            {/* Netflix styled Next Episode countdown popup */}
            {nextEpisodeCountdown !== null && (
              <div className="absolute bottom-24 right-6 bg-zinc-950/95 border border-zinc-850 p-4 rounded-lg shadow-2xl flex flex-col gap-3 z-30 max-w-xs animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Next Episode</span>
                    <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                      {movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpisode?.episodeNumber + 1)?.title || "Upcoming Ep"}
                    </h4>
                  </div>
                  <button
                    onClick={() => setNextEpisodeCountdown(null)}
                    className="focusable text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={() => {
                    playNextEpisode();
                    setNextEpisodeCountdown(null);
                  }}
                  className="focusable w-full py-2 bg-white text-black text-xs font-bold rounded hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play Now ({nextEpisodeCountdown}s)
                </button>
              </div>
            )}

            {/* Premium Controls Overlay */}
            <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between transition-opacity duration-300 z-10 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>

              {/* Top Controls Bar */}
              <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        saveCurrentProgress(videoRef.current.currentTime);
                      }
                      if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => { });
                      }
                      onExit();
                    }}
                    className="focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs md:text-sm truncate max-w-[200px] md:max-w-xs text-left">
                        {movie.title}
                      </span>
                      {isPlayingTrailer && (
                        <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[9px] font-extrabold rounded uppercase tracking-wider shrink-0 select-none">
                          Trailer
                        </span>
                      )}
                    </div>
                    {currentPlayingEpisodeTitle && !isPlayingTrailer && (
                      <span className="text-[10px] text-zinc-450 font-medium text-left">
                        {currentPlayingEpisodeTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0 text-white">

                  {/* <button
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettingsOverlay(true);
                      setActiveSettingTab('audio');
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Audio & Subtitles"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button> */}
                  <button
                    onClick={toggleCC}
                    className={`focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer outline-none border border-transparent focus:border-zinc-700 ${currentSubtitleTrack !== -1 ? "text-yellow-500 font-bold" : "text-white"
                      }`}
                    title="Toggle Captions"
                  >
                    <Subtitles className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettingsOverlay(true);
                      setActiveSettingTab('quality');
                    }}
                    className="focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer outline-none border border-transparent focus:border-zinc-700"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer outline-none border border-transparent focus:border-zinc-700"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Left vertical edge: Brightness slider */}
              <div className="flex flex-col items-center gap-2 absolute left-8 top-1/2 -translate-y-1/2 z-20">
                <Sun className="w-5 h-5 text-zinc-350" />
                <div className="h-24 w-6 flex items-center justify-center relative">
                  <input
                    tabIndex={-1}
                    type="range"
                    min="10"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
                    style={{
                      appearance: 'slider-vertical',
                      WebkitAppearance: 'slider-vertical',
                      writingMode: 'vertical-lr',
                      direction: 'rtl'
                    } as any}
                    {...{ orient: "vertical" }}
                  />
                </div>
              </div>

              {/* Right vertical edge: Volume slider */}
              <div className="flex flex-col items-center gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-20">
                <button
                  onClick={toggleMute}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (videoRef.current) {
                      const newMuted = !isMuted;
                      videoRef.current.muted = newMuted;
                      setIsMuted(newMuted);
                    }
                    triggerControlsShow();
                  }}
                  className="focusable text-zinc-350 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="h-24 w-6 flex items-center justify-center relative">
                  <input
                    tabIndex={-1}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onClick={(e) => e.stopPropagation()}
                    className="w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
                    style={{
                      appearance: 'slider-vertical',
                      WebkitAppearance: 'slider-vertical',
                      writingMode: 'vertical-lr',
                      direction: 'rtl'
                    } as any}
                    {...{ orient: "vertical" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-12 md:gap-20">
                <button
                  onClick={skipBackward}
                  className="focusable p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
                  title="Rewind 10s"
                >
                  <ChevronsLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="focusable w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer animate-in fade-in"
                  title={isCurrentlyPlaying ? "Pause" : "Play"}
                >
                  {isCurrentlyPlaying ? (
                    <Pause className="w-8 h-8 fill-current text-black" />
                  ) : (
                    <Play className="w-8 h-8 fill-current text-black ml-1" />
                  )}
                </button>

                <button
                  onClick={skipForward}
                  className="focusable p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
                  title="Fast Forward 10s"
                >
                  <ChevronsRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
              </div>

              {/* Bottom Controls Bar */}
              <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-3">
                {/* Progress Bar/Scrubber */}
                <div className="flex items-center gap-3">
                  <input
                    tabIndex={-1}
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleScrub}
                    className="flex-1 h-1 rounded-lg cursor-pointer outline-none transition-all hover:h-1.5"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / (duration || 100)) * 100}%, #4B5563 ${(currentTime / (duration || 100)) * 100}%, #4B5563 100%)`,
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>

                {/* Control Action Buttons below timeline */}
                <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-zinc-350 px-1 gap-2 overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-6 shrink">
                    {/* Episodes button for shows */}
                    {(movie.category === "TV Show" || movie.category === "Documentary") && movie.seasons && movie.seasons.length > 0 && (
                      <button
                        className="focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = document.getElementById("episodes-section");
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <ListVideo className="w-4 h-4" />
                        <span>Episodes</span>
                      </button>
                    )}

                    {/* Speed setting indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSettingsOverlay(true);
                        setActiveSettingTab('speed');
                      }}
                      className="focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                    >
                      <span className="px-1.5 py-0.5 border border-zinc-700 rounded text-[9px] uppercase font-bold text-zinc-400">Speed</span>
                      <span>{playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}</span>
                    </button>

                    {/* Rate heart button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRated(!isRated);
                      }}
                      className="focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                      title="Rate"
                    >
                      <Heart className={`w-4 h-4 transition-colors ${isRated ? "fill-red-500 text-red-500" : ""}`} />
                      <span>Rate</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                    {/* Next Episode Button */}
                    {(movie.category === "TV Show" || movie.category === "Documentary") && currentEpisode && (
                      (() => {
                        const currentEpNum = currentEpisode.episodeNumber;
                        const hasNext = movie.seasons?.[0]?.episodes?.some((e: any) => e.episodeNumber === currentEpNum + 1);
                        if (hasNext) {
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playNextEpisode();
                              }}
                              className="focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300 animate-pulse"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Next Episode</span>
                            </button>
                          );
                        }
                        return null;
                      })()
                    )}

                    {/* Duration tracking */}
                    <span className="font-mono text-xs text-zinc-400 whitespace-nowrap shrink-0">
                      {formatTime(currentTime)}/{formatTime(duration)}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Settings Overlay Drawer */}
            {showSettingsOverlay && (
              <>
                {/* Backdrop to close the dropdown when clicking outside */}
                <div
                  tabIndex={-1}
                  className="absolute inset-0 z-30 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsOverlay(false);
                  }}
                />

                <div
                  tabIndex={-1}
                  className="absolute top-3 right-3 sm:top-16 sm:right-4 w-49 xs:w-80 max-w-[calc(100vw-1.5rem)] sm:max-w-none max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-5rem)] bg-zinc-950/95 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl flex flex-col p-3 z-40 animate-in fade-in slide-in-from-top-3 duration-200 text-left overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showReportSection ? (
                    <div className="flex flex-col flex-1 min-h-0">
                      <div className="flex items-center gap-2 mb-3 shrink-0">
                        <button
                          onClick={() => setShowReportSection(false)}
                          className="focusable p-1 hover:bg-zinc-900 rounded-md text-zinc-400 hover:text-white transition-colors outline-none cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-xs font-bold text-white">Report an Issue</span>
                      </div>

                      <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {[
                          { key: 'quality_issue', label: 'Quality Issue' },
                          { key: 'audio_issue', label: 'Audio Issue' },
                          { key: 'buffering_connection_issue', label: 'Buffering and Connection Issue' },
                          { key: 'caption_issue', label: 'Caption Issue' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            onClick={() => handleReportIssue(item.label)}
                            className="focusable text-xs font-semibold cursor-pointer py-2 px-3 rounded hover:bg-white/5 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white text-left outline-none transition-all duration-150"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-900 shrink-0">
                        <button
                          onClick={() => setShowReportSection(true)}
                          className="focusable text-[10px] md:text-xs font-semibold text-zinc-450 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 outline-none"
                        >
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span>Report an Issue</span>
                        </button>
                      </div>

                      <Tabs defaultValue="quality" value={activeSettingTab} onValueChange={(val) => setActiveSettingTab(val as any)} className="w-full flex flex-col flex-1 min-h-0">
                        <TabsList className="grid grid-cols-2 bg-zinc-900 p-0.5 mb-2 w-full shrink-0">
                          <TabsTrigger value="quality" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                            Quality
                          </TabsTrigger>
                          <TabsTrigger value="speed" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                            Speed
                          </TabsTrigger>
                          {/* <TabsTrigger value="subtitles" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                            Subtitles
                          </TabsTrigger> */}
                        </TabsList>

                        {/* Content Options */}
                        <div className="overflow-y-auto w-full my-0.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex-1 min-h-0">
                          <TabsContent value="quality" className="mt-0 outline-none w-full">
                            <div className="flex flex-col gap-1 w-full text-zinc-300">
                              {qualities.length > 0 ? (
                                qualities.map((q) => {
                                  const isActive = currentQuality === q.id;
                                  const effectiveMax = isPlayingTrailer ? 2160 : maxResolutionHeight;
                                  const isLocked = q.id !== -1 && q.height > effectiveMax;
                                  const label = q.id === -1 ? "Auto (Recommended)" : q.name;

                                  return (
                                    <div
                                      key={`${q.height}_${q.id}`}
                                      className="flex items-center justify-between w-full hover:bg-white/5 rounded px-2 py-1"
                                    >
                                      <button
                                        onClick={() => {
                                          if (isLocked) {
                                            if (document.fullscreenElement) {
                                              document.exitFullscreen().catch(() => { });
                                            }
                                            navigate("/upgrade-plan");
                                          } else {
                                            handleQualityChange(q.id);
                                          }
                                          setShowSettingsOverlay(false);
                                        }}
                                        className="focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-0.5 rounded w-full text-left outline-none"
                                      >
                                        <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive && !isLocked ? "opacity-100" : "opacity-0"}`}>✓</span>
                                        <span className={isActive && !isLocked ? "text-white font-bold" : "hover:text-white text-zinc-400"}>
                                          {label}
                                        </span>
                                      </button>

                                      {isLocked && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (document.fullscreenElement) {
                                              document.exitFullscreen().catch(() => { });
                                            }
                                            navigate("/upgrade-plan");
                                            setShowSettingsOverlay(false);
                                          }}
                                          className="focusable bg-primary-foreground text-secondary px-2 py-0.5 rounded text-[10px] font-bold ml-2 shrink-0 cursor-pointer hover:bg-primary-foreground/90 transition-all outline-none"
                                        >
                                          Upgrade
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                // Standard quality series for static MP4 / no HLS levels
                                (() => {
                                  const staticOpts = [
                                    { id: -1, label: "Auto (Recommended)", height: 0 },
                                    { id: 1080, label: "1080p", height: 1080 },
                                    { id: 720, label: "720p", height: 720 },
                                    { id: 480, label: "480p", height: 480 },
                                    { id: 360, label: "360p", height: 360 },
                                    { id: 240, label: "240p", height: 240 },
                                    { id: 144, label: "144p", height: 144 },
                                  ];
                                  return staticOpts.map((opt) => {
                                    const isActive = currentQuality === opt.id;
                                    const effectiveMax = isPlayingTrailer ? 2160 : maxResolutionHeight;
                                    const isLocked = opt.id !== -1 && opt.height > effectiveMax;
                                    return (
                                      <div
                                        key={opt.id}
                                        className="flex items-center justify-between w-full hover:bg-white/5 rounded px-2 py-1"
                                      >
                                        <button
                                          onClick={() => {
                                            if (isLocked) {
                                              if (document.fullscreenElement) {
                                                document.exitFullscreen().catch(() => { });
                                              }
                                              navigate("/upgrade-plan");
                                            } else {
                                              setCurrentQuality(opt.id);
                                            }
                                            setShowSettingsOverlay(false);
                                          }}
                                          className="focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-0.5 rounded w-full text-left outline-none"
                                        >
                                          <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive && !isLocked ? "opacity-100" : "opacity-0"}`}>✓</span>
                                          <span className={isActive && !isLocked ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                            {opt.label}
                                          </span>
                                        </button>

                                        {isLocked && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (document.fullscreenElement) {
                                                document.exitFullscreen().catch(() => { });
                                              }
                                              navigate("/upgrade-plan");
                                              setShowSettingsOverlay(false);
                                            }}
                                            className="focusable bg-primary-foreground text-secondary px-2 py-0.5 rounded text-[10px] font-bold ml-2 shrink-0 cursor-pointer hover:bg-primary-foreground/90 transition-all outline-none"
                                          >
                                            Upgrade
                                          </button>
                                        )}
                                      </div>
                                    );
                                  });
                                })()
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="speed" className="mt-0 outline-none w-full">
                            <div className="flex flex-col gap-1 w-full text-zinc-350">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => {
                                const isActive = playbackSpeed === sp;
                                return (
                                  <button
                                    key={sp}
                                    onClick={() => {
                                      handleSpeedChange(sp);
                                      setShowSettingsOverlay(false);
                                    }}
                                    className="focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left outline-none"
                                  >
                                    <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                                    <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                      {sp === 1 ? "1x (Normal)" : `${sp}x`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </TabsContent>

                          <TabsContent value="subtitles" className="mt-0 outline-none w-full">
                            <div className="flex flex-col gap-1 w-full text-zinc-350">
                              <button
                                onClick={() => {
                                  handleSubtitleChange(-1);
                                  setShowSettingsOverlay(false);
                                }}
                                className="focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                              >
                                <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${currentSubtitleTrack === -1 ? "opacity-100" : "opacity-0"}`}>✓</span>
                                <span className={currentSubtitleTrack === -1 ? "text-white font-bold" : "hover:text-white text-zinc-400"}>
                                  Off
                                </span>
                              </button>

                              {subtitleTracks.map((track) => {
                                const isActive = currentSubtitleTrack === track.id;
                                return (
                                  <button
                                    key={track.id}
                                    onClick={() => {
                                      handleSubtitleChange(track.id);
                                      setShowSettingsOverlay(false);
                                    }}
                                    className="focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                                  >
                                    <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                                    <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                      {track.name}
                                    </span>
                                  </button>
                                );
                              })}

                              {subtitleTracks.length === 0 && (
                                <div className="text-zinc-500 text-xs py-4 text-center font-sans">
                                  No subtitles available
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </>
                  )}


                </div>
              </>
            )}

            {/* Feedback / Review Overlay Modal */}
            <FeedbackModal
              isOpen={showFeedbackOverlay}
              onClose={() => {
                setShowFeedbackOverlay(false);
                onExit();
              }}
              onSubmitSuccess={() => {
                setShowFeedbackOverlay(false);
                if (onFeedbackSubmitted) {
                  onFeedbackSubmitted();
                }
                onExit();
              }}
              movieId={movie.id}
              movieTitle={movie.title}
              userId={userId}
            />
          </>
        )}
      </div >
    </div >
  );
});
