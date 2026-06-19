import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchQuizzes } from "@/store/slices/quizSlice";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Clock, HelpCircle, Trophy, Search,
  ChevronRight, Zap, Film, Tv, Star, BookOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────
interface QuizOption { id: string; text: string; }
interface QuizQuestion {
  id: string; text: string; options: QuizOption[];
  correctAnswers: string[]; points?: number; type?: "single" | "multiselect";
}
export interface Quiz {
  id: string; title: string; description: string; category: string;
  duration: number; questions: QuizQuestion[]; createdAt: string;
}

const CategoryIcon = ({ category }: { category: string }) => {
  const lower = category.toLowerCase();
  if (lower.includes("movie") || lower.includes("cinema") || lower.includes("film")) return <Film className="w-3.5 h-3.5" />;
  if (lower.includes("tv") || lower.includes("television") || lower.includes("series") || lower.includes("show")) return <Tv className="w-3.5 h-3.5" />;
  if (lower.includes("trivia")) return <Star className="w-3.5 h-3.5" />;
  return <Zap className="w-3.5 h-3.5" />;
};

const getCategoryColor = (category: string): string => {
  const lower = category.toLowerCase();
  if (lower.includes("movie") || lower.includes("cinema") || lower.includes("film")) return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  if (lower.includes("tv") || lower.includes("television") || lower.includes("series") || lower.includes("show")) return "bg-blue-500/15 text-blue-400 border-blue-500/20";
  if (lower.includes("trivia")) return "bg-purple-500/15 text-purple-400 border-purple-500/20";
  return "bg-amber-500/15 text-amber-400 border-amber-500/20";
};

// ── Skeleton ─────────────────────────────────────────────────────────────
// Single quiz list-card skeleton — icon + title + description + 2 chips
const SkeletonCard = () => (
  <div className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-center">
    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 rounded w-3/4" />
      <Skeleton className="h-3 rounded w-full" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  </div>
);

/**
 * Full-page skeleton that mirrors the EXACT Quizzes page layout:
 * Mobile: fixed header → hero banner (trophy + stats) → search bar → quiz cards
 * Desktop: back btn + title + stat cards → search + filter chips → 2-3 col grid
 */
export const QuizzesPageSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background animate-pulse">

    {/* ── MOBILE skeleton ── */}
    <div className="md:hidden">
      {/* Fixed mobile header: back arrow + "Quizzes" title */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
          <Skeleton className="absolute left-4 w-9 h-9 rounded-full" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="pt-[64px] pb-24 px-4 space-y-4 max-w-[700px] mx-auto w-full">
        {/* Hero banner — gradient card with trophy icon + title + 3 stat counters */}
        <div className="mt-4 rounded-2xl overflow-hidden p-5 bg-muted/20 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3.5 w-28 rounded" />
          </div>
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          {/* Stat counters: Quizzes | Questions | Categories */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-6 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* Search input */}
        <Skeleton className="w-full h-9 rounded-md" />

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-hidden">
          {[56, 40, 64, 72, 52].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-lg shrink-0" style={{ width: w }} />
          ))}
        </div>

        {/* Quiz list cards */}
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>

    {/* ── DESKTOP skeleton ── */}
    <div className="hidden md:flex flex-col flex-1 max-w-[1400px] mx-auto w-full px-6 lg:px-10 xl:px-16 py-8 gap-6">
      {/* Desktop header row: back btn + title + 3 stat cards */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-24 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </div>
        {/* 3 stat mini-cards */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-border min-w-[80px]">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Search bar + filter chips row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-11 w-full max-w-sm rounded-md" />
        <div className="flex items-center gap-2">
          {[40, 64, 56, 80, 52].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Quiz 2-3 col grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  </div>
);

// ── Quiz Card ─────────────────────────────────────────────────────────────
const QuizCard = ({ quiz, onClick, tabIndex }: { quiz: Quiz; onClick: () => void; tabIndex?: number }) => {
  const qCount = quiz.questions?.length ?? 0;
  const catColor = getCategoryColor(quiz.category);
  return (
    <button
      id={`quiz-card-${quiz.id}`}
      onClick={onClick}
      tabIndex={tabIndex}
      className="focusable w-full text-left flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:bg-foreground/[0.03] transition-all active:scale-[0.98] group outline-none"
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
        <Trophy className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-foreground font-semibold text-sm leading-tight truncate">{quiz.title}</h3>
        {quiz.description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{quiz.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor}`}>
            <CategoryIcon category={quiz.category} />{quiz.category}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />{quiz.duration} mins
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <HelpCircle className="w-3 h-3" />{qCount} {qCount === 1 ? "question" : "questions"}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const QuizzesPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const quizzes = useSelector((state: RootState) => state.quiz.items);
  const quizStatus = useSelector((state: RootState) => state.quiz.status);
  const quizError = useSelector((state: RootState) => state.quiz.error);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    if (quizStatus === "idle") {
      dispatch(fetchQuizzes());
    }
  }, [quizStatus, dispatch]);

  const loading = quizStatus === "loading" || quizStatus === "idle";
  const error = quizError;

  const categories = ["All", ...Array.from(new Set(quizzes.map((q) => q.category)))];
  const filtered = quizzes.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === "All" || q.category === selectedCategory;
    return matchSearch && matchCategory;
  });
  const totalQuestions = quizzes.reduce((acc, q) => acc + (q.questions?.length ?? 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ═══ MOBILE Header (fixed) ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
          <Button
            variant="outline"
            size="icon"
            id="quizzes-back-btn"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/dashboard");
              }
            }}
            className="focusable w-9 h-9 rounded-full z-10 border-border focus:bg-zinc-850"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Button>
          <h1 className="text-foreground font-bold text-lg">Quizzes</h1>
        </div>
      </div>

      {/* ═══ MOBILE Body ═══ */}
      <div className="md:hidden flex-1 pt-[64px] pb-24 overflow-y-auto scrollbar-hide max-w-[700px] mx-auto w-full">
        {/* Hero banner */}
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><Trophy className="w-4 h-4 text-primary" /></div>
              <span className="text-primary text-xs font-semibold tracking-widest uppercase">Cinema Trivia</span>
            </div>
            <h2 className="text-foreground font-bold text-xl leading-tight mb-1">Test Your Movie Knowledge</h2>
            <p className="text-foreground/50 text-xs leading-relaxed mb-4">Challenge yourself with quizzes on movies, TV shows & more!</p>
            <div className="flex items-center gap-4">
              <div className="flex flex-col"><span className="text-primary font-bold text-lg">{loading ? "—" : quizzes.length}</span><span className="text-foreground/40 text-[10px]">Quizzes</span></div>
              <div className="w-px h-8 bg-foreground/10" />
              <div className="flex flex-col"><span className="text-primary font-bold text-lg">{loading ? "—" : totalQuestions}</span><span className="text-foreground/40 text-[10px]">Questions</span></div>
              <div className="w-px h-8 bg-foreground/10" />
              <div className="flex flex-col"><span className="text-primary font-bold text-lg">{loading ? "—" : categories.length - 1}</span><span className="text-foreground/40 text-[10px]">Categories</span></div>
            </div>
          </div>
        </div>
        <div className="px-4 mt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search quiz..."
              className="w-full h-9 "
            />
          </div>
        </div>
        {!loading && categories.length > 1 && (
          <div className="mt-4 px-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? "default" : "outline"}
                className={`focusable shrink-0 rounded-lg text-secondary text-xs font-semibold h-8 px-4 focus:scale-102 ${selectedCategory !== cat ? "border-border text-muted-foreground hover:border-primary/40 hover:bg-card" : ""}`}
              >{cat}</Button>
            ))}
          </div>
        )}
        <div className="px-4 mt-5 flex flex-col gap-3">
          {/* MOBILE loading state: full page skeleton */}
          {loading && <QuizzesPageSkeleton />}
          {error && !loading && <div className="flex flex-col items-center py-16 gap-3"><HelpCircle className="w-7 h-7 text-rose-400" /><p className="text-muted-foreground text-sm">{error}</p></div>}
          {!loading && !error && filtered.length === 0 && <div className="flex flex-col items-center py-16 gap-3"><Trophy className="w-7 h-7 text-primary/40" /><p className="text-muted-foreground text-sm text-center">{searchQuery || selectedCategory !== "All" ? "No quizzes match your filters." : "No quizzes available yet."}</p></div>}
          {!loading && !error && filtered.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} tabIndex={-1} onClick={() => navigate(`/quizzes/${quiz.id}`)} />)}
        </div>
      </div>

      {/* ═══════════ DESKTOP LAYOUT ═══════════ */}
      <div className="hidden md:flex flex-col flex-1 max-w-[1400px] mx-auto w-full px-6 lg:px-10 xl:px-16 py-8">

        {/* Desktop header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="focusable w-10 h-10 rounded-xl border-border outline-none"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Test your cinema knowledge</p>
            </div>
          </div>

          <div className="flex items-center !gap-1.5">
            {[
              { label: "Total Quizzes", value: loading ? "—" : quizzes.length, icon: <Trophy className="w-4 h-4 text-primary" /> },
              { label: "Questions", value: loading ? "—" : totalQuestions, icon: <HelpCircle className="w-4 h-4 text-primary" /> },
              { label: "Categories", value: loading ? "—" : categories.length - 1, icon: <BookOpen className="w-4 h-4 text-primary" /> },
            ].map((s) => (
              <Card
                key={s.label}
                tabIndex={-1}
                className="flex flex-col p-2.5 !gap-1 rounded-md items-center justify-center min-w-[80px]"
              >
                <div className="flex items-center justify-center gap-1.5 !pb-0 !mb-0">
                  {s.icon}
                  <p className="text-foreground text-sm font-bold leading-none">
                    {s.value}
                  </p>
                </div>

                <p className="text-muted-foreground text-[10px] leading-none text-center">
                  {s.label}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Search + filters row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 hap-3 max-w-sm">
            {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> */}
            <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search quizzes..."
              className="focusable w-full h-11 focus:bg-zinc-800"
            />
          </div>
          {!loading && categories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className={`focusable rounded-lg text-sm font-semibold text-secondary  h-auto py-2 px-4 outline-none ${selectedCategory !== cat ? "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card" : ""}`}
                >{cat}</Button>
              ))}
            </div>
          )}
        </div>

        {/* Quiz grid */}
        {/* Desktop loading state: full page skeleton */}
        {loading && <QuizzesPageSkeleton />}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <HelpCircle className="w-10 h-10 text-rose-400/50" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} className="focusable rounded-md px-5 py-2.5 h-auto text-sm font-semibold focus:scale-102">Retry</Button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
            <Trophy className="w-14 h-14 text-primary/20" />
            <p className="text-muted-foreground text-lg">{searchQuery || selectedCategory !== "All" ? "No quizzes match your filters." : "No quizzes available yet."}</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} tabIndex={-1} onClick={() => navigate(`/quizzes/${quiz.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
};
