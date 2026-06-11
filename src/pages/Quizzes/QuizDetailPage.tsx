import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, HelpCircle, CheckCircle2, XCircle,
  ChevronRight, Trophy, AlertCircle, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDocumentData } from "@/Firebase/CloudFirestore/GetData";
import type { Quiz } from "./QuizzesPage";

// ── Main Component ────────────────────────────────────────────────────────
export const QuizDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchQuiz = async () => {
      try {
        const data = await getDocumentData("quizzes", id);
        if (!data) { setError("Quiz not found."); return; }
        setQuiz(data as unknown as Quiz);
      } catch { setError("Failed to load quiz."); }
      finally { setLoading(false); }
    };
    fetchQuiz();
  }, [id]);

  const handleFinish = () => { setFinished(true); setStarted(false); };

  const currentQ = quiz?.questions[currentIdx];
  const isMulti = currentQ?.type === "multiselect";

  const toggleOption = (optId: string) => {
    if (showFeedback || !currentQ) return;
    const prev = answers[currentQ.id] ?? [];
    if (isMulti) {
      setAnswers((a) => ({ ...a, [currentQ.id]: prev.includes(optId) ? prev.filter((o) => o !== optId) : [...prev, optId] }));
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
    if (currentIdx + 1 >= quiz.questions.length) handleFinish();
    else setCurrentIdx((i) => i + 1);
  };

  const calcScore = () => {
    if (!quiz) return { score: 0, total: 0, correct: 0 };
    let correct = 0;
    const total = quiz.questions.length;
    quiz.questions.forEach((q) => {
      const sel = answers[q.id] ?? [];
      const ca = q.correctAnswers ?? [];
      if (sel.length === ca.length && ca.every((c) => sel.includes(c))) correct++;
    });
    return { score: Math.round((correct / total) * 100), correct, total };
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Loading quiz…</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-muted-foreground text-sm text-center">{error ?? "Something went wrong."}</p>
        <Button onClick={() => navigate("/profile")} className="mt-2 rounded-xl px-5 h-auto py-2.5 text-sm font-semibold">Go Back</Button>
      </div>
    );
  }

  const qCount = quiz.questions?.length ?? 0;

  // ─── Intro screen ─────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col bg-background">

        {/* MOBILE Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
          <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
            <Button 
              variant="outline"
              size="icon"
              id="quiz-detail-back-btn" 
              onClick={() => navigate("/profile")}
              className="absolute left-4 w-9 h-9 rounded-full border-border"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <h1 className="text-foreground font-bold text-lg line-clamp-1 px-12 text-center">{quiz.title}</h1>
          </div>
        </div>

        {/* MOBILE Body */}
        <div className="md:hidden flex-1 pt-[64px] pb-8 flex flex-col gap-6 px-4 overflow-y-auto scrollbar-hide max-w-[700px] mx-auto w-full">
          <div className="mt-4 rounded-2xl p-6 flex flex-col items-center gap-3 text-center bg-gradient-to-br from-background via-muted/30 to-background">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20"><Trophy className="w-8 h-8 text-primary" /></div>
            <h2 className="text-white font-bold text-xl">{quiz.title}</h2>
            {quiz.description && <p className="text-white/50 text-sm leading-relaxed">{quiz.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <HelpCircle className="w-5 h-5 text-primary" />, value: qCount, label: "Questions" },
              { icon: <Trophy className="w-5 h-5 text-primary" />, value: quiz.category, label: "Category" },
            ].map(({ icon, value, label }) => (
              <Card key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl">
                {icon}<span className="text-foreground font-bold text-sm text-center">{value}</span>
                <span className="text-muted-foreground text-[10px]">{label}</span>
              </Card>
            ))}
          </div>
          <Card className="rounded-xl p-4 space-y-3">
            <h3 className="text-foreground font-semibold text-sm">How to Play</h3>
            {["Read each question carefully.", "Select the correct answer(s) and tap Confirm.", `Answer all ${qCount} questions to complete the quiz.`, "Your final score will be shown at the end."].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <p className="text-muted-foreground text-sm">{tip}</p>
              </div>
            ))}
          </Card>
          <Button id="quiz-start-btn" onClick={() => setStarted(true)}
            className="w-full h-auto py-4 rounded-2xl font-bold text-base active:scale-[0.98]"
          >Start Quiz</Button>
        </div>

        {/* ═══════════ DESKTOP INTRO ═══════════ */}
        <div className="hidden md:flex flex-1 max-w-[1100px] mx-auto w-full px-6 lg:px-10 py-8 gap-8">
          {/* Left column — quiz info */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Back + title */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-xl border-border flex-shrink-0"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
              </Button>
              <div>
                <p className="text-muted-foreground text-sm">Quiz</p>
                <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
              </div>
            </div>

            {/* Hero banner */}
            <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-background via-muted/30 to-background">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
              <div className="relative z-10 p-8 flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-2xl leading-tight">{quiz.title}</h2>
                  {quiz.description && <p className="text-white/55 text-sm mt-2 leading-relaxed max-w-lg">{quiz.description}</p>}
                  <div className="flex items-center gap-4 mt-4">
                    <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
                      <HelpCircle className="w-4 h-4" />{qCount} Questions
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
                      <Clock className="w-4 h-4" />{quiz.duration} min
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white/50 text-sm">
                      {quiz.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* How to play */}
            <Card className="rounded-2xl p-6">
              <h3 className="text-foreground font-semibold text-base mb-4">How to Play</h3>
              <div className="grid grid-cols-2 gap-4">
                {["Read each question carefully.", "Select correct answer(s) and click Confirm.", `Answer all ${qCount} questions to complete.`, "Your score is shown at the end."].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-muted-foreground text-sm leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column — start card */}
          <div className="w-[300px] lg:w-[340px] flex-shrink-0 self-start sticky top-8">
            <Card className="rounded-2xl p-6 flex flex-col gap-5">
              <h3 className="text-foreground font-bold text-lg">Ready to start?</h3>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Questions", value: qCount, icon: <HelpCircle className="w-4 h-4 text-primary" /> },
                  { label: "Duration", value: `${quiz.duration}m`, icon: <Clock className="w-4 h-4 text-primary" /> },
                  { label: "Category", value: quiz.category, icon: <Trophy className="w-4 h-4 text-primary" /> },
                  { label: "Type", value: "Mixed", icon: <ChevronRight className="w-4 h-4 text-primary" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                    {icon}
                    <div>
                      <p className="text-muted-foreground text-[10px]">{label}</p>
                      <p className="text-foreground text-sm font-semibold truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button id="quiz-start-btn" onClick={() => setStarted(true)}
                className="w-full h-auto py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" /> Start Quiz
              </Button>
              <p className="text-muted-foreground text-xs text-center">You can retake this quiz anytime</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active quiz screen ───────────────────────────────────────────────
  if (!currentQ) return null;

  const selectedOptions = answers[currentQ.id] ?? [];
  const isCorrectOpt = (optId: string) => (currentQ.correctAnswers ?? []).includes(optId);
  const isSelected = (optId: string) => selectedOptions.includes(optId);
  const hasSelected = selectedOptions.length > 0;
  const progress = ((currentIdx) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* MOBILE Fixed header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="px-4 pt-4 pb-3 max-w-[700px] mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button 
              variant="outline"
              size="icon"
              id="quiz-active-back-btn" 
              onClick={() => navigate("/profile")}
              className="shrink-0 w-9 h-9 rounded-full border-border"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <div className="flex-1 min-w-0"><p className="text-foreground font-semibold text-sm line-clamp-1">{quiz.title}</p></div>
            <span className="shrink-0 text-muted-foreground text-xs font-medium bg-card border border-border px-2.5 py-1 rounded-full">{currentIdx + 1} / {quiz.questions.length}</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* MOBILE Scrollable body */}
      <div className="md:hidden flex-1 pt-[88px] pb-28 px-4 overflow-y-auto scrollbar-hide max-w-[700px] mx-auto w-full">
        <Card className="mt-4 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-2">
            <span className="shrink-0 w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{currentIdx + 1}</span>
            <p className="text-foreground font-semibold text-base leading-snug">{currentQ.text}</p>
          </div>
          {isMulti && <p className="text-xs text-primary mt-2 font-medium pl-10">★ Select all correct answers</p>}
        </Card>
        <div className="mt-4 flex flex-col gap-3">
          {currentQ.options.map((opt) => {
            const sel = isSelected(opt.id);
            const correct = isCorrectOpt(opt.id);
            let base = "w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98] ";
            if (showFeedback) {
              if (correct) base += "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
              else if (sel && !correct) base += "bg-rose-500/10 border-rose-500/40 text-rose-400";
              else base += "bg-card border-border text-muted-foreground";
            } else {
              base += sel ? "bg-primary/10 border-primary/50 text-primary" : "bg-card border-border text-foreground hover:border-primary/30 hover:bg-foreground/[0.02]";
            }
            return (
              <button key={opt.id} id={`option-${opt.id}`} onClick={() => toggleOption(opt.id)} className={base} disabled={showFeedback}>
                <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${showFeedback ? correct ? "border-emerald-400" : sel ? "border-rose-400" : "border-border" : sel ? "border-primary bg-primary" : "border-border"}`}>
                  {showFeedback && correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {showFeedback && sel && !correct && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {!showFeedback && sel && <span className="w-2 h-2 rounded-full bg-background" />}
                </span>
                <span className="text-sm font-medium leading-snug">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE Bottom CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 pb-safe z-40">
        <div className="max-w-[700px] mx-auto w-full">
          {!showFeedback ? (
            <Button id="quiz-confirm-btn" onClick={handleConfirmAnswer} disabled={!hasSelected}
              className="w-full h-auto py-3.5 rounded-xl font-bold text-base active:scale-[0.98]"
            >Confirm Answer</Button>
          ) : (
            <Button id="quiz-next-btn" onClick={handleNext}
              className="w-full h-auto py-3.5 rounded-xl font-bold text-base active:scale-[0.98] flex items-center justify-center gap-2"
            >{currentIdx + 1 >= quiz.questions.length ? "See Results" : "Next Question"}<ChevronRight className="w-4 h-4" /></Button>
          )}
        </div>
      </div>

      {/* ═══════════ DESKTOP ACTIVE QUIZ ═══════════ */}
      <div className="hidden md:flex flex-1 max-w-[1100px] mx-auto w-full px-6 lg:px-10 py-8 gap-8">

        {/* Left — question + options */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Desktop header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")} 
              className="w-10 h-10 rounded-xl border-border flex-shrink-0"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
            </Button>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm truncate">{quiz.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm text-muted-foreground font-medium shrink-0">{currentIdx + 1} / {quiz.questions.length}</span>
              </div>
            </div>
          </div>

          {/* Question card */}
          <Card className="rounded-2xl p-7">
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 text-primary text-sm font-bold flex items-center justify-center mt-0.5">{currentIdx + 1}</span>
              <div>
                <p className="text-foreground font-semibold text-lg leading-snug">{currentQ.text}</p>
                {isMulti && <p className="text-sm text-primary mt-2 font-medium">★ Select all correct answers</p>}
              </div>
            </div>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt) => {
              const sel = isSelected(opt.id);
              const correct = isCorrectOpt(opt.id);
              let base = "w-full text-left flex items-center gap-4 p-5 rounded-xl border transition-all cursor-pointer ";
              if (showFeedback) {
                if (correct) base += "bg-emerald-500/8 border-emerald-500/40 text-emerald-400";
                else if (sel && !correct) base += "bg-rose-500/8 border-rose-500/40 text-rose-400";
                else base += "bg-card border-border text-muted-foreground";
              } else {
                base += sel ? "bg-primary/8 border-primary/50 text-primary" : "bg-card border-border text-foreground hover:border-primary/30 hover:bg-foreground/[0.02]";
              }
              return (
                <button key={opt.id} id={`option-${opt.id}`} onClick={() => toggleOption(opt.id)} className={base} disabled={showFeedback}>
                  <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${showFeedback ? correct ? "border-emerald-400" : sel ? "border-rose-400" : "border-border" : sel ? "border-primary bg-primary" : "border-border"}`}>
                    {showFeedback && correct && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {showFeedback && sel && !correct && <XCircle className="w-4 h-4 text-rose-400" />}
                    {!showFeedback && sel && <span className="w-2.5 h-2.5 rounded-full bg-background" />}
                  </span>
                  <span className="text-base font-medium leading-snug">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — confirm panel */}
        <div className="w-[280px] lg:w-[300px] flex-shrink-0 self-start sticky top-8">
          <Card className="rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-foreground font-bold text-base">Question {currentIdx + 1} of {quiz.questions.length}</h3>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-sm text-muted-foreground">
              {hasSelected ? <span className="text-foreground font-medium">{selectedOptions.length} answer{selectedOptions.length > 1 ? "s" : ""} selected</span> : "Select an answer to continue"}
            </div>
            {!showFeedback ? (
              <Button id="quiz-confirm-btn" onClick={handleConfirmAnswer} disabled={!hasSelected}
                className="w-full h-auto py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >Confirm Answer</Button>
            ) : (
              <Button id="quiz-next-btn" onClick={handleNext}
                className="w-full h-auto py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >{currentIdx + 1 >= quiz.questions.length ? "See Results" : "Next Question"}<ChevronRight className="w-4 h-4" /></Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
