import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SupportCategory { title: string; content: string[]; }

const supportData: SupportCategory[] = [
  {
    title: "Subscription Plans and Pricing",
    content: [
      "AVR Cinema offers flexible subscription plans designed to fit every viewer's needs. All plans include unlimited access to our full library of movies, TV shows, web series, and exclusive AVR Originals.",
      "Mobile-Only Plan (Rs. 149/month)\n• Stream on 1 device at a time\n• SD quality up to 480p\n• Download up to 5 titles offline",
      "HD Plan (Rs. 499/month)\n• Stream on up to 2 devices\n• HD quality up to 1080p\n• Download up to 15 titles offline\n• Dolby Audio on compatible devices",
      "4K Premium Plan (Rs. 799/month)\n• Stream on up to 4 devices\n• Ultra HD (4K) with HDR10 and Dolby Vision\n• Dolby Atmos surround sound\n• Unlimited offline downloads\n• Early access to new releases\n• Ad-free experience\n• Priority customer support",
      "Accepted Payment Methods:\n• UPI (Google Pay, PhonePe, Paytm, BHIM)\n• Credit & Debit Cards (Visa, MasterCard, RuPay)\n• Net Banking (all major banks)\n• Wallets (Amazon Pay, Mobikwik, Freecharge)\n• Gift cards and promo codes",
      "How to Cancel:\n1. Go to Profile → Active Membership\n2. Select Manage Subscription\n3. Tap Cancel Subscription\n4. Confirm cancellation\n\nYou will keep access until the end of your billing period.",
    ],
  },
  {
    title: "Accessing AVR Cinema",
    content: [
      "Getting started with AVR Cinema is simple. Here is everything you need to know about logging in, recovering your account, and troubleshooting access issues.",
      "Login Guide:\n1. Download the app or visit cinema.avr.com\n2. Tap Sign In\n3. Enter your email and password\n4. Enter OTP if two-factor authentication is enabled",
      "Reset Your Password:\n1. Tap Forgot Password on the login screen\n2. Enter your registered email\n3. Click the reset link in your inbox (valid for 30 minutes)\n4. Create a new password and log in",
      "Multi-Device Limits:\n• Mobile-Only: 1 device at a time\n• HD Plan: 2 devices simultaneously\n• 4K Premium: 4 devices simultaneously\n• Manage devices at Profile → Account Settings → Manage Devices",
      "Troubleshooting Buffering:\n• Check internet speed (5+ Mbps for HD, 25+ Mbps for 4K)\n• Clear app cache: Settings → Apps → AVR Cinema → Clear Cache\n• Update the app to the latest version\n• Disable any VPN or proxy\n• Reinstall the app if issue persists",
    ],
  },
  {
    title: "Supported Devices",
    content: [
      "AVR Cinema is available on a wide range of devices. We continuously update compatibility to support the latest hardware and software.",
      "Mobile Devices:\n• Android 8.0 and above\n• iOS 14.0 and above (iPhone 8 and newer)\n• iPadOS 14.0 and above\n• All major Android tablet brands\n• Huawei devices with HMS (AppGallery version available)",
      "Smart TVs:\n• Samsung (Tizen OS 3.0+, 2017 onwards)\n• LG (WebOS 4.0+, 2018 onwards)\n• Android TV 8.0+\n• Google TV (all models)\n• Amazon Fire TV (Fire OS 5.0+)\n• Apple TV (tvOS 14.0+)\n• Roku (OS 9.0+)",
      "Web Browsers:\n• Google Chrome 80+ (recommended)\n• Mozilla Firefox 75+\n• Microsoft Edge 80+ (Chromium)\n• Safari 13+ (macOS Catalina+)\n• Opera 67+\n\nNote: Internet Explorer is not supported.",
      "Gaming Consoles & Streaming:\n• PlayStation 4 and PlayStation 5\n• Xbox One, Series S, Series X\n• Google Chromecast (2nd gen+)\n• Amazon Fire TV Stick (all models)\n• Apple TV (4th gen+)",
    ],
  },
  {
    title: "Our Features",
    content: [
      "AVR Cinema is packed with features designed to enhance your experience — from offline downloads to parental controls.",
      "Offline Downloads:\n• Download to watch without internet\n• Mobile-Only: 5 titles, HD: 15 titles, 4K: Unlimited\n• Available for 30 days after download\n• 48 hours after you start watching\n• Tap the download icon on any title page",
      "Watchlist:\n• Add any title with the + or bookmark icon\n• Access from Profile → Watchlist\n• Syncs across all devices automatically\n• Get notified when new episodes drop",
      "Multiple Profiles:\n• Up to 5 individual profiles per account\n• Each has its own history, recommendations, and Watchlist\n• Create Kids profiles with automatic content filtering",
      "Parental Controls:\n1. Profile → Account Settings → Parental Controls\n2. Create a 4-digit PIN\n3. Set maturity rating (U, U/A 7+, U/A 13+, U/A 16+, A)\n4. Content above rating requires the PIN",
      "Video Quality Settings:\n• Auto: Adjusts to internet speed\n• Data Saver: SD quality (~150MB/hr)\n• HD: 1080p (~500MB/hr)\n• 4K: Ultra HD (~2GB/hr)\n• Dolby Vision and Dolby Atmos on supported devices",
    ],
  },
  {
    title: "Help With Your Account",
    content: [
      "Find detailed instructions for updating your info, managing sessions, billing history, and account deletion.",
      "Update Email:\n1. Profile → Account Settings → Personal Information\n2. Tap your current email\n3. Enter new email and verify with the code sent to it",
      "Update Phone Number:\n1. Profile → Edit Profile\n2. Tap the Phone field\n3. Enter new number and verify with OTP",
      "Manage Active Sessions:\n1. Profile → Account Settings → Active Sessions\n2. View all logged-in devices\n3. Remove specific devices or tap Sign Out of All Devices",
      "View Billing History:\n1. Profile → Account Settings → Billing & Payments\n2. View all transactions with date, amount, plan, and method\n3. Download invoices as PDF",
      "Delete Your Account:\nWarning: This is permanent and irreversible.\n\n1. Profile → Account Settings → Delete Account\n2. Enter your password\n3. Select reason (optional) and confirm\n4. Click the confirmation link emailed to you within 24 hours\n\nNote: Cancel subscriptions first. Your email cannot be reused for 90 days.",
    ],
  },
  {
    title: "Tadka on AVR Cinema",
    content: [
      "Welcome to Tadka — AVR Cinema's exclusive section for regional and independent entertainment. Handpicked content showcasing the best of India's diverse creative talent.",
      "What is Tadka?\n• Exclusive behind-the-scenes footage\n• In-depth celebrity interviews\n• Award-winning short films from across India\n• Regional content in Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, and more\n• Original mini-documentaries on Indian cinema",
      "Featured Categories:\n\nCelebrity Corner:\nExclusive interviews with Bollywood and regional stars.\n\nShort Films:\nAward-winning films from MAMI, IFFI, Jio MAMI and international festivals. New shorts added weekly.\n\nMaking Of:\nBehind-the-camera access with production footage and director commentaries.",
      "Update Schedule:\n• New content every Wednesday and Saturday\n• Celebrity interviews every Friday at 6 PM IST\n• Short film premieres on the last Saturday of each month\n• Festive collections during Diwali, Eid, Pongal, Onam, and more",
      "How to Access:\n1. Open AVR Cinema app or website\n2. Find the Tadka tab in navigation\n3. Browse Interviews, Short Films, Behind the Scenes, Regional\n4. Add favorites to your Watchlist\n\nTadka is included in all subscription plans at no extra cost.",
    ],
  },
];

interface ChatMessage { id: number; sender: "user" | "support"; text: string; time: string; }
type ViewState = { view: "list" } | { view: "detail"; categoryIndex: number } | { view: "ticket"; category: string } | { view: "chat"; category: string };

export const GetSupportPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>({ view: "list" });
  const [ticketDesc, setTicketDesc] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "support", text: "Hello! Thank you for reaching out to AVR Cinema support. How can I assist you today?", time: "Just now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const filteredCategories = supportData.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSubmitTicket = () => {
    if (!ticketDesc.trim()) { toast.error("Please describe your issue before submitting."); return; }
    const desc = ticketDesc;
    toast.success("Ticket submitted! We'll respond within 24 hours.");
    if (viewState.view === "ticket") {
      const cat = viewState.category;
      setViewState({ view: "chat", category: cat });
      setChatMessages([
        { id: 1, sender: "support", text: "Hello! Thank you for reaching out to AVR Cinema support. How can I assist you today?", time: "Just now" },
        { id: 2, sender: "user", text: desc, time: "Just now" },
        { id: 3, sender: "support", text: "Thank you. A support agent has been assigned to your ticket and will respond shortly.", time: "Just now" },
      ]);
    }
    setTicketDesc("");
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { id: prev.length + 1, sender: "user", text: chatInput, time: "Just now" }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { id: prev.length + 1, sender: "support", text: "Thank you for your message. Our team is reviewing your query. Average response time is under 15 minutes.", time: "Just now" }]);
    }, 1500);
  };

  const handleBack = () => {
    if (viewState.view === "list") navigate("/profile");
    else setViewState({ view: "list" });
  };

  const headerTitle = viewState.view === "chat" ? "Live Chat" : viewState.view === "ticket" ? "Create Ticket" : "Support";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
          <button 
            onClick={handleBack} 
            className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors z-10"
            id="support-back-btn"
          >
            {viewState.view === "list" ? <ChevronLeft className="w-4 h-4 text-foreground" /> : <ArrowLeft className="w-4 h-4 text-foreground" />}
          </button>
          <h1 className="text-foreground font-bold text-lg">{headerTitle}</h1>
        </div>
      </div>

      <div className="flex-1 pt-[76px]">
        {/* LIST */}
        {viewState.view === "list" && (
          <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
            <h2 className="text-xl font-bold text-foreground italic">How can we help you Today?</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for help or topics..."
                className="w-full h-11 pl-10 pr-4 bg-card border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Top Categories</h3>
            <div className="flex flex-col gap-3">
              {filteredCategories.map((cat) => {
                const idx = supportData.findIndex((c) => c.title === cat.title);
                return (
                  <button key={cat.title} onClick={() => setViewState({ view: "detail", categoryIndex: idx })}
                    className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors group">
                    <span className="text-sm text-foreground font-medium">{cat.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                );
              })}
              {filteredCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No results for "{searchQuery}"</p>
              )}
            </div>

            {/* New Prominent Ticket Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setViewState({ view: "ticket", category: supportData[0].title })}
                className="w-full py-4 rounded-xl bg-primary-foreground text-secondary font-bold text-base hover:bg-primary-foreground/90 transition-colors shadow-lg"
              >
                Create a Support Ticket
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {viewState.view === "detail" && (
          <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
            <h2 className="text-lg font-bold text-foreground">{supportData[viewState.categoryIndex].title}</h2>
            <div className="flex flex-col gap-4">
              {supportData[viewState.categoryIndex].content.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* TICKET */}
        {viewState.view === "ticket" && (
          <div className="flex flex-col gap-5 px-4 pb-24 pt-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Create a Support Ticket</h2>
              <p className="text-sm text-muted-foreground mt-1">Please provide details about your issue.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Select Issue Type</label>
              <select
                value={viewState.category}
                onChange={(e) => setViewState({ view: "ticket", category: e.target.value })}
                className="w-full p-3 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-foreground appearance-none"
              >
                {supportData.map((cat) => (
                  <option key={cat.title} value={cat.title}>{cat.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Describe your issue</label>
              <textarea value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)}
                placeholder="Describe your problem in detail so we can help you faster..."
                rows={6} className="w-full p-3 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none" />
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button onClick={handleSubmitTicket} className="w-full py-3 rounded-xl bg-primary-foreground text-secondary font-semibold text-sm hover:bg-primary-foreground/90 transition-colors">
                Submit Ticket
              </button>
              <button onClick={() => setViewState({ view: "list" })} className="w-full py-3 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CHAT */}
        {viewState.view === "chat" && (
          <div className="flex flex-col h-[calc(100vh-76px)]">
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-20 scrollbar-hide">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.sender === "user" ? "bg-primary-foreground text-secondary rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md"}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-secondary/60" : "text-muted-foreground"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 flex gap-2 z-40">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                placeholder="Type a message..."
                className="flex-1 h-10 px-4 bg-card border border-border rounded-full text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground" />
              <button onClick={handleSendChat} className="w-10 h-10 rounded-full bg-primary-foreground flex items-center justify-center hover:bg-primary-foreground/90 transition-colors">
                <Send className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
