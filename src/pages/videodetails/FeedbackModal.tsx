import React, { useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { createDocument } from '@/Firebase';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  movieId: string;
  movieTitle: string;
  userId: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  movieId,
  movieTitle,
  userId,
}) => {
  const [userRatingSelection, setUserRatingSelection] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitFeedback = async () => {
    if (userRatingSelection === 0) return;
    setIsSubmitting(true);
    const feedbackKey = movieId;

    if (userId) {
      try {
        const docId = `${userId}_${feedbackKey}`;
        const payload = {
          id: docId,
          userId,
          movieId: feedbackKey,
          rating: userRatingSelection,
          createdAt: serverTimestamp(),
        };
        await createDocument("feedback", docId, payload);
      } catch (err) {
        console.error("Error saving feedback to database:", err);
      }
    } else {
      try {
        const localFeedback = localStorage.getItem('avr_local_feedback') || '{}';
        const localRatings = JSON.parse(localFeedback);
        localRatings[feedbackKey] = {
          rating: userRatingSelection,
          createdAt: Date.now(),
        };
        localStorage.setItem('avr_local_feedback', JSON.stringify(localRatings));
      } catch (err) {
        console.error("Error saving local feedback:", err);
      }
    }

    setIsSubmitting(false);
    onSubmitSuccess();
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-2">
      <Card tabIndex={-1} className="max-w-[280px] xs:max-w-xs sm:max-w-sm w-full bg-zinc-900/95 border-zinc-800 p-3.5 sm:p-5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300 border gap-3 sm:gap-4">
        <CardHeader className="flex flex-col items-center justify-center text-center p-0 gap-2.5 sm:gap-4 w-full">
          <div className="flex justify-center">
            <div className="rounded-full bg-yellow-500/10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center border border-yellow-500/25">
              <svg
                className="w-5 h-5 sm:w-8 sm:h-8 text-primary-foreground fill-primary-foreground animate-pulse"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          <div className="space-y-1 sm:space-y-1">
            <CardTitle className="font-bold text-white tracking-tight text-base sm:text-xl leading-none">
              How was your experience?
            </CardTitle>
            <CardDescription className="hidden sm:block text-zinc-400 text-[10px] sm:text-xs md:text-sm max-w-[240px] sm:max-w-xs mx-auto text-center leading-normal">
              Please rate <span className="text-white font-semibold">{movieTitle}</span> to help us suggest better content for you.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col items-center justify-center w-full">
          {/* 5-Star Interactive Rating Picker */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isHighlighted = (hoveredStar || userRatingSelection) >= starValue;
              return (
                <button
                  key={starValue}
                  type="button"
                  onMouseEnter={() => setHoveredStar(starValue)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setUserRatingSelection(starValue)}
                  className="focusable p-0.5  cursor-pointer transition-transform duration-150 active:scale-90 focus:outline-none"
                >
                  <svg
                    className={`w-7 h-7 sm:w-10 sm:h-10 transition-colors duration-150 ${isHighlighted ? "text-primary-foreground fill-primary-foreground" : "text-zinc-600 hover:text-primary-foreground"
                      }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-row w-full gap-2 sm:gap-3 p-0">
          <button
            onClick={handleSubmitFeedback}
            disabled={userRatingSelection === 0 || isSubmitting}
            className="focusable flex-1 py-1.5 sm:py-2 text-xs sm:text-sm bg-primary-foreground hover:bg-primary-foreground/90 disabled:bg-zinc-800 disabled:text-zinc-500 text-secondary font-bold rounded-md transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Submit</span>
            )}
          </button>

          <button
            onClick={onClose}
            className="focusable flex-1 py-1.5 sm:py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800/80 hover:bg-zinc-900 text-white font-semibold rounded-md transition-all active:scale-[0.98] cursor-pointer text-center"
          >
            Skip
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};
