import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center pb-20">
      <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-white">Payment Successful!</h1>
        
        <p className="text-zinc-400 mb-8">
          Thank you for subscribing to AVR Cinema. Your account has been upgraded and you can now start enjoying endless entertainment.
        </p>

        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
          onClick={() => navigate("/dashboard")}
        >
          <Home className="w-5 h-5 mr-2" /> Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
