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
}

export const DesktopChatPanel = ({
  activeTicket,
  selectedTicketId,
  chatInput,
  setChatInput,
  sending,
  onSendMessage,
}: ChatPanelProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  if (!selectedTicketId && !activeTicket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center border-l border-border bg-card/30">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Inbox className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-foreground font-semibold">No ticket selected</p>
          <p className="text-sm text-muted-foreground mt-1">Select a ticket from the left to view the conversation</p>
        </div>
      </div>
    );
  }

  if (!activeTicket) {
    return (
      <div className="flex-1 flex items-center justify-center border-l border-border">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
                  {!isUser && <span className="text-[11px] text-muted-foreground font-medium px-1">{msg.senderName}</span>}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser ? "rounded-br-sm text-background bg-gradient-to-br from-primary to-primary/80 shadow-primary/30" : "rounded-bl-sm text-foreground border border-border bg-muted/40"}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[10px] mt-2 ${isUser ? "text-right text-background/50" : "text-muted-foreground"}`}>{formatTime(msg.createdAt)}</p>
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
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-card/50">
          <div className="flex items-end gap-3 bg-background border border-border rounded-2xl p-2 pl-4 focus-within:border-primary/40 transition-colors">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={{ lineHeight: "1.5", minHeight: "28px", maxHeight: "120px" }}
              className="flex-1 py-1.5 bg-transparent border-none focus-visible:ring-0 text-foreground text-sm placeholder:text-muted-foreground resize-none scrollbar-hide shadow-none"
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
