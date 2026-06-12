import { useRef, useEffect } from "react";
import { MessageSquare, Inbox, Loader2, CheckCircle2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SupportTicket } from "./GetSupportPage";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, statusColor } from "./GetSupportPage";

interface ChatPanelProps {
  activeTicket: SupportTicket | null;
  selectedTicketId: string | null;
  chatInput: string;
  setChatInput: (val: string) => void;
  sending: boolean;
  onSendMessage: () => void;
  isMobile?: boolean;
}

export const DesktopChatPanel = ({
  activeTicket,
  selectedTicketId,
  chatInput,
  setChatInput,
  sending,
  onSendMessage,
  isMobile = false,
}: ChatPanelProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  if (!selectedTicketId && !activeTicket) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center gap-4 text-center bg-card/30 ${isMobile ? "" : "border-l border-border"}`}>
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Inbox className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-foreground font-semibold">No ticket selected</p>
          {!isMobile && <p className="text-sm text-muted-foreground mt-1">Select a ticket from the left to view the conversation</p>}
        </div>
      </div>
    );
  }

  if (!activeTicket) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isMobile ? "" : "border-l border-border"}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="max-w-[700px] mx-auto w-full flex flex-col flex-1 min-h-0 relative">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/10 backdrop-blur-md border border-foreground/10">
            <p className="text-[10px] text-foreground/70">{formatDate(activeTicket.createdAt)}</p>
            <div className="w-1 h-1 rounded-full bg-foreground/20" />
            <Badge variant="outline" className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${statusColor(activeTicket.status)}`}>
              {activeTicket.status}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-12 pb-4 flex flex-col gap-3 scrollbar-hide">
          {activeTicket.messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages yet.</div>
          ) : (
            activeTicket.messages.map((msg, idx) => {
              const isUser = msg.senderRole === "user";
              return (
                <div key={msg.id || idx} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] relative pl-3.5 pr-9 pt-1.5 pb-3 text-sm leading-relaxed shadow-md transition-all ${isUser
                      ? "rounded-[16px] rounded-tr-none bg-primary text-secondary"
                      : "rounded-[16px] rounded-tl-none bg-secondary text-primary border border-primary/10"
                      }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <span
                      className={`absolute bottom-0.5 right-2 text-[9px] font-medium ${isUser ? "text-secondary/60" : "text-primary/60"
                        }`}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {activeTicket.status === "open" ? (
          <div className="flex-shrink-0 px-3 py-2 pb-safe border-t border-foreground/5 bg-background/90">
            <div className="flex items-end gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                placeholder="Message support..."
                rows={1}
                style={{ lineHeight: "1.4", minHeight: "24px", maxHeight: "80px" }}
                className="flex-1 py-2"
              />
              <Button
                size="icon"
                onClick={onSendMessage}
                disabled={sending || !chatInput.trim()}
                className={`w-9 h-9 rounded-full shrink-0 transition-all ${chatInput.trim() && !sending ? "bg-gradient-to-br from-primary p-1 to-primary/80 shadow-md shadow-primary/20" : "bg-foreground/10 hover:bg-foreground/10 text-foreground/40"}`}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ml-0.5 ${chatInput.trim() ? "text-background" : ""}`} />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 px-4 py-3 border-t border-foreground/5 bg-background/90">
            <p className="text-center text-xs text-foreground/50">
              This ticket is <span className="text-white font-semibold">{activeTicket.status}</span>. Chat is closed.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 border-l border-border">
      {/* Chat header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0 bg-card/50">
        <div className="flex-1 min-w-0">
          <h2 className="text-foreground font-bold text-base truncate">{activeTicket.subject}</h2>
          <p className="text-muted-foreground text-xs mt-0.5">{activeTicket.topic}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">{formatDate(activeTicket.createdAt)}</span>
          <Badge variant="outline" className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase ${statusColor(activeTicket.status)}`}>
            {activeTicket.status}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 scrollbar-hide min-h-0">
        {activeTicket.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          </div>
        ) : (
          activeTicket.messages.map((msg, idx) => {
            const isUser = msg.senderRole === "user";
            return (
              <div key={msg.id || idx} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[60%]">
                  {/* {!isUser && <span className="text-[11px] text-primary font-medium px-1">{msg.senderName}</span>} */}
                  <div
                    className={`relative pl-3.5 pr-9 pt-0.5 pb-3.5 text-sm leading-relaxed shadow-sm transition-all ${isUser
                      ? "rounded-xl rounded-tr-none bg-primary text-secondary"
                      : "rounded-[16px] rounded-tl-none bg-secondary text-primary border border-primary/10"
                      }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <span
                      className={`absolute  right-2 text-[9px] font-medium ${isUser ? "text-secondary/60" : "text-primary/60"
                        }`}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary text-xs font-bold">U</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {activeTicket.status === "open" ? (
        <div className="flex-shrink-0 ">
          <div className="flex items-end gap-3 pl-4 mb-10 px-6
           bg-background focus-within:border-primary/40 transition-colors">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{ lineHeight: "1.5", minHeight: "28px", maxHeight: "120px" }}
              className="flex-1 "
            />
            <Button
              onClick={onSendMessage}
              disabled={sending || !chatInput.trim()}
              size="icon"
              className={`h-9 w-9 rounded-xl transition-all ${chatInput.trim() && !sending ? "bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20" : "bg-foreground/5 hover:bg-foreground/5"}`}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin text-foreground" /> : <Send className={`w-4 h-4 ml-0.5 ${chatInput.trim() ? "text-background" : "text-muted-foreground"}`} />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-card/50">
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">This ticket is <span className="text-foreground font-semibold">{activeTicket.status}</span>. Chat has been closed.</p>
          </div>
        </div>
      )}
    </div>
  );
};
