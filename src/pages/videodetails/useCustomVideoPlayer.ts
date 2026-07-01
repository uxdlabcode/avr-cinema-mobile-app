import React, { useState, useEffect, useRef, useMemo } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { createDocument, deleteDocument, getDocumentData, addDocument } from '@/Firebase';
import { auth } from '@/Firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { isTvPlatform } from '@/lib/tvUtils';
import { toast } from 'sonner';

const _CF_ORIGIN = `https://${import.meta.env.VITE_CLOUDFRONT_DOMAIN}`;
const _CF_PROXY  = '/__cf__';
export function getDevSafeUrl(url: string): string {
  if (!url) return url;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && url.startsWith(_CF_ORIGIN)) {
    return url.replace(_CF_ORIGIN, _CF_PROXY);
  }
  return url;
}

export interface VTTCue {
  start: number;
  end: number;
  text: string;
}

const parseVTT = (text: string): VTTCue[] => {
  const cues: VTTCue[] = [];
  const blocks = text.trim().replace(/\r\n/g, "\n").split(/\n\n+/);

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(":");
    let hrs = 0;
    let mins = 0;
    let secs = 0;

    if (parts.length === 3) {
      hrs = parseFloat(parts[0]);
      mins = parseFloat(parts[1]);
      secs = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      mins = parseFloat(parts[0]);
      secs = parseFloat(parts[1]);
    }

    return hrs * 3600 + mins * 60 + secs;
  };

  blocks.forEach((block) => {
    const lines = block.split("\n");
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) return;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());

    const start = parseTime(startStr);
    const end = parseTime(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const cueText = textLines.join("\n").replace(/<[^>]*>/g, ""); // Strip HTML/styling tags

    if (!isNaN(start) && !isNaN(end) && cueText.trim()) {
      cues.push({ start, end, text: cueText.trim() });
    }
  });

  return cues;
};

const getWordCount = (text: string): number => {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
};

const getWordsSubset = (text: string, count: number): string => {
  const regex = /\S+/g;
  let match;
  let wordCount = 0;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    wordCount++;
    lastIndex = regex.lastIndex;
    if (wordCount === count) {
      return text.substring(0, lastIndex);
    }
  }

  return text;
};

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

export interface UseCustomVideoPlayerProps {
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

export const useCustomVideoPlayer = ({
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
}: UseCustomVideoPlayerProps) => {
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

  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isCurrentlyPlaying);
    }
  }, [isCurrentlyPlaying, onPlayStateChange]);

  const user = useAppSelector((state) => state.auth.user);
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

  // Fetch subscription plan resolution limit from Firestore
  useEffect(() => {
    const fetchPlanResolution = async () => {
      // Temporarily bypass resolution restrictions related to membership for now
      setMaxResolutionHeight(99999);
    };

    fetchPlanResolution();
  }, [userId, user?.membershipPlanId, user?.membershipStatus, user?.role]);

  // Custom Settings overlay states
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [showReportSection, setShowReportSection] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'quality' | 'audio' | 'speed' | 'subtitles'>('quality');
  const [isCCOverlayMode, setIsCCOverlayMode] = useState(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [audioLanguage, setAudioLanguage] = useState<string>("English [Original]");
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>("Off");
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; lang: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1); // -1 = Off
  const [cues, setCues] = useState<VTTCue[]>([]);
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

  const getDbCaptions = () => {
    if (isPlayingTrailer) {
      return movie?.trailerCaptions || [];
    }
    if (currentEpisode) {
      return currentEpisode?.captions || currentEpisode?.caption || [];
    }
    return movie?.movieCaptions || movie?.caption || movie?.subtitles || [];
  };

  const dbCaptions = useMemo(() => getDbCaptions(), [movie, currentEpisode, isPlayingTrailer]);

  const activeCueText = useMemo(() => {
    if (currentSubtitleTrack === -1 || cues.length === 0) return "";
    const activeCue = cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end);
    if (!activeCue) return "";

    const totalWords = getWordCount(activeCue.text);
    if (totalWords <= 1) return activeCue.text;

    const cueDuration = activeCue.end - activeCue.start;
    const elapsed = currentTime - activeCue.start;
    const slice = cueDuration / totalWords;
    const wordsToShow = Math.min(Math.floor(elapsed / slice) + 1, totalWords);

    return getWordsSubset(activeCue.text, wordsToShow);
  }, [currentTime, cues, currentSubtitleTrack]);

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
    const video = videoRef.current;
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(inFullscreen);

      // When entering fullscreen, try locking to landscape again to assist the browser orientation manager
      if (inFullscreen) {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => { });
        }
      }
    };

    const handleWebkitBeginFullscreen = () => {
      setIsFullscreen(true);
    };

    const handleWebkitEndFullscreen = () => {
      setIsFullscreen(false);
      if (playInline && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
      video.addEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleWebkitBeginFullscreen);
        video.removeEventListener("webkitendfullscreen", handleWebkitEndFullscreen);
      }
    };
  }, [playInline]);

  // Clean up next episode countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
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
        let token: string | null = null;
        try {
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken(true);
          } else {
            // Firebase Auth is asynchronous — wait for the initial state to settle if needed.
            const firebaseUser = await new Promise<any>((resolve) => {
              let unsubscribe: (() => void) | null = null;
              unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                  if (unsubscribe) unsubscribe();
                  resolve(user);
                }
              });
            });
            token = (await firebaseUser.getIdToken(true)) || null;
          }
        } catch (err) {
          console.error("Error fetching auth token for HLS decryption:", err);
        }
        hlsInstance = new HlsClass({
          xhrSetup: (xhr: any, url: string) => {
            // In development, route every CloudFront XHR (segments, keys, playlists)
            // through the Vite proxy so the browser never makes a cross-origin request.
            let finalUrl = getDevSafeUrl(url);

            // Append auth token for video-decryption-key requests.
            if (finalUrl.includes("/getVideoKey") && token) {
              const delimiter = finalUrl.includes("?") ? "&" : "?";
              finalUrl = `${finalUrl}${delimiter}token=${token}`;
            }

            // Only call xhr.open() when the URL actually changed.
            if (finalUrl !== url) {
              xhr.open("GET", finalUrl, true);
            }
          }
        });
        hlsInstance.loadSource(getDevSafeUrl(currentSourceUrl));
        hlsInstance.attachMedia(video);
        hlsRef.current = hlsInstance;

        // Listen for Hls subtitle tracks updating
        hlsInstance.on(HlsClass.Events.SUBTITLE_TRACKS_UPDATED, (_event: any, data: any) => {
          const dbCaps = getDbCaptions();
          if (dbCaps.length > 0) return;
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
        video.src = getDevSafeUrl(currentSourceUrl);
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
  }, [currentSourceUrl, isPlayingTrailer]);

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

    // Immediate autofocus for TV D-pad navigation when controls are shown
    if (isTvPlatform()) {
      setTimeout(() => {
        const firstFocusable = document.querySelector(".focusable") as HTMLElement;
        if (firstFocusable && (!document.activeElement || document.activeElement === document.body || !document.activeElement.classList.contains("focusable"))) {
          firstFocusable.focus();
        }
      }, 50);
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

  // Autofocus when settings overlay is toggled on a TV
  useEffect(() => {
    if (showSettingsOverlay && isTvPlatform()) {
      setTimeout(() => {
        const panel = document.querySelector(".settings-overlay-panel");
        const firstFocusable = panel ? (panel.querySelector(".focusable") as HTMLElement) : null;
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
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

      // Allow Arrow keys to move focus if controls are showing
      if (showControls) {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          if (showSettingsOverlay) {
            setShowSettingsOverlay(false);
          } else {
            setShowControls(false);
          }
        }
        return;
      }

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
          setShowControls(true);
          triggerControlsShow();
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
  }, [isCurrentlyPlaying, duration, onExit, showControls, showSettingsOverlay]);

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
        mediaId: movie?.id || "",
        contentTitle: movie?.title || "",
        issueType,
        createdAt: serverTimestamp(),
        ...(currentEpisode ? {
          episodeId: currentEpisode.id || null,
          episodeTitle: currentPlayingEpisodeTitle || currentEpisode.title || null,
        } : {})
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
    setIsCCOverlayMode(true);
    setShowSettingsOverlay(true);
    setActiveSettingTab('subtitles');
  };

  // Sync Native HTML5 text tracks (if dynamically added or parsed from standard mp4 container)
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const syncTextTracks = () => {
      const dbCaps = getDbCaptions();
      if (dbCaps.length > 0) return;
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
  }, [subtitleTracks.length, movie, currentEpisode, isPlayingTrailer]);

  // Hydrate subtitle tracks list dynamically from Firebase media collection database metadata
  useEffect(() => {
    const dbCaps = getDbCaptions();
    if (dbCaps && dbCaps.length > 0) {
      const tracks = dbCaps.map((sub: any, idx: number) => ({
        id: idx,
        name: sub.language || sub.label || sub.name || `Track ${idx}`,
        lang: sub.languageCode || sub.language || sub.lang || ""
      }));
      setSubtitleTracks(tracks);

      // Auto-enable default track if set
      const defaultIdx = dbCaps.findIndex((sub: any) => sub.isDefault);
      if (defaultIdx !== -1) {
        setCurrentSubtitleTrack(defaultIdx);
        const defaultTrack = dbCaps[defaultIdx];
        setSubtitleLanguage(defaultTrack.language || defaultTrack.label || defaultTrack.name || "On");
      } else {
        setCurrentSubtitleTrack(-1);
        setSubtitleLanguage("Off");
      }
    } else {
      setSubtitleTracks([]);
      setCurrentSubtitleTrack(-1);
      setSubtitleLanguage("Off");
    }
  }, [movie, currentEpisode, isPlayingTrailer]);

  // Load and parse captions file when selected track changes
  useEffect(() => {
    if (currentSubtitleTrack === -1 || !subtitleTracks[currentSubtitleTrack]) {
      setCues([]);
      return;
    }

    const activeTrack = subtitleTracks[currentSubtitleTrack];
    const captionsList = getDbCaptions();
    const captionItem = captionsList.find(
      (sub: any) =>
        (sub.languageCode || sub.language || sub.lang || "") === activeTrack.lang &&
        (sub.language || sub.label || sub.name || "") === activeTrack.name
    );

    const url = captionItem?.url || captionItem?.caption_file || captionItem?.src;
    if (!url) {
      setCues([]);
      return;
    }

    const fetchUrl = getDevSafeUrl(url);

    fetch(fetchUrl, { mode: 'cors', credentials: 'omit' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch subtitle track (${res.status})`);
        return res.text();
      })
      .then((text) => {
        const parsed = parseVTT(text);
        setCues(parsed);
      })
      .catch((err) => {
        // Swallow any remaining fetch/CORS error silently.
        console.warn("[Subtitles] Could not load subtitle file:", err?.message || err);
        setCues([]);
      });
  }, [currentSubtitleTrack, subtitleTracks]);

  // Synchronize the selected subtitle track with the HTML5 video textTracks mode
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tracks = video.textTracks;

    const syncTracks = () => {
      const hasDbCaptions = getDbCaptions().length > 0;
      for (let i = 0; i < tracks.length; i++) {
        if (i === currentSubtitleTrack && !hasDbCaptions) {
          tracks[i].mode = "showing";
        } else {
          tracks[i].mode = "disabled";
        }
      }
    };

    // Run immediately
    syncTracks();

    // Listen for dynamically added tracks
    tracks.addEventListener("addtrack", syncTracks);
    tracks.addEventListener("removetrack", syncTracks);

    return () => {
      tracks.removeEventListener("addtrack", syncTracks);
      tracks.removeEventListener("removetrack", syncTracks);
    };
  }, [currentSubtitleTrack, subtitleTracks]);

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

  return {
    // Refs
    videoRef,
    containerRef,

    // States
    isCurrentlyPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    showControls,
    playbackSpeed,
    qualities,
    currentQuality,
    showSettingsOverlay,
    showReportSection,
    activeSettingTab,
    isCCOverlayMode,
    brightness,
    audioLanguage,
    subtitleLanguage,
    subtitleTracks,
    currentSubtitleTrack,
    cues,
    isOnline,
    isRated,
    isMobilePortrait,
    isVideoLoading,
    nextEpisodeCountdown,
    showFeedbackOverlay,
    currentSourceUrl,
    isPlayingTrailer,
    dbCaptions,
    activeCueText,
    maxResolutionHeight,

    // Actions/Handlers
    togglePlayPause,
    skipForward,
    skipBackward,
    handleTimeUpdate,
    handleDurationChange,
    handleScrub,
    toggleMute,
    handleVolumeChange,
    toggleFullscreen,
    handleQualityChange,
    handleSpeedChange,
    handleSubtitleChange,
    handleReportIssue,
    toggleCC,
    triggerControlsShow,
    formatTime,
    setShowControls,
    setIsVideoLoading,
    setIsCurrentlyPlaying,
    setShowFeedbackOverlay,
    setIsPlayingTrailer,
    setCurrentSourceUrl,
    setNextEpisodeCountdown,
    setShowSettingsOverlay,
    setShowReportSection,
    setActiveSettingTab,
    setIsCCOverlayMode,
    setBrightness,
    setIsMuted,
    setIsRated,
  };
};
