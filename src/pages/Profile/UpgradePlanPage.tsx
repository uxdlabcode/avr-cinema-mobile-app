import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { addDocument } from "@/Firebase";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { ArrowLeft, Check, X, Zap, Shield, Download, Monitor, Wifi, Crown, CrownIcon, Sparkles } from "lucide-react";
import LogoImage from "@/assets/Media (3) 1.png";
import { Button } from "@/components/ui/button";
import { createRazorpayOrderAsync, verifyRazorpayPaymentAsync } from "@/store/slices/membershipSlice";
import { useRazorpay } from "react-razorpay";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  resolution: string;
  screens: number;
  adFree: boolean;
  downloads: boolean;
  dolbyAtmos: boolean;
  popular: boolean;
}

const featureIcon = (key: string) => {
  switch (key) {
    case "adFree": return <Zap className="w-4 h-4" />;
    case "downloads": return <Download className="w-4 h-4" />;
    case "dolbyAtmos": return <Wifi className="w-4 h-4" />;
    case "screens": return <Monitor className="w-4 h-4" />;
    case "resolution": return <Shield className="w-4 h-4" />;
    default: return <Check className="w-4 h-4" />;
  }
};

export const UpgradePlanPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { Razorpay } = useRazorpay();

  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [upgradePlans, setUpgradePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  /* ── Fetch all plans + resolve user's current plan ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. All plans from Firestore
        const snap = await getDocs(collection(db, "plans"));
        const data: Plan[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Plan, "id">),
        }));
        data.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
        setAllPlans(data);

        // 2. Resolve current plan from user's membershipPlanId
        let current: Plan | null = null;
        if (user?.membershipPlanId) {
          const planDoc = await getDoc(doc(db, "plans", user.membershipPlanId));
          if (planDoc.exists()) {
            current = { id: planDoc.id, ...(planDoc.data() as Omit<Plan, "id">) };
          } else {
            // Fallback: match by id inside already-fetched data
            current = data.find((p) => p.id === user.membershipPlanId) ?? null;
          }
        }
        setCurrentPlan(current);

        // 3. Filter: only plans MORE expensive than current
        if (current) {
          setUpgradePlans(data.filter((p) => p.monthlyPrice > current!.monthlyPrice));
        } else {
          // No current plan → show all
          setUpgradePlans(data);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        toast.error("Could not load plans. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.membershipPlanId]);

  /* ── Upgrade price = new plan price − current plan price ── */
  const getUpgradePrice = (plan: Plan) => {
    if (!currentPlan) return plan.monthlyPrice;
    return Math.max(0, plan.monthlyPrice - currentPlan.monthlyPrice);
  };

  /* ── Razorpay payment ── */
  const handleSubscribe = async (targetPlanId: string) => {
    const plan = upgradePlans.find((p) => p.id === targetPlanId);
    if (!plan || !user) return;

    const upgradePrice = getUpgradePrice(plan);
    setProcessingPlan(plan.id);

    try {
      const resultAction = await dispatch(
        createRazorpayOrderAsync({
          planId: plan.id,
          price: upgradePrice,         // pay only the difference
          name: plan.name,
          description: currentPlan
            ? `Upgrade from ${currentPlan.name} → ${plan.name}`
            : plan.description,
          userId: user.id,
        })
      );

      if (createRazorpayOrderAsync.fulfilled.match(resultAction)) {
        const { orderId, amount, currency, keyId } = resultAction.payload;

        if (!Razorpay) {
          throw new Error("Razorpay SDK not loaded. Please try again.");
        }

        const options = {
          key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount,
          currency: currency as any,
          name: "AVR Cinema",
          description: currentPlan
            ? `Upgrade: ${currentPlan.name} → ${plan.name}`
            : `Subscribe to ${plan.name}`,
          order_id: orderId,
          prefill: {
            name: user.displayName || user.email?.split("@")[0] || "",
            email: user.email || "",
            contact: user.phone || "",
          },
          notes: { userId: user.id, planId: plan.id, planName: plan.name },
          theme: { color: "#DECB94" }, // Keeping hex for Razorpay config compatibility
          modal: {
            ondismiss: () => {
              setProcessingPlan(null);
              toast.info("Payment cancelled");
            },
          },
          handler: async (response: any) => {
            const loadingToast = toast.loading("Verifying payment…");
            try {
              const verifyAction = await dispatch(
                verifyRazorpayPaymentAsync({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                  planId: plan.id,
                  amount,
                  currency,
                  billingCycle: "monthly",
                })
              );
              toast.dismiss(loadingToast);
              if (verifyRazorpayPaymentAsync.fulfilled.match(verifyAction)) {
                toast.success("Plan upgraded successfully! 🎉");
                setProcessingPlan(null);

                // Save upgrade notification
                try {
                  await addDocument("notifications", {
                    userId: user.id,
                    title: "Plan Upgraded! 👑",
                    description: `You successfully upgraded to the ${plan.name} plan.`,
                    type: "membership",
                    image: "/assets/headerLogo.png",
                    read: false,
                    createdAt: Date.now(),
                    link: "/profile"
                  });
                } catch (err) {
                  console.error("Error creating upgrade notification:", err);
                }

                navigate("/profile");
              } else {
                toast.error((verifyAction.payload as string) || "Verification failed");
                setProcessingPlan(null);
              }
            } catch {
              toast.dismiss(loadingToast);
              toast.error("Payment verification failed");
              setProcessingPlan(null);
            }
          },
        };

        const rzp = new Razorpay(options as any);
        rzp.on("payment.failed", (r: any) => {
          toast.error(r.error?.description || "Payment failed");
          setProcessingPlan(null);
        });
        rzp.open();
      } else {
        toast.error((resultAction.payload as string) || "Failed to create order");
        setProcessingPlan(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setProcessingPlan(null);
    }
  };

  /* ────────────── UI ────────────── */
  return (
    <div
      className="min-h-screen flex flex-col bg-background bg-gradient-to-br from-background via-muted/20 to-background"
    >
      {/* ── Header (mobile only) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-b border-foreground/5">
        <div className="flex items-center justify-between px-4 pt-3 pb-4 max-w-[700px] mx-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            id="back-btn"
            className="focusable w-9 h-9 rounded-full bg-foreground/5 border-foreground/10 hover:bg-foreground/10 focus:bg-zinc-850 outline-none"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground tracking-wide">Upgrade Plan</h2>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 md:px-6 lg:px-10 pb-45 pt-20 md:pt-6 max-w-[700px] md:max-w-[1200px] mx-auto w-full">

        {/* ── Desktop Header ── */}
        <div className="hidden md:flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/profile")}
            className="focusable w-7 h-7 rounded-lg border-foreground/10 bg-foreground/5 hover:bg-foreground/10 focus:bg-zinc-850 outline-none"
            id="upgrade-plan-back-btn-desktop"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary-foreground to-primary-foreground/80 shadow-lg shadow-primary-foreground/20"
            >
              <Crown className="w-5 h-5 text-background" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Upgrade Your Plan</h1>
              <p className="text-sm mt-0.5 text-foreground/40">
                {currentPlan
                  ? `You're on ${currentPlan.name} · Only pay the difference`
                  : "Choose a plan to get started"}
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:block h-px bg-foreground/10 mt-1 mb-2" />

        {/* ── Hero (mobile only) ── */}
        <div className="md:hidden text-center flex flex-col gap-1.5 pt-1">
          <div
            className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br from-primary-foreground to-primary-foreground/80 shadow-lg shadow-primary-foreground/30"
          >
            <CrownIcon className="w-7 h-7 text-background" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-semibold text-foreground ">Upgrade Your Plan</h1>
          <p className="text-sm text-foreground/40">
            {currentPlan
              ? `You're on ${currentPlan.name} · Only pay the difference`
              : "Choose a plan to get started"}
          </p>
        </div>

        {/* ── Current Plan Pill ── */}
        {currentPlan && !loading && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary-foreground/[0.06] border border-primary-foreground/20"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-foreground/[0.08] border border-primary-foreground/[0.15]"
            >
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-foreground">
                Current Plan
              </p>
              <p className="text-foreground text-sm font-semibold truncate">{currentPlan.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-foreground font-semibold text-base">₹{currentPlan.monthlyPrice}</p>
              <p className="text-[10px] text-foreground/30">
                /month
              </p>
            </div>
          </div>
        )}

        {/* ── Plans ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg animate-pulse bg-foreground/5 border border-foreground/10 h-[300px]"
              />
            ))}
          </div>
        ) : upgradePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-foreground/[0.08] border border-primary-foreground/[0.15]"
            >
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-foreground font-semibold text-lg">You're on the best plan!</p>
            <p className="text-sm text-center px-6 text-foreground/40">
              No higher plans are available. You already have the maximum tier.
            </p>
          </div>
        ) : (
          <>
            {currentPlan && (
              <p className="text-xs font-semibold tracking-widest uppercase text-foreground/30">
                Available upgrades
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upgradePlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const upgradePrice = getUpgradePrice(plan);
                const savedAmount = currentPlan ? currentPlan.monthlyPrice : 0;

                return (
                  <div
                    key={plan.id}
                    tabIndex={0}
                    onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                    id={`plan-card-${plan.id}`}
                    className={`focusable relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border outline-none ${isSelected ? "border-[1.5px] border-primary-foreground scale-[1.01] bg-gradient-to-br from-primary-foreground/10 to-primary-foreground/5" : plan.popular ? "border-[1.5px] border-primary-foreground/25 bg-foreground/5" : "border-foreground/10 bg-foreground/5"}`}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div
                        className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl rounded-tr-3xl text-[10px] font-semibold tracking-widest bg-gradient-to-br from-primary-foreground to-primary-foreground/80 text-background"
                      >
                        POPULAR
                      </div>
                    )}

                    <div className="p-5 md:p-6 flex flex-col gap-4">
                      {/* Plan Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-foreground font-semibold text-lg leading-tight">{plan.name}</h2>
                          <p className="text-xs mt-0.5 text-foreground/40">
                            {plan.description}
                          </p>
                        </div>
                        {/* Selection circle */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-200 ${isSelected ? "bg-gradient-to-br from-primary-foreground to-primary-foreground/80 shadow-[0_2px_8px_rgba(var(--primary-foreground),0.4)]" : "border-[1.5px] border-foreground/20"}`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />}
                        </div>
                      </div>

                      {/* Pricing block */}
                      <div
                        className="rounded-2xl p-3 flex items-center justify-between bg-foreground/5"
                      >
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-foreground/30">
                            {currentPlan ? "You Pay (Upgrade)" : "Monthly Price"}
                          </p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span
                              className={`text-3xl font-bold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}
                            >
                              ₹{upgradePrice}
                            </span>
                            <span className="text-xs text-foreground/30">
                              /mo
                            </span>
                          </div>
                        </div>

                        {currentPlan && savedAmount > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] text-foreground/30">
                              Full price
                            </p>
                            <p className="text-sm font-semibold line-through text-foreground/30">
                              ₹{plan.monthlyPrice}
                            </p>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block bg-green-500/10 text-green-500"
                            >
                              Save ₹{savedAmount}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-foreground/10" />

                      {/* Features */}
                      <div className="flex flex-col gap-2.5">
                        {[
                          { key: "resolution", label: `${plan.resolution} Resolution`, value: true },
                          { key: "screens", label: `${plan.screens} Simultaneous Screen${plan.screens > 1 ? "s" : ""}`, value: true },
                          { key: "adFree", label: "Ad-free Video Playback", value: plan.adFree },
                          { key: "downloads", label: "Offline Download Support", value: plan.downloads },
                          { key: "dolbyAtmos", label: "Spatial Audio / Dolby Atmos", value: plan.dolbyAtmos },
                        ].map(({ key, label, value }) => (
                          <div key={key} className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-foreground/[0.1] text-primary-foreground"
                            >
                              {featureIcon(key)}
                            </div>
                            <span
                              className="text-sm flex-1 text-foreground/70"
                            >
                              {label}
                            </span>
                            {value ? (
                              <Check className="w-4 h-4 flex-shrink-0 text-primary-foreground" />
                            ) : (
                              <X className="w-4 h-4 flex-shrink-0 text-primary-foreground" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Card CTA */}
                      <div className="mt-6 pt-4 border-t border-foreground/10">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedPlan !== plan.id) setSelectedPlan(plan.id);
                            handleSubscribe(plan.id);
                          }}
                          tabIndex={-1}
                          disabled={!!processingPlan}
                          className={`w-full py-3.5 h-auto rounded-xl font-semibold text-sm transition-all duration-300 gap-2 ${isSelected && !processingPlan
                            ? "bg-gradient-to-br from-primary-foreground to-primary-foreground/80 text-background hover:opacity-90"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                            }`}
                        >
                          {processingPlan === plan.id ? (
                            <>
                              <span className="w-4 h-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>
                              <Crown className="w-4 h-4" />
                              Upgrade — Pay ₹{upgradePrice}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Fine print */}
        {upgradePlans.length > 0 && !loading && (
          <p className="text-center text-xs mt-2 text-foreground/50">
            Cancel anytime · Secure payment via Razorpay · No hidden charges
          </p>
        )}
      </div>

      {/* ── Sticky CTA removed ── */}
    </div>
  );
};
