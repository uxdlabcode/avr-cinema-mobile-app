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
  Loader2,
  TicketX,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { useAppSelector } from "@/store/hooks";
export interface SupportCategory {
  id?: string;
  title: string;
  content?: string[];
}

export interface FirebaseMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "user" | "admin";
  text: string;
  createdAt: Timestamp | null;
}

export interface SupportTicket {
  id: string;
  subject: string;
  topic: string;
  status: "open" | "resolved" | "fixed";
  userId: string;
  userName: string;
  createdAt: Timestamp | null;
  messages: FirebaseMessage[];
}

export type ViewState =
  | { view: "list" }
  | { view: "detail"; categoryIndex: number }
  | { view: "new-ticket"; from: "list" | "my-tickets" | "detail" }
  | { view: "my-tickets" }
  | { view: "chat"; ticketId: string };

export const formatTime = (ts: Timestamp | null | undefined): string => {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export const formatDate = (ts: Timestamp | null | undefined): string => {
  if (!ts) return "";
  try {
    return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

export const statusColor = (status: string) => {
  switch (status) {
    case "open": return "bg-green-500/15 text-green-400 border border-green-500/30";
    case "resolved": return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    case "fixed": return "bg-primary/15 text-primary border border-primary/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export const useSupportTopics = () => {
  const [topics, setTopics] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "support_topics"), (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().name || "Unknown Topic",
        content: doc.data().content || [],
      }));
      setTopics(data);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch topics:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { topics, loading };
};
import { NewTicketForm } from "./NewTicketForm";
import { NewTicketSheet } from "./NewTicketSheet";
import { DesktopChatPanel } from "./DesktopChatPanel";

export const GetSupportPage = () => {
  const navigate = useNavigate();
  const { ticketId: urlTicketId } = useParams<{ ticketId?: string }>();
  const { user } = useAppSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>(
    urlTicketId ? { view: "chat", ticketId: urlTicketId } : { view: "list" }
  );

  useEffect(() => {
    if (urlTicketId) {
      setViewState({ view: "chat", ticketId: urlTicketId });
    }
  }, [urlTicketId]);

  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(urlTicketId || null);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isNewTicketSheetOpen, setIsNewTicketSheetOpen] = useState(false);
  const [initialTopic, setInitialTopic] = useState("");
  const { topics: supportData, loading: topicsLoading } = useSupportTopics();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

  useEffect(() => {
    const ticketId = selectedTicketId || (viewState.view === "chat" ? (viewState as any).ticketId : null);
    if (!ticketId) return;

    const unsub = onSnapshot(doc(db, "support_tickets", ticketId), (snap) => {
      if (snap.exists()) {
        setActiveTicket({ id: snap.id, ...(snap.data() as Omit<SupportTicket, "id">) });
      }
    });

    return () => unsub();
  }, [selectedTicketId, viewState]);

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

  const isDesktopSplitView = viewState.view === "my-tickets" || viewState.view === "chat";

  return (
    <div className="flex-1 flex flex-col bg-background h-full min-h-0">
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px] max-w-[700px] mx-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="absolute left-4 w-9 h-9 rounded-full z-10 border-border"
            id="support-back-btn"
          >
            {viewState.view === "list"
              ? <ChevronLeft className="w-4 h-4 text-foreground" />
              : <ArrowLeft className="w-4 h-4 text-foreground" />}
          </Button>
          <h1 className="text-foreground font-bold text-lg">{headerTitle()}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewState({ view: "my-tickets" })}
            className="absolute right-4 flex items-center gap-1.5 h-8 text-xs font-semibold px-3 rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary transition-colors"
            id="my-tickets-btn"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            My Tickets
          </Button>
        </div>
      </div>

      <div className="flex-1 pt-[64px] md:pt-0 flex flex-col min-h-0">
        {isDesktopSplitView && (
          <div className="hidden md:flex flex-col w-full overflow-hidden" style={{ height: "calc(100vh - 90px)" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewState({ view: "list" })}
                  className="w-10 h-10 rounded-lg border-border"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Support Tickets</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {myTickets.length > 0 ? `${myTickets.length} total tickets` : "No tickets yet"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => { setInitialTopic(""); setIsNewTicketSheetOpen(true); }}
                className="flex items-center gap-2 text-sm font-semibold rounded-lg bg-primary text-secondary hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Ticket
              </Button>
            </div>

            <div className="flex flex-1 min-h-0">
              <div className="w-[340px] xl:w-[380px] flex-shrink-0 flex flex-col border-r border-border overflow-y-auto scrollbar-hide">
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
                    <TicketX className="w-10 h-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-foreground font-semibold text-sm">No tickets yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Create a ticket and our team will assist you.</p>
                    </div>
                    <Button
                      onClick={() => setIsNewTicketSheetOpen(true)}
                      className="mt-1 rounded-lg bg-primary text-secondary font-semibold text-sm hover:bg-primary/90 transition-colors"
                    >
                      Create a Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col py-2">
                    {myTickets.map((ticket) => {
                      const isSelected = selectedTicketId === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicketId(ticket.id);
                            setActiveTicket(null);
                          }}
                          className={`flex flex-col gap-1.5 px-4 py-4 text-left transition-colors border-l-2 ${isSelected
                            ? "bg-primary/8 border-l-primary"
                            : "hover:bg-muted/40 border-l-transparent"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-snug flex-1 truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {ticket.subject}
                            </p>
                            <Badge variant="outline" className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${statusColor(ticket.status)}`}>
                              {ticket.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{ticket.topic}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(ticket.createdAt)}
                            {ticket.messages?.length > 0 && (
                              <>
                                <span>·</span>
                                <MessageSquare className="w-3 h-3" />
                                {ticket.messages.length} messages
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <DesktopChatPanel
                activeTicket={activeTicket}
                selectedTicketId={selectedTicketId}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sending={sending}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        )}

        {viewState.view === "list" && (
          <div className="flex flex-col gap-5 px-4 md:px-6 pb-28 pt-4 max-w-[700px] md:max-w-[1000px] mx-auto w-full">
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  className="w-10 h-10 rounded-lg border-border"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Support</h1>
              </div>
              <Button
                variant="outline"
                onClick={() => setViewState({ view: "my-tickets" })}
                className="flex items-center gap-2 text-sm font-semibold rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                My Tickets
              </Button>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground ">How can we help you Today?</h2>
            <div className="relative">
              {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> */}
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help or topics..."
                className="w-full h-9 md:h-11 "
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Top Categories</h3>
            {topicsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCategories.map((cat) => {
                  const idx = supportData.findIndex((c) => c.title === cat.title);
                  return (
                    <Card
                      key={cat.id || cat.title}
                      onClick={() => {
                        if (cat.content && cat.content.length > 0) {
                          setViewState({ view: "detail", categoryIndex: idx });
                        } else {
                          setInitialTopic(cat.title);
                          setIsNewTicketSheetOpen(true);
                        }
                      }}
                      className="flex flex-row items-center justify-between gap-4 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer border border-border shadow-sm bg-card/60"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm md:text-base text-foreground font-semibold truncate block">{cat.title}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </Card>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-10">No categories found matching your search.</p>
                )}
              </div>
            )}
          </div>
        )}

        {viewState.view === "detail" && (
          <div className="flex flex-col gap-5 px-4 md:px-6 pb-24 pt-4 max-w-[700px] md:max-w-[1000px] mx-auto w-full">
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBack}
                className="w-10 h-10 rounded-lg border-border"
              >
                <ArrowLeft className="w-4 h-4 text-foreground" />
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Help</h1>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {supportData[(viewState as any).categoryIndex]?.title}
            </h2>
            <div className="flex flex-col gap-4">
              {supportData[(viewState as any).categoryIndex]?.content?.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p}</p>
              ))}
            </div>
          </div>
        )}



        {viewState.view === "my-tickets" && (
          <div className="md:hidden flex flex-col gap-4 px-4 pb-28 pt-4 max-w-[700px] mx-auto w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Your Tickets</h2>
              <Button
                size="sm"
                onClick={() => setIsNewTicketSheetOpen(true)}
                className="flex items-center gap-1.5 rounded-lg h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5" /> New Ticket
              </Button>
            </div>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <TicketX className="w-12 h-12 text-muted-foreground/40" />
                <div>
                  <p className="text-foreground font-semibold">No tickets yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a ticket and our team will assist you.</p>
                </div>
                <Button
                  onClick={() => setIsNewTicketSheetOpen(true)}
                  className="mt-2 rounded-lg text-secondary bg-primary px-6"
                >
                  Create a Ticket
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    onClick={() => navigate(`/support/ticket/${ticket.id}`)}
                    className="flex flex-col gap-2 p-4 rounded-lg hover:bg-muted/40 transition-colors text-left cursor-pointer border-border shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-snug flex-1">{ticket.subject}</p>
                      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${statusColor(ticket.status)}`}>
                        {ticket.status}
                      </Badge>
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
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {viewState.view === "chat" && (
          <div
            className="md:hidden fixed inset-x-0 flex flex-col z-30 bg-gradient-to-b from-background to-card"
            style={{ top: "64px", bottom: "64px" }}
          >
            <div className="max-w-[700px] mx-auto w-full flex flex-col flex-1 min-h-0 relative">
              {activeTicket && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 backdrop-blur-md border border-foreground/10">
                    <p className="text-[10px] text-foreground/70">{formatDate(activeTicket.createdAt)}</p>
                    <div className="w-1 h-1 rounded-full bg-foreground/20" />
                    <Badge variant="outline" className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${statusColor(activeTicket.status)}`}>
                      {activeTicket.status}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 pt-12 pb-4 flex flex-col gap-3 scrollbar-hide">
                {!activeTicket ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : activeTicket.messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages yet.</div>
                ) : (
                  activeTicket.messages.map((msg, idx) => {
                    const isUser = msg.senderRole === "user";
                    return (
                      <div key={msg.id || idx} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "rounded-br-sm text-background bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20" : "rounded-bl-sm text-foreground border border-foreground/10 bg-foreground/5"}`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <p className={`text-[9px] mt-1 text-right ${isUser ? "text-background/50" : "text-foreground/40"}`}>{formatTime(msg.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              {activeTicket?.status === "open" ? (
                <div className="flex-shrink-0 px-3 py-2 pb-safe border-t border-foreground/5 bg-background/90">
                  <div className="flex items-end gap-2 bg-foreground/5 border border-foreground/10 rounded-2xl p-1.5 pl-4 focus-within:border-primary/40 transition-colors">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Message support..."
                      rows={1}
                      style={{ lineHeight: "1.4", minHeight: "24px", maxHeight: "80px" }}
                      className="flex-1 py-2 bg-transparent border-none focus-visible:ring-0 text-foreground text-sm placeholder:text-foreground/40 resize-none scrollbar-hide shadow-none"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={sending || !chatInput.trim()}
                      className={`w-9 h-9 rounded-full shrink-0 transition-all ${chatInput.trim() && !sending ? "bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20" : "bg-foreground/10 hover:bg-foreground/10 text-foreground/40"}`}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ml-0.5 ${chatInput.trim() ? "text-background" : ""}`} />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-shrink-0 px-4 py-3 border-t border-foreground/5 bg-background/90">
                  <p className="text-center text-xs text-foreground/50">
                    This ticket is <span className="text-white font-semibold">{activeTicket?.status}</span>. Chat is closed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <NewTicketSheet
        isOpen={isNewTicketSheetOpen}
        onOpenChange={setIsNewTicketSheetOpen}
        initialTopic={initialTopic}
        onSuccess={(ticketId) => {
          setSelectedTicketId(ticketId);
          setActiveTicket(null);
          navigate(`/support/ticket/${ticketId}`);
        }}
      />
    </div>
  );
};
