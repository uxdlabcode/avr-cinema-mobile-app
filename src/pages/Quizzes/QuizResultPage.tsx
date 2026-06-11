import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RootState } from "@/store";
import { addDocument } from "@/Firebase";
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
    <div className={`rounded-xl border p-4 ${isCorrect ? "" : ""}`}>
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

// ── Main ──────────────────────────────────────────────────────────────────
export const QuizResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const user = useSelector((s: RootState) => s.auth.user);
  const savedRef = useRef(false);

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
        <Trophy className="w-12 h-12 text-primary/40" />
        <p className="text-muted-foreground text-sm text-center">No result data found. Please take a quiz first.</p>
        <Button onClick={() => navigate("/profile")} className="rounded-xl px-5 h-auto py-2.5 text-sm font-bold">Browse Quizzes</Button>
      </div>
    );
  }

  const { quiz, answers, score, correct, total } = state;
  const resultLabel = score >= 80 ? "Excellent! 🎉" : score >= 50 ? "Good Job! 👍" : "Keep Trying! 💪";
  const resultDesc = score >= 80 ? "You're a true cinema expert!" : score >= 50 ? "You know your movies well. Practice more!" : "Don't give up — review and try again!";
  const resultColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-primary" : "text-rose-400";
  const ringColor = score >= 80 ? "#22c55e" : score >= 50 ? "var(--primary)" : "#ef4444";

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
        <div className="mx-4 mt-4 rounded-2xl p-6 flex flex-col items-center gap-4 text-center bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="relative">
            <ScoreRing pct={score} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black leading-none ${resultColor}`}>{score}%</span>
              <span className="text-foreground/40 text-[10px] mt-0.5">Score</span>
            </div>
          </div>
          <StarRating score={score} />
          <div>
            <p className={`text-lg font-bold ${resultColor}`}>{resultLabel}</p>
            <p className="text-foreground/50 text-xs mt-1">{resultDesc}</p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {[{ label: "Correct", val: correct, color: "text-emerald-400" }, { label: "Wrong", val: total - correct, color: "text-rose-400" }, { label: "Total", val: total, color: "text-foreground" }].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/10">
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
        <div className="max-w-[700px] mx-auto w-full flex gap-3">
          <Button id="quiz-result-home-btn" variant="outline" onClick={() => navigate("/profile")}
            className="flex-1 h-auto py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border-border"
          ><Home className="w-4 h-4" /> All Quizzes</Button>
          <Button id="quiz-result-retry-btn" onClick={() => navigate(`/quizzes/${quiz.id}`)}
            className="flex-1 h-auto py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
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
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-xl border-border"
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
          <div className="w-[320px] lg:w-[360px] flex-shrink-0 sticky top-8 flex flex-col gap-5">

            {/* Score card */}
            <Card className="p-8 flex flex-col items-center gap-5 relative overflow-hidden rounded-lg">
              {/* Decorative glow */}
              <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none"
              />

              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="relative">
                  <ScoreRing pct={score} size={160} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-semibold leading-none ${resultColor}`}>{score}%</span>
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
              <div className="w-full grid grid-cols-3 gap-3 border-t border-border pt-5 relative z-10">
                {[
                  { label: "Correct", val: correct, color: "text-emerald-400", bg: "bg-emerald-500/8" },
                  { label: "Wrong", val: total - correct, color: "text-rose-400", bg: "bg-rose-500/8" },
                  { label: "Total", val: total, color: "text-primary", bg: "bg-muted/50" },
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
                className="w-full h-10 py-3 rounded-lg font-semibold text-secondary flex items-center justify-center gap-2"
              ><RotateCcw className="w-4 h-4" /> Try Again</Button>
              <Button id="quiz-result-home-btn" variant="outline" onClick={() => navigate("/profile")}
                className="w-full h-10 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border-border"
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
