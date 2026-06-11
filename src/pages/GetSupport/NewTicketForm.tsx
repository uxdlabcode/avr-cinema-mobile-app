import { useState, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { useAppSelector } from "@/store/hooks";
import { useSupportTopics } from "./GetSupportPage";
import { useNavigate } from "react-router-dom";

interface NewTicketFormProps {
  onCancel: () => void;
  onSuccess?: (ticketId: string) => void;
  isDesktop?: boolean;
  initialTopic?: string;
}

export const NewTicketForm = ({ onCancel, onSuccess, isDesktop = false, initialTopic }: NewTicketFormProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const { topics: supportData, loading: topicsLoading } = useSupportTopics();
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketTopic, setTicketTopic] = useState(initialTopic || (supportData.length > 0 ? supportData[0].title : ""));

  // Update topic once data loads if initialTopic wasn't set and current is empty
  useEffect(() => {
    if (!ticketTopic && supportData.length > 0) {
      setTicketTopic(initialTopic || supportData[0].title);
    }
  }, [supportData, ticketTopic, initialTopic]);
  const [ticketDesc, setTicketDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitTicket = useCallback(async () => {
    if (!user) { toast.error("Please sign in first."); return; }
    if (!ticketSubject.trim()) { toast.error("Please enter a subject."); return; }
    if (!ticketDesc.trim()) { toast.error("Please describe your issue."); return; }

    setSubmitting(true);
    try {
      const firstMsg: any = {
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
      setTicketTopic(supportData.length > 0 ? supportData[0].title : "");
      setTicketDesc("");

      if (onSuccess) {
        onSuccess(docRef.id);
      } else {
        navigate(`/support/ticket/${docRef.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }, [user, ticketSubject, ticketTopic, ticketDesc, navigate, onSuccess]);

  return (
    <div className={`flex flex-col gap-5 w-full ${!isDesktop ? "px-4 md:px-6 pb-28 pt-4 max-w-[700px] md:max-w-[1000px] mx-auto" : "h-full"}`}>
      {!isDesktop && (
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onCancel}
            className="w-10 h-10 rounded-xl border-border"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">New Support Ticket</h1>
        </div>
      )}

      {!isDesktop && (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Create a Support Ticket</h2>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-foreground">Subject</Label>
        <Input
          type="text"
          value={ticketSubject}
          onChange={(e) => setTicketSubject(e.target.value)}
          placeholder="Brief summary of your issue..."
          className="w-full h-9"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold text-foreground">Topic</Label>
        <Select value={ticketTopic} onValueChange={(val) => setTicketTopic(val)}>
          <SelectTrigger className="w-full text-foreground  h-9">
            <SelectValue placeholder="Select a topic" />
          </SelectTrigger>
          <SelectContent side="bottom">
            {topicsLoading ? (
              <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              supportData.map((cat) => (
                <SelectItem key={cat.title} value={cat.title}>{cat.title}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs  text-foreground">Describe your issue</Label>
        <Textarea
          value={ticketDesc}
          onChange={(e) => setTicketDesc(e.target.value)}
          placeholder="Describe your problem in detail so we can help you faster..."
          className="w-full text-md "
        />
      </div>
      <div className="flex items-center gap-3 mt-auto pt-3">
        <Button
          onClick={handleSubmitTicket}
          disabled={submitting}
          className="flex-1 h-10 rounded-md bg-primary text-secondary font-semibold text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Ticket"
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-10 rounded-md bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted/50"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
