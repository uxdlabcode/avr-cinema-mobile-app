import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { getDocumentData } from "@/Firebase/CloudFirestore/GetData";
import type { Quiz } from "./QuizzesPage";

// ── Main Component ────────────────────────────────────────────────────────
export const QuizDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  // Map: questionId → selected option ids[]
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);

  // ── Fetch quiz ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const fetchQuiz = async () => {
      try {
        const data = await getDocumentData("quizzes", id);
        if (!data) { setError("Quiz not found."); return; }
        setQuiz(data as unknown as Quiz);
      } catch {
        setError("Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleFinish = () => {
    setFinished(true);
    setStarted(false);
  };

  // ── Answer selection ──────────────────────────────────────────────────
  const currentQ = quiz?.questions[currentIdx];
  const isMulti = currentQ?.type === "multiselect";

  const toggleOption = (optId: string) => {
    if (showFeedback || !currentQ) return;
    const prev = answers[currentQ.id] ?? [];
    if (isMulti) {
      setAnswers((a) => ({
        ...a,
        [currentQ.id]: prev.includes(optId)
          ? prev.filter((o) => o !== optId)
          : [...prev, optId],
      }));
    } else {
      setAnswers((a) => ({ ...a, [currentQ.id]: [optId] }));
    }
  };

  const handleConfirmAnswer = () => {
    if (!currentQ) return;
    const selected = answers[currentQ.id] ?? [];
    if (selected.length === 0) return;
    handleNext();
  };

  const handleNext = () => {
    if (!quiz) return;
    setShowFeedback(false);
    if (currentIdx + 1 >= quiz.questions.length) {
      handleFinish();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  // ── Score calculation ─────────────────────────────────────────────────
  const calcScore = () => {
    if (!quiz) return { score: 0, total: 0, correct: 0 };
    let correct = 0;
    const total = quiz.questions.length;
    quiz.questions.forEach((q) => {
      const sel = answers[q.id] ?? [];
      const ca = q.correctAnswers ?? [];
      const isCorrect =
        sel.length === ca.length && ca.every((c) => sel.includes(c));
      if (isCorrect) correct++;
    });
    return { score: Math.round((correct / total) * 100), correct, total };
  };

  // ── Navigate to results ───────────────────────────────────────────────
  useEffect(() => {
    if (finished && quiz) {
      const { score, correct, total } = calcScore();
      navigate(`/quizzes/${id}/result`, {
        state: { quiz, answers, score, correct, total },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#DECB94] border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Loading quiz…</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-muted-foreground text-sm text-center">{error ?? "Something went wrong."}</p>
        <button
          onClick={() => navigate("/profile")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#DECB94] text-black text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ─── Intro screen ─────────────────────────────────────────────────────
  if (!started) {
    const qCount = quiz.questions?.length ?? 0;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
            <button
              id="quiz-detail-back-btn"
              onClick={() => navigate("/profile")}
              className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <h1 className="text-foreground font-bold text-lg line-clamp-1 px-12 text-center">
              {quiz.title}
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 pt-[64px] pb-8 flex flex-col gap-6 px-4 overflow-y-auto scrollbar-hide">
          {/* Hero */}
          <div
            className="mt-4 rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
            style={{ background: "linear-gradient(135deg, #1a0a00, #2d1200, #1a0a00)" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-[#DECB94]/15 flex items-center justify-center border border-[#DECB94]/20">
              <Trophy className="w-8 h-8 text-[#DECB94]" />
            </div>
            <h2 className="text-white font-bold text-xl">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-white/50 text-sm leading-relaxed">{quiz.description}</p>
            )}
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <HelpCircle className="w-5 h-5 text-[#DECB94]" />, value: qCount, label: "Questions" },
              { icon: <Trophy className="w-5 h-5 text-[#DECB94]" />, value: quiz.category, label: "Category" },
            ].map(({ icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border"
              >
                {icon}
                <span className="text-foreground font-bold text-sm leading-none text-center">{value}</span>
                <span className="text-muted-foreground text-[10px]">{label}</span>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <h3 className="text-foreground font-semibold text-sm">How to Play</h3>
            {[
              "Read each question carefully.",
              "Select the correct answer(s) and tap Confirm.",
              `Answer all ${qCount} questions to complete the quiz.`,
              "Your final score will be shown at the end.",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#DECB94]/15 text-[#DECB94] text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-muted-foreground text-sm">{tip}</p>
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            id="quiz-start-btn"
            onClick={() => setStarted(true)}
            className="w-full py-4 rounded-2xl bg-[#DECB94] text-black font-bold text-base hover:bg-[#DECB94]/90 transition-all active:scale-[0.98]"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // ─── Active quiz screen ───────────────────────────────────────────────
  if (!currentQ) return null;

  const selectedOptions = answers[currentQ.id] ?? [];
  const isCorrect = (optId: string) => (currentQ.correctAnswers ?? []).includes(optId);
  const isSelected = (optId: string) => selectedOptions.includes(optId);
  const hasSelected = selectedOptions.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Fixed header — with back button + progress */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="px-4 pt-4 pb-3">
          {/* Top row: back + title + counter */}
          <div className="flex items-center gap-3 mb-3">
            <button
              id="quiz-active-back-btn"
              onClick={() => navigate("/profile")}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm line-clamp-1">{quiz.title}</p>
            </div>
            <span className="shrink-0 text-muted-foreground text-xs font-medium bg-card border border-border px-2.5 py-1 rounded-full">
              {currentIdx + 1} / {quiz.questions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(currentIdx / quiz.questions.length) * 100}%`,
                background: "linear-gradient(90deg, #DECB94, #c9a84c)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable body — pb accounts for bottom button */}
      <div className="flex-1 pt-[88px] pb-28 px-4 overflow-y-auto scrollbar-hide">
        {/* Question card */}
        <div className="mt-4 rounded-2xl bg-card border border-border p-5">
          <div className="flex items-start gap-3 mb-2">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-[#DECB94]/15 border border-[#DECB94]/20 text-[#DECB94] text-xs font-bold flex items-center justify-center mt-0.5">
              {currentIdx + 1}
            </span>
            <p className="text-foreground font-semibold text-base leading-snug">
              {currentQ.text}
            </p>
          </div>
          {isMulti && (
            <p className="text-xs text-[#DECB94] mt-2 font-medium pl-10">
              ★ Select all correct answers
            </p>
          )}
        </div>

        {/* Options */}
        <div className="mt-4 flex flex-col gap-3">
          {currentQ.options.map((opt) => {
            const sel = isSelected(opt.id);
            const correct = isCorrect(opt.id);

            let base =
              "w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98] ";

            if (showFeedback) {
              if (correct)
                base += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
              else if (sel && !correct)
                base += "bg-rose-500/10 border-rose-500/40 text-rose-400";
              else
                base += "bg-card border-border text-muted-foreground";
            } else {
              base += sel
                ? "bg-[#DECB94]/10 border-[#DECB94]/50 text-[#DECB94]"
                : "bg-card border-border text-foreground hover:border-[#DECB94]/30 hover:bg-white/[0.02]";
            }

            return (
              <button
                key={opt.id}
                id={`option-${opt.id}`}
                onClick={() => toggleOption(opt.id)}
                className={base}
                disabled={showFeedback}
              >
                {/* Radio / check indicator */}
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    showFeedback
                      ? correct
                        ? "border-emerald-400"
                        : sel
                          ? "border-rose-400"
                          : "border-border"
                      : sel
                        ? "border-[#DECB94] bg-[#DECB94]"
                        : "border-border"
                  }`}
                >
                  {showFeedback && correct && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {showFeedback && sel && !correct && (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {!showFeedback && sel && (
                    <span className="w-2 h-2 rounded-full bg-black" />
                  )}
                </span>
                <span className="text-sm font-medium leading-snug">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA — sits at the bottom of the screen */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 pb-safe z-40">
        {!showFeedback ? (
          <button
            id="quiz-confirm-btn"
            onClick={handleConfirmAnswer}
            disabled={!hasSelected}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
              hasSelected
                ? "bg-[#DECB94] text-black hover:bg-[#DECB94]/90 active:scale-[0.98]"
                : "bg-white/5 text-muted-foreground cursor-not-allowed"
            }`}
          >
            Confirm Answer
          </button>
        ) : (
          <button
            id="quiz-next-btn"
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl font-bold text-base bg-[#DECB94] text-black hover:bg-[#DECB94]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {currentIdx + 1 >= quiz.questions.length ? "See Results" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
