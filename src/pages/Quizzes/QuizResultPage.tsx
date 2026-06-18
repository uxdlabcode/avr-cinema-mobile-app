import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RootState, AppDispatch } from "@/store";
import { fetchQuizzes } from "@/store/slices/quizSlice";
import { addDocument } from "@/Firebase";
import { db } from "@/Firebase/firebase";
import { getDocumentData } from "@/Firebase/CloudFirestore/GetData";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, CheckCircle2, XCircle, RotateCcw, Home, Star, ArrowLeft,
} from "lucide-react";
import type { Quiz } from "./QuizzesPage";

interface LocationState {
  quiz: Quiz;
  answers: Record<string, string[]>;
  score: number;
  correct: number;
  total: number;
}

// ── Radial progress ring ──────────────────────────────────────────────────
const ScoreRing = ({ pct, size = 128 }: { pct: number; size?: number }) => {
  const r = (size / 2) - 10;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "var(--primary)" : "#ef4444";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-foreground/5" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
};

const StarRating = ({ score }: { score: number }) => {
  const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((s) => (
        <Star key={s} className={`w-5 h-5 ${s <= stars ? "text-primary fill-primary" : "text-foreground/10"}`} />
      ))}
    </div>
  );
};

// ── Answer Review Card ────────────────────────────────────────────────────
const AnswerCard = ({ q, sel, idx }: { q: Quiz["questions"][number]; sel: string[]; idx: number }) => {
  const ca = q.correctAnswers ?? [];
  const isCorrect = sel.length === ca.length && ca.every((c) => sel.includes(c));
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 w-6 h-6 rounded-md bg-foreground/10 text-foreground text-[10px] font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
        <p className="text-foreground text-sm font-semibold leading-snug">{q.text}</p>
        <div className="ml-auto flex-shrink-0">
          {isCorrect
            ? <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Correct</span>
            : <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Wrong</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {q.options.map((opt) => {
          const wasSelected = sel.includes(opt.id);
          const isOpt = ca.includes(opt.id);
          let cls = "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ";
          if (isOpt) cls += "bg-primary/10 text-emerald-400";
          else if (wasSelected && !isOpt) cls += "bg-primary/10 text-rose-400 line-through";
          else cls += " bg-primary/10 text-muted-foreground";
          return (
            <div key={opt.id} className={cls}>
              {isOpt ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                : wasSelected ? <XCircle className="w-3.5 h-3.5 shrink-0" />
                  : <span className="w-3.5 h-3.5 shrink-0" />}
              {opt.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Skeleton Loader ────────────────────────────────────────────────────────
const QuizResultPageSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background">
    {/* Header Skeleton */}
    <div className="border-b border-border py-4 px-4 md:px-10">
      <div className="max-w-[1200px] mx-auto flex items-center gap-4">
        <Skeleton className="w-9 h-9 md:w-10 md:h-10 rounded-full md:rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 md:h-6 w-40 md:w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>

    {/* Mobile layout */}
    <div className="md:hidden flex-1 p-4 pt-4 pb-28 flex flex-col gap-4">
      {/* Score Card Skeleton */}
      <div className="border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
        <Skeleton className="w-32 h-32 rounded-full" />
        <Skeleton className="h-5 w-24 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
        <div className="flex gap-4 mt-2">
          <Skeleton className="h-14 w-16 rounded-xl" />
          <Skeleton className="h-14 w-16 rounded-xl" />
          <Skeleton className="h-14 w-16 rounded-xl" />
        </div>
      </div>
      {/* Answer list */}
      <div className="space-y-3 mt-4">
        <Skeleton className="h-5 w-32 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>

    {/* Desktop layout */}
    <div className="hidden md:flex flex-1 max-w-[1200px] mx-auto w-full px-6 lg:px-10 xl:px-16 py-8 gap-8">
      {/* Left Column */}
      <div className="w-[320px] lg:w-[360px] shrink-0 space-y-5">
        <div className="border border-border rounded-lg p-6 flex flex-col items-center gap-5">
          <Skeleton className="w-40 h-40 rounded-full" />
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
          <div className="grid grid-cols-3 gap-3 w-full border-t border-border pt-5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Right Column */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex justify-between items-center mb-5">
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────
export const QuizResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const user = useSelector((s: RootState) => s.auth.user);
  const savedRef = useRef(false);

  const [resultData, setResultData] = useState<LocationState | null>(state);
  const [loading, setLoading] = useState(!state);

  // Redux cache
  const dispatch = useDispatch<AppDispatch>();
  const quizzes = useSelector((s: RootState) => s.quiz.items);
  const quizStatus = useSelector((s: RootState) => s.quiz.status);

  const [latestQuizId, setLatestQuizId] = useState<string | null>(null);
  const [latestResultDoc, setLatestResultDoc] = useState<any>(null);

  useEffect(() => {
    if (!state || savedRef.current) return;
    savedRef.current = true;
    const saveResult = async () => {
      try {
        await addDocument("quiz_result", {
          userId: user?.id || "",
          userName: user?.name || "",
          quizId: state.quiz.id,
          quizTitle: state.quiz.title,
          score: state.score,
          correct: state.correct,
          total: state.total,
          answers: state.answers, // Save user options so they can be restored on page refresh
          completedAt: Date.now(),
        });

        // Save a quiz completion notification
        await addDocument("notifications", {
          userId: user?.id || "",
          title: "Quiz Completed! 🏆",
          description: `You completed the "${state.quiz.title}" quiz with a score of ${state.score}%.`,
          type: "quiz",
          image: "/assets/cast1.webp",
          read: false,
          createdAt: Date.now(),
          link: `/quizzes/${state.quiz.id}/result`
        });
      } catch (err) {
        console.error("Error saving quiz result:", err);
      }
    };
    saveResult();
  }, [state, user]);

  // Phase 1: Retrieve the latest result document to get the quizId
  useEffect(() => {
    if (state) return; // already loaded from state
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchLatestResult = async () => {
      try {
        const q = query(
          collection(db, "quiz_result"),
          where("userId", "==", user.id)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setLoading(false);
          return;
        }

        const docs = querySnapshot.docs.map((d) => d.data());
        // Sort in memory to avoid index requirements
        const latestDoc = docs.sort((a, b) => b.completedAt - a.completedAt)[0];
        setLatestResultDoc(latestDoc);
        setLatestQuizId(latestDoc.quizId);
      } catch (err) {
        console.error("Error fetching latest result:", err);
        setLoading(false);
      }
    };

    fetchLatestResult();
  }, [user?.id, state]);

  // Phase 2: Resolve the quiz document using Redux cache/dispatch or direct fallback
  useEffect(() => {
    if (state || !latestQuizId || !latestResultDoc) return;

    // 1. Try finding in the cached Redux store
    const cached = quizzes.find((q) => q.id === latestQuizId);
    if (cached) {
      setResultData({
        quiz: cached,
        answers: latestResultDoc.answers || {},
        score: latestResultDoc.score,
        correct: latestResultDoc.correct,
        total: latestResultDoc.total,
      });
      setLoading(false);
      return;
    }

    // 2. If quizzes aren't loaded yet in Redux, trigger loading of all quizzes
    if (quizStatus === "idle") {
      dispatch(fetchQuizzes());
      return;
    }

    // 3. Fallback to direct DB fetch if Redux finished loading/failed but the quiz isn't there
    if (quizStatus === "succeeded" || quizStatus === "failed") {
      const fetchDirect = async () => {
        try {
          const quizDoc = await getDocumentData("quizzes", latestQuizId);
          if (quizDoc) {
            setResultData({
              quiz: quizDoc as unknown as Quiz,
              answers: latestResultDoc.answers || {},
              score: latestResultDoc.score,
              correct: latestResultDoc.correct,
              total: latestResultDoc.total,
            });
          }
        } catch (err) {
          console.error("Error fetching quiz directly:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchDirect();
    }
  }, [latestQuizId, latestResultDoc, quizzes, quizStatus, dispatch, state]);

  if (loading) {
    return <QuizResultPageSkeleton />;
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Trophy className="w-12 h-12 text-primary/40" />
        <p className="text-muted-foreground text-sm text-center">No result data found. Please take a quiz first.</p>
        <Button onClick={() => navigate("/quiz")} className="focusable rounded-xl px-5 h-auto py-2.5 text-sm font-bold">Browse Quizzes</Button>
      </div>
    );
  }

  const { quiz, answers, score, correct, total } = resultData;
  const resultLabel = score >= 80 ? "Excellent! 🎉" : score >= 50 ? "Good Job! 👍" : "Keep Trying! 💪";
  const resultDesc = score >= 80 ? "You're a true cinema expert!" : score >= 50 ? "You know your movies well. Practice more!" : "Don't give up — review and try again!";
  const resultColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-primary" : "text-rose-400";

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ═══ MOBILE Header (fixed) ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
          <h1 className="text-foreground font-bold text-lg">Quiz Results</h1>
        </div>
      </div>

      {/* ═══ MOBILE Body ═══ */}
      <div className="md:hidden flex-1 pt-[64px] pb-28 overflow-y-auto scrollbar-hide max-w-[700px] mx-auto w-full">
        <div className="mx-4 rounded-2xl p-6 pb-2 flex flex-col items-center gap-2 text-center bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="relative">
            <ScoreRing pct={score} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-black leading-none ${resultColor}`}>{score}%</span>
              <span className="text-foreground/40 text-sm mt-0.5">Score</span>
            </div>
          </div>
          <StarRating score={score} />
          <div>
            <p className={`text-sm font-bold ${resultColor}`}>{resultLabel}</p>
            <p className="text-foreground/50 text-xs ">{resultDesc}</p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {[{ label: "Correct", val: correct, color: "text-emerald-400" }, { label: "Wrong", val: total - correct, color: "text-rose-400" }, { label: "Total", val: total, color: "text-foreground" }].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-4 py-1 rounded-xl bg-foreground/5 border border-foreground/10">
                <span className={`${s.color} font-bold text-lg leading-none`}>{s.val}</span>
                <span className="text-foreground/40 text-[10px] mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-foreground font-bold text-base mb-3">Review Answers</h2>
          <div className="flex flex-col gap-3">
            {quiz.questions.map((q, idx) => (
              <AnswerCard key={q.id} q={q} sel={answers[q.id] ?? []} idx={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE Bottom CTAs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 pb-safe z-40">
        <div className="max-w-[700px] mx-auto w-full flex gap-3 px-2">
          <Button id="quiz-result-home-btn" variant="outline" onClick={() => navigate("/quiz")}
            className="focusable flex-1 h-auto py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 border-border"
          ><Home className="w-4 h-4" /> All Quizzes</Button>
          <Button id="quiz-result-retry-btn" onClick={() => navigate(`/quizzes/${quiz.id}`)}
            className="focusable flex-1 h-auto py-2.5 text-secondary rounded-md font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          ><RotateCcw className="w-4 h-4" /> Try Again</Button>
        </div>
      </div>

      {/* ═══════════ DESKTOP LAYOUT ═══════════ */}
      <div className="hidden md:flex flex-col flex-1 max-w-[1200px] mx-auto w-full px-6 lg:px-10 xl:px-16 py-8">

        {/* Desktop page header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/quiz");
              }
            }}
            className="focusable w-10 h-10 rounded-xl border-border"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quiz Results</h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-lg">{quiz.title}</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-8 lg:gap-10 items-start">

          {/* Left — score hero + CTAs (sticky) */}
          <div className="w-[320px] lg:w-[360px] flex-shrink-0 sticky top-8 flex flex-col gap-0">

            {/* Score card */}
            <Card tabIndex={-1} className="p-8 flex flex-col items-center gap-5 relative overflow-hidden rounded-lg">
              {/* Decorative glow */}
              <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="relative">
                  <ScoreRing pct={score} size={160} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-semibold leading-none ${resultColor}`}>{score}%</span>
                    <span className="text-primary text-xs mt-1">Score</span>
                  </div>
                </div>
                <StarRating score={score} />
                <div className="text-center">
                  <p className={`text-xl font-bold ${resultColor}`}>{resultLabel}</p>
                  <p className="text-muted-foreground text-sm mt-1">{resultDesc}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="w-full grid grid-cols-3 gap-2 border-t border-border  relative z-10">
                {[
                  { label: "Correct", val: correct, color: "text-emerald-400", bg: "bg-foreground/5" },
                  { label: "Wrong", val: total - correct, color: "text-rose-400", bg: "bg-foreground/5" },
                  { label: "Total", val: total, color: "text-primary", bg: "bg-foreground/5" },
                ].map((s) => (
                  <div key={s.label} className={`flex flex-col items-center py-3 rounded-xl ${s.bg}`}>
                    <span className={`${s.color} font-bold text-lg leading-none`}>{s.val}</span>
                    <span className="text-primary text-xs mt-1">{s.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <Button id="quiz-result-retry-btn" onClick={() => navigate(`/quizzes/${quiz.id}`)}
                className="focusable w-full h-10 py-3 rounded-lg font-semibold text-secondary flex items-center justify-center gap-2"
              ><RotateCcw className="w-4 h-4" /> Try Again</Button>
              <Button id="quiz-result-home-btn" variant="outline" onClick={() => navigate("/quiz")}
                className="focusable w-full h-10 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border-border"
              ><Home className="w-4 h-10 rounded-lg" /> All Quizzes</Button>
            </div>
          </div>

          {/* Right — answer review */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">Answer Review</h2>
              <span className="text-sm text-muted-foreground">{correct} of {total} correct</span>
            </div>
            <div className="flex flex-col gap-4">
              {quiz.questions.map((q, idx) => (
                <AnswerCard key={q.id} q={q} sel={answers[q.id] ?? []} idx={idx} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
