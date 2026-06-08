import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { addDocument } from "@/Firebase";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home,
  Star,
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
const ScoreRing = ({ pct }: { pct: number }) => {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  const color =
    pct >= 80 ? "#22c55e" : pct >= 50 ? "#DECB94" : "#ef4444";

  return (
    <svg width="128" height="128" className="-rotate-90">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
};

// ── Star rating ────────────────────────────────────────────────────────────
const StarRating = ({ score }: { score: number }) => {
  const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((s) => (
        <Star
          key={s}
          className={`w-5 h-5 ${s <= stars ? "text-[#DECB94] fill-[#DECB94]" : "text-white/10"}`}
        />
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────
export const QuizResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const user = useSelector((state: RootState) => state.auth.user);
  const savedRef = useRef(false);

  // ── Save result to Firebase quiz_result ─────────────────────
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
          completedAt: Date.now(),
        });
      } catch (err) {
        console.error("Error saving quiz result:", err);
      }
    };

    saveResult();
  }, []);

  if (!state) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Trophy className="w-12 h-12 text-[#DECB94]/40" />
        <p className="text-muted-foreground text-sm text-center">
          No result data found. Please take a quiz first.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="px-5 py-2.5 rounded-xl bg-[#DECB94] text-black text-sm font-bold"
        >
          Browse Quizzes
        </button>
      </div>
    );
  }

  const { quiz, answers, score, correct, total } = state;

  const resultLabel =
    score >= 80 ? "Excellent! 🎉" : score >= 50 ? "Good Job! 👍" : "Keep Trying! 💪";
  const resultDesc =
    score >= 80
      ? "You're a true cinema expert!"
      : score >= 50
        ? "You know your movies well. Practice more!"
        : "Don't give up — review and try again!";

  const resultColor =
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-[#DECB94]" : "text-rose-400";

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
          <h1 className="text-foreground font-bold text-lg">Quiz Results</h1>
        </div>
      </div>

      <div className="flex-1 pt-[64px] pb-28 overflow-y-auto scrollbar-hide">

        {/* ── Score hero ─────────────────────────────────────────────── */}
        <div
          className="mx-4 mt-4 rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
          style={{
            background: "linear-gradient(135deg, #0f0800 0%, #1e1000 50%, #0f0800 100%)",
          }}
        >
          {/* Ring */}
          <div className="relative">
            <ScoreRing pct={score} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black leading-none ${resultColor}`}>{score}%</span>
              <span className="text-white/40 text-[10px] mt-0.5">Score</span>
            </div>
          </div>

          <StarRating score={score} />

          <div>
            <p className={`text-lg font-bold ${resultColor}`}>{resultLabel}</p>
            <p className="text-white/50 text-xs mt-1">{resultDesc}</p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-emerald-400 font-bold text-lg leading-none">{correct}</span>
              <span className="text-white/40 text-[10px] mt-0.5">Correct</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-rose-400 font-bold text-lg leading-none">{total - correct}</span>
              <span className="text-white/40 text-[10px] mt-0.5">Wrong</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-foreground font-bold text-lg leading-none">{total}</span>
              <span className="text-white/40 text-[10px] mt-0.5">Total</span>
            </div>
          </div>
        </div>

        {/* ── Answer review ──────────────────────────────────────────── */}
        <div className="px-4 mt-6">
          <h2 className="text-foreground font-bold text-base mb-3">Review Answers</h2>
          <div className="flex flex-col gap-3">
            {quiz.questions.map((q, idx) => {
              const sel = answers[q.id] ?? [];
              const ca = q.correctAnswers ?? [];
              const isCorrect =
                sel.length === ca.length && ca.every((c) => sel.includes(c));

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 ${
                    isCorrect
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-rose-500/5 border-rose-500/20"
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start gap-2 mb-3">
                    <span className="shrink-0 w-6 h-6 rounded-md bg-white/10 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-foreground text-sm font-semibold leading-snug">
                      {q.text}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt) => {
                      const wasSelected = sel.includes(opt.id);
                      const isOpt = ca.includes(opt.id);

                      let cls =
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ";
                      if (isOpt)
                        cls += "bg-emerald-500/10 text-emerald-400";
                      else if (wasSelected && !isOpt)
                        cls += "bg-rose-500/10 text-rose-400 line-through";
                      else
                        cls += "text-muted-foreground";

                      return (
                        <div key={opt.id} className={cls}>
                          {isOpt ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : wasSelected ? (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {opt.text}
                        </div>
                      );
                    })}
                  </div>

                  {/* Result chip */}
                  <div className="mt-2 flex justify-end">
                    {isCorrect ? (
                      <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Correct
                      </span>
                    ) : (
                      <span className="text-rose-400 text-[10px] font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Incorrect
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom CTAs ────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 pb-safe z-40 flex gap-3">
        <button
          id="quiz-result-home-btn"
          onClick={() => navigate("/profile")}
          className="flex-1 py-3.5 rounded-xl bg-card border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
        >
          <Home className="w-4 h-4" />
          All Quizzes
        </button>
        <button
          id="quiz-result-retry-btn"
          onClick={() => navigate(`/quizzes/${quiz.id}`)}
          className="flex-1 py-3.5 rounded-xl bg-[#DECB94] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#DECB94]/90 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
};
