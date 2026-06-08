import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Trophy,
  Search,
  ChevronRight,
  Zap,
  Film,
  Tv,
  Star,
} from "lucide-react";
import { getCollectionData } from "@/Firebase/CloudFirestore/GetData";

// ── Types ──────────────────────────────────────────────────────────────────
interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctAnswers: string[];
  points?: number;
  type?: "single" | "multiselect";
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  questions: QuizQuestion[];
  createdAt: string;
}

// ── Category icon helper ───────────────────────────────────────────────────
const CategoryIcon = ({ category }: { category: string }) => {
  const lower = category.toLowerCase();
  if (lower.includes("movie") || lower.includes("cinema") || lower.includes("film")) {
    return <Film className="w-3.5 h-3.5" />;
  }
  if (lower.includes("tv") || lower.includes("television") || lower.includes("series") || lower.includes("show")) {
    return <Tv className="w-3.5 h-3.5" />;
  }
  if (lower.includes("trivia")) {
    return <Star className="w-3.5 h-3.5" />;
  }
  return <Zap className="w-3.5 h-3.5" />;
};

// ── Category colour helper ─────────────────────────────────────────────────
const getCategoryColor = (category: string): string => {
  const lower = category.toLowerCase();
  if (lower.includes("movie") || lower.includes("cinema") || lower.includes("film")) {
    return "bg-rose-500/15 text-rose-400 border-rose-500/20";
  }
  if (lower.includes("tv") || lower.includes("television") || lower.includes("series") || lower.includes("show")) {
    return "bg-blue-500/15 text-blue-400 border-blue-500/20";
  }
  if (lower.includes("trivia")) {
    return "bg-purple-500/15 text-purple-400 border-purple-500/20";
  }
  return "bg-amber-500/15 text-amber-400 border-amber-500/20";
};

// ── Skeleton ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse bg-white/5 rounded-2xl p-4 flex gap-4 items-center">
    <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/10 rounded w-full" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 w-20 bg-white/10 rounded-full" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
export const QuizzesPage = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // ── Fetch from Firebase ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const data = await getCollectionData("quizzes");
        setQuizzes(data as unknown as Quiz[]);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
        setError("Failed to load quizzes. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
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

      {/* ── Fixed Header ───────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
          <button
            id="quizzes-back-btn"
            onClick={() => navigate("/dashboard")}
            className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-white/10 transition-colors z-10"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-foreground font-bold text-lg">Quiz</h1>
        </div>
      </div>

      {/* ── Scrollable Body ────────────────────────────────────────────── */}
      <div className="flex-1 pt-[64px] pb-24 overflow-y-auto scrollbar-hide">

        {/* Hero banner */}
        <div
          className="mx-4 mt-4 rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #1a0a00 0%, #2d1200 50%, #1a0a00 100%)",
          }}
        >
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#DECB94]/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[#DECB94]/5 blur-xl pointer-events-none" />

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#DECB94]/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#DECB94]" />
              </div>
              <span className="text-[#DECB94] text-xs font-semibold tracking-widest uppercase">
                Cinema Trivia
              </span>
            </div>
            <h2 className="text-white font-bold text-xl leading-tight mb-1">
              Test Your Movie Knowledge
            </h2>
            <p className="text-white/50 text-xs leading-relaxed mb-4">
              Challenge yourself with quizzes on movies, TV shows & more!
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[#DECB94] font-bold text-lg leading-none">
                  {loading ? "—" : quizzes.length}
                </span>
                <span className="text-white/40 text-[10px] mt-0.5">Quizzes</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[#DECB94] font-bold text-lg leading-none">
                  {loading ? "—" : totalQuestions}
                </span>
                <span className="text-white/40 text-[10px] mt-0.5">Questions</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[#DECB94] font-bold text-lg leading-none">
                  {loading ? "—" : categories.length - 1}
                </span>
                <span className="text-white/40 text-[10px] mt-0.5">Categories</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="px-4 mt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quiz..."
              className="w-full h-11 pl-10 pr-4 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#DECB94]/40"
            />
          </div>
        </div>

        {/* ── Category chips ──────────────────────────────────────────────── */}
        {!loading && categories.length > 1 && (
          <div className="mt-4 px-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedCategory === cat
                    ? "bg-[#DECB94] text-black border-[#DECB94]"
                    : "bg-card border-border text-muted-foreground hover:border-[#DECB94]/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Quiz list ──────────────────────────────────────────────────── */}
        <div className="px-4 mt-5 flex flex-col gap-3">

          {/* Loading skeletons */}
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center">
                <HelpCircle className="w-7 h-7 text-rose-400" />
              </div>
              <p className="text-muted-foreground text-sm text-center">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-[#DECB94] text-black text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-[#DECB94]/40" />
              </div>
              <p className="text-muted-foreground text-sm text-center">
                {searchQuery || selectedCategory !== "All"
                  ? "No quizzes match your filters."
                  : "No quizzes available yet."}
              </p>
            </div>
          )}

          {/* Quiz cards */}
          {!loading &&
            !error &&
            filtered.map((quiz) => {
              const qCount = quiz.questions?.length ?? 0;
              const catColor = getCategoryColor(quiz.category);
              return (
                <button
                  key={quiz.id}
                  id={`quiz-card-${quiz.id}`}
                  onClick={() => navigate(`/quizzes/${quiz.id}`)}
                  className="w-full text-left flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-[#DECB94]/30 hover:bg-white/[0.03] transition-all active:scale-[0.98] group"
                >
                  {/* Icon box */}
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-[#DECB94]/10 flex items-center justify-center border border-[#DECB94]/15">
                    <Trophy className="w-5 h-5 text-[#DECB94]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold text-sm leading-tight truncate">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
                        {quiz.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Category badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catColor}`}
                      >
                        <CategoryIcon category={quiz.category} />
                        {quiz.category}
                      </span>
                      {/* Duration */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {quiz.duration} mins
                      </span>
                      {/* Questions count */}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <HelpCircle className="w-3 h-3" />
                        {qCount} {qCount === 1 ? "question" : "questions"}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#DECB94] transition-colors shrink-0" />
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
