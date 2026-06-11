import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { NewTicketForm } from "./NewTicketForm";

interface NewTicketSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ticketId: string) => void;
  initialTopic?: string;
}

export const NewTicketSheet = ({ isOpen, onOpenChange, onSuccess, initialTopic }: NewTicketSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] flex flex-col h-full bg-background/95 backdrop-blur-xl border-l border-border p-0">
        <SheetHeader className="px-6 h-16 min-h-[64px] border-b border-border flex flex-row items-center justify-center space-y-0">
          <SheetTitle className="text-center text-lg m-0">Create a Support Ticket</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <NewTicketForm 
            isDesktop={true}
            initialTopic={initialTopic}
            onCancel={() => onOpenChange(false)}
            onSuccess={(ticketId) => {
              onOpenChange(false);
              onSuccess(ticketId);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
