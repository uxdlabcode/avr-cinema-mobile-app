import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
  Send,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  Loader2,
  TicketX,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { useAppSelector } from "@/store/hooks";

// ─── Static support FAQ data ──────────────────────────────────────────────────
interface SupportCategory { title: string; content: string[]; }

const supportData: SupportCategory[] = [
  {
    title: "Subscription Plans and Pricing",
    content: [
      "AVR Cinema offers flexible subscription plans designed to fit every viewer's needs. All plans include unlimited access to our full library of movies, TV shows, web series, and exclusive AVR Originals.",
      "Mobile-Only Plan (Rs. 149/month)\n• Stream on 1 device at a time\n• SD quality up to 480p\n• Download up to 5 titles offline",
      "HD Plan (Rs. 499/month)\n• Stream on up to 2 devices\n• HD quality up to 1080p\n• Download up to 15 titles offline\n• Dolby Audio on compatible devices",
      "4K Premium Plan (Rs. 799/month)\n• Stream on up to 4 devices\n• Ultra HD (4K) with HDR10 and Dolby Vision\n• Dolby Atmos surround sound\n• Unlimited offline downloads\n• Early access to new releases\n• Ad-free experience\n• Priority customer support",
    ],
  },
  {
    title: "Accessing AVR Cinema",
    content: [
      "Getting started with AVR Cinema is simple. Here is everything you need to know about logging in, recovering your account, and troubleshooting access issues.",
      "Login Guide:\n1. Download the app or visit cinema.avr.com\n2. Tap Sign In\n3. Enter your email and password\n4. Enter OTP if two-factor authentication is enabled",
      "Reset Your Password:\n1. Tap Forgot Password on the login screen\n2. Enter your registered email\n3. Click the reset link in your inbox (valid for 30 minutes)\n4. Create a new password and log in",
    ],
  },
  {
    title: "Supported Devices",
    content: [
      "AVR Cinema is available on a wide range of devices.",
      "Mobile Devices:\n• Android 8.0 and above\n• iOS 14.0 and above (iPhone 8 and newer)\n• iPadOS 14.0 and above",
      "Smart TVs:\n• Samsung (Tizen OS 3.0+)\n• LG (WebOS 4.0+)\n• Android TV 8.0+\n• Apple TV (tvOS 14.0+)",
      "Web Browsers:\n• Google Chrome 80+ (recommended)\n• Mozilla Firefox 75+\n• Microsoft Edge 80+ (Chromium)\n• Safari 13+ (macOS Catalina+)",
    ],
  },
  {
    title: "Our Features",
    content: [
      "AVR Cinema is packed with features designed to enhance your experience.",
      "Offline Downloads:\n• Download to watch without internet\n• Mobile-Only: 5 titles, HD: 15 titles, 4K: Unlimited",
      "Watchlist:\n• Add any title with the + or bookmark icon\n• Access from Profile → Watchlist\n• Syncs across all devices automatically",
      "Multiple Profiles:\n• Up to 5 individual profiles per account\n• Each has its own history, recommendations, and Watchlist",
    ],
  },
  {
    title: "Help With Your Account",
    content: [
      "Find detailed instructions for updating your info, managing sessions, billing history, and account deletion.",
      "Update Email:\n1. Profile → Account Settings → Personal Information\n2. Tap your current email\n3. Enter new email and verify with the code sent to it",
      "Manage Active Sessions:\n1. Profile → Account Settings → Active Sessions\n2. View all logged-in devices\n3. Remove specific devices or tap Sign Out of All Devices",
    ],
  },
  {
    title: "Tadka on AVR Cinema",
    content: [
      "Welcome to Tadka — AVR Cinema's exclusive section for regional and independent entertainment.",
      "What is Tadka?\n• Exclusive behind-the-scenes footage\n• In-depth celebrity interviews\n• Award-winning short films from across India\n• Regional content in Hindi, Tamil, Telugu, Malayalam, and more",
    ],
  },
];

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface FirebaseMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "user" | "admin";
  text: string;
  createdAt: Timestamp | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  topic: string;
  status: "open" | "resolved" | "fixed";
  userId: string;
  userName: string;
  createdAt: Timestamp | null;
  messages: FirebaseMessage[];
}

type ViewState =
  | { view: "list" }
  | { view: "detail"; categoryIndex: number }
  | { view: "new-ticket"; from: "list" | "my-tickets" | "detail" }
  | { view: "my-tickets" }
  | { view: "chat"; ticketId: string };

// ─── Helper ────────────────────────────────────────────────────────────────────
const formatTime = (ts: Timestamp | null | undefined): string => {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-green-500/15 text-green-400 border border-green-500/30";
    case "resolved": return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    case "fixed": return "bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/30";
    default: return "bg-muted text-muted-foreground";
  }
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const GetSupportPage = () => {
  const navigate = useNavigate();
  const { ticketId: urlTicketId } = useParams<{ ticketId?: string }>();
  const { user } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>(
    urlTicketId
      ? { view: "chat", ticketId: urlTicketId }
      : { view: "list" }
  );

  useEffect(() => {
    if (urlTicketId) {
      setViewState({ view: "chat", ticketId: urlTicketId });
    }
  }, [urlTicketId]);

  // New ticket form
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketTopic, setTicketTopic] = useState(supportData[0].title);
  const [ticketDesc, setTicketDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // My tickets list
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Active chat
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  // ── Fetch user's tickets ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || viewState.view !== "my-tickets") return;
    setTicketsLoading(true);

    const q = query(
      collection(db, "support_tickets"),
      where("userId", "==", user.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const tickets = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SupportTicket, "id">),
      }));
      tickets.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setMyTickets(tickets);
      setTicketsLoading(false);
    }, (err) => {
      console.error("Tickets fetch error:", err);
      setTicketsLoading(false);
    });

    return () => unsub();
  }, [user?.id, viewState.view]);

  // ── Real-time chat listener ───────────────────────────────────────────────
  useEffect(() => {
    if (viewState.view !== "chat") return;
    const ticketId = (viewState as { view: "chat"; ticketId: string }).ticketId;
    if (!ticketId) return;

    const unsub = onSnapshot(doc(db, "support_tickets", ticketId), (snap) => {
      if (snap.exists()) {
        setActiveTicket({ id: snap.id, ...(snap.data() as Omit<SupportTicket, "id">) });
      }
    });

    return () => unsub();
  }, [viewState]);

  // ── Submit new ticket ─────────────────────────────────────────────────────
  const handleSubmitTicket = useCallback(async () => {
    if (!user) { toast.error("Please sign in first."); return; }
    if (!ticketSubject.trim()) { toast.error("Please enter a subject."); return; }
    if (!ticketDesc.trim()) { toast.error("Please describe your issue."); return; }

    setSubmitting(true);
    try {
      const firstMsg: FirebaseMessage = {
        id: `m${Date.now()}`,
        senderId: user.id,
        senderName: user.name || user.displayName || user.email?.split("@")[0] || "User",
        senderRole: "user",
        text: ticketDesc.trim(),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "support_tickets"), {
        subject: ticketSubject.trim(),
        topic: ticketTopic,
        status: "open",
        userId: user.id,
        userName: user.name || user.displayName || user.email?.split("@")[0] || "User",
        userEmail: user.email || "",
        createdAt: serverTimestamp(),
        messages: [firstMsg],
      });

      toast.success("Ticket created! Our team will respond shortly.");
      setTicketSubject("");
      setTicketTopic(supportData[0].title);
      setTicketDesc("");
      navigate(`/support/ticket/${docRef.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }, [user, ticketSubject, ticketTopic, ticketDesc]);

  // ── Send chat message ─────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!user || !chatInput.trim() || !activeTicket) return;

    const text = chatInput.trim();
    setChatInput("");
    setSending(true);

    try {
      const newMsg: FirebaseMessage = {
        id: `m${Date.now()}`,
        senderId: user.id,
        senderName: user.name || user.displayName || user.email?.split("@")[0] || "User",
        senderRole: "user",
        text,
        createdAt: Timestamp.now(),
      };

      await updateDoc(doc(db, "support_tickets", activeTicket.id), {
        messages: arrayUnion(newMsg),
      });
    } catch (err: any) {
      toast.error("Failed to send message.");
      setChatInput(text);
    } finally {
      setSending(false);
    }
  }, [user, chatInput, activeTicket]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const handleBack = () => {
    if (viewState.view === "list") navigate("/profile");
    else if (viewState.view === "new-ticket") {
      const from = (viewState as { view: "new-ticket"; from: string }).from;
      if (from === "my-tickets") setViewState({ view: "my-tickets" });
      else if (from === "detail") setViewState({ view: "list" });
      else setViewState({ view: "list" });
    }
    else if (viewState.view === "chat") {
      if (urlTicketId) {
        navigate("/support");
        setViewState({ view: "my-tickets" });
      } else {
        setViewState({ view: "my-tickets" });
      }
    }
    else setViewState({ view: "list" });
  };

  const headerTitle = () => {
    switch (viewState.view) {
      case "new-ticket": return "New Support Ticket";
      case "my-tickets": return "My Tickets";
      case "chat": return activeTicket?.subject || "Chat";
      case "detail": return "Help";
      default: return "Support";
    }
  };

  const filteredCategories = supportData.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
          <button
            onClick={handleBack}
            className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors z-10"
            id="support-back-btn"
          >
            {viewState.view === "list"
              ? <ChevronLeft className="w-4 h-4 text-foreground" />
              : <ArrowLeft className="w-4 h-4 text-foreground" />}
          </button>
          <h1 className="text-foreground font-semibold text-lg">{headerTitle()}</h1>

          {/* My Tickets badge button (only on list view) */}
          {viewState.view === "list" && (
            <button
              onClick={() => setViewState({ view: "my-tickets" })}
              className="absolute right-4 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors"
              id="my-tickets-btn"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              My Tickets
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pt-[64px]">
        {/* ── LIST VIEW ── */}
        {viewState.view === "list" && (
          <div className="flex flex-col gap-5 px-4 pb-28 pt-4 max-w-[700px] mx-auto w-full">
            <h2 className="text-xl font-semibold text-foreground italic">How can we help you Today?</h2>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help or topics..."
                className="w-full h-11 pl-10 pr-4 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-foreground"
              />
            </div>

            <h3 className="text-sm font-semibold text-foreground">Top Categories</h3>
            <div className="flex flex-col gap-3">
              {filteredCategories.map((cat) => {
                const idx = supportData.findIndex((c) => c.title === cat.title);
                return (
                  <button
                    key={cat.title}
                    onClick={() => setViewState({ view: "detail", categoryIndex: idx })}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-sm text-foreground font-medium">{cat.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                );
              })}
              {filteredCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No results for "{searchQuery}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {viewState.view === "detail" && (
          <div className="flex flex-col gap-5 px-4 pb-24 pt-4 max-w-[700px] mx-auto w-full">
            <h2 className="text-lg font-semibold text-foreground">
              {supportData[(viewState as any).categoryIndex].title}
            </h2>
            <div className="flex flex-col gap-4">
              {supportData[(viewState as any).categoryIndex].content.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── NEW TICKET VIEW ── */}
        {viewState.view === "new-ticket" && (
          <div className="flex flex-col gap-5 px-4 pb-28 pt-4 max-w-[700px] mx-auto w-full">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create a Support Ticket</h2>
              <p className="text-sm text-muted-foreground mt-1">Provide details about your issue and our team will respond shortly.</p>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Subject</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Brief summary of your issue..."
                className="w-full h-11 px-3 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-foreground"
              />
            </div>

            {/* Topic */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Topic</label>
              <Select value={ticketTopic} onValueChange={(val) => setTicketTopic(val)}>
                <SelectTrigger className="w-full bg-card border-border text-foreground rounded-xl h-11">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {supportData.map((cat) => (
                    <SelectItem key={cat.title} value={cat.title}>{cat.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Describe your issue</label>
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                placeholder="Describe your problem in detail so we can help you faster..."
                rows={6}
                className="w-full p-3 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-foreground resize-none"
              />
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={handleSubmitTicket}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary-foreground text-secondary font-semibold text-sm hover:bg-primary-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Ticket"}
              </button>
              <button
                onClick={() => setViewState({ view: "list" })}
                className="w-full py-3 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── MY TICKETS VIEW ── */}
        {viewState.view === "my-tickets" && (
          <div className="flex flex-col gap-4 px-4 pb-28 pt-4 max-w-[700px] mx-auto w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Your Tickets</h2>
              <button
                onClick={() => setViewState({ view: "new-ticket", from: "my-tickets" })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-foreground text-secondary hover:bg-primary-foreground/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </button>
            </div>

            {ticketsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
              </div>
            ) : myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <TicketX className="w-12 h-12 text-muted-foreground/40" />
                <div>
                  <p className="text-foreground font-semibold">No tickets yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a ticket and our team will assist you.</p>
                </div>
                <button
                  onClick={() => setViewState({ view: "new-ticket", from: "my-tickets" })}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-primary-foreground text-secondary font-semibold text-sm hover:bg-primary-foreground/90 transition-colors"
                >
                  Create a Ticket
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => navigate(`/support/ticket/${ticket.id}`)}
                    className="flex flex-col gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-snug flex-1">{ticket.subject}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${statusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ticket.topic}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(ticket.createdAt)}
                      {ticket.messages?.length > 0 && (
                        <>
                          <span className="mx-1">·</span>
                          <MessageSquare className="w-3 h-3" />
                          {ticket.messages.length} messages
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CHAT VIEW ── */}
        {viewState.view === "chat" && (
          <div
            className="fixed inset-x-0 flex flex-col"
            style={{ 
              top: "64px", 
              bottom: "64px",
              background: "linear-gradient(to bottom, #0a0a0f, #12121a)",
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 1px, transparent 1px)`,
              backgroundSize: "24px 24px"
            }}
          >
            <div className="max-w-[700px] mx-auto w-full flex flex-col flex-1 min-h-0">
            {/* Ticket status floating pill */}
            {activeTicket && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
                  <p className="text-[10px] text-white/70 font-medium">
                    {formatDate(activeTicket.createdAt)}
                  </p>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${statusColor(activeTicket.status)}`}>
                    {activeTicket.status}
                  </span>
                </div>
              </div>
            )}

              {/* Messages — only this area scrolls */}
            <div className="flex-1 overflow-y-auto px-4 pt-16 pb-4 flex flex-col gap-4 scrollbar-hide">
              {!activeTicket ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
                </div>
              ) : activeTicket.messages?.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages yet.</div>
              ) : (
                activeTicket.messages.map((msg, idx) => {
                  const isUser = msg.senderRole === "user";
                  return (
                    <div key={msg.id || idx} className={`flex flex-col gap-1 w-full ${isUser ? "items-end" : "items-start"}`}>
                      {!isUser && (
                        <div className="flex items-center gap-1.5 px-1 mb-1">
                          <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center border border-primary-foreground/30">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <span className="text-[11px] text-white/60 font-medium">{msg.senderName}</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                          isUser
                            ? "rounded-br-sm text-black"
                            : "rounded-bl-sm text-white border border-white/10"
                        }`}
                        style={isUser ? {
                          background: "linear-gradient(135deg, var(--primary-foreground) 0%, #b89a5a 100%)",
                          boxShadow: "0 4px 15px color-mix(in srgb, var(--primary-foreground) 15%, transparent)"
                        } : {
                          background: "rgba(255, 255, 255, 0.05)",
                          backdropFilter: "blur(10px)"
                        }}
                      >
                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                        <p className={`text-[9px] mt-1.5 text-right font-medium ${isUser ? "text-black/60" : "text-white/40"}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area — fixed at bottom */}
            {activeTicket?.status === "open" ? (
              <div className="flex-shrink-0 px-4 py-3 pb-safe bg-[#0a0a0f]/80 backdrop-blur-xl border-t border-white/5">
                <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-3xl p-1.5 pl-4 transition-all focus-within:bg-white/10 focus-within:border-primary-foreground/30">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message support..."
                  rows={1}
                  style={{ lineHeight: "1.4", minHeight: "24px", maxHeight: "100px" }}
                  className="flex-1 py-2.5 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none resize-none scrollbar-hide"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !chatInput.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:scale-95 shrink-0"
                  style={
                    chatInput.trim() && !sending
                      ? {
                          background: "linear-gradient(135deg, var(--primary-foreground) 0%, #b89a5a 100%)",
                          boxShadow: "0 4px 15px color-mix(in srgb, var(--primary-foreground) 30%, transparent)",
                        }
                      : { background: "rgba(255,255,255,0.1)" }
                  }
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Send className={`w-4 h-4 ${chatInput.trim() ? "text-black" : "text-white/50"} ml-0.5`} />}
                </button>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 bg-[#0a0a0f]/80 backdrop-blur-xl border-t border-white/5 px-4 py-4 pb-safe">
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white/50" />
                  </div>
                  <p className="text-center text-xs text-white/60">
                    This ticket is <span className="text-white font-semibold">{activeTicket?.status}</span>. Chat is closed.
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
