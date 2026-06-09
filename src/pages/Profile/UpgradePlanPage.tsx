import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { ArrowLeft, Check, X, Zap, Shield, Download, Monitor, Wifi, Crown, CrownIcon, Sparkles } from "lucide-react";
import LogoImage from "@/assets/Media (3) 1.png";
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
  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    const plan = upgradePlans.find((p) => p.id === selectedPlan);
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
          theme: { color: "#DECB94" },
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
                })
              );
              toast.dismiss(loadingToast);
              if (verifyRazorpayPaymentAsync.fulfilled.match(verifyAction)) {
                toast.success("Plan upgraded successfully! 🎉");
                setProcessingPlan(null);
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
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0a0a0f 0%, #0f0d1a 50%, #0a0a0f 100%)" }}
    >
      {/* ── Header ── */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/90 border-b border-white/5">
        <div className="flex items-center justify-between px-4 pt-6 pb-4 max-w-[700px] mx-auto">
        <button
          onClick={() => navigate(-1)}
          id="back-btn"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-lg font-semibold text-white tracking-wide">Upgrade Plan</h2>
        <div className="w-9" />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-45 pt-[88px] max-w-[700px] mx-auto w-full">
        {/* ── Hero ── */}
        <div className="text-center flex flex-col gap-1.5 pt-1">
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
            style={{
              background: "linear-gradient(135deg, var(--primary-foreground) 0%, #b89a5a 100%)",
              boxShadow: "0 8px 32px color-mix(in srgb, var(--primary-foreground) 35%, transparent)",
            }}
          >
            <CrownIcon className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Upgrade Your Plan</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {currentPlan
              ? `You're on ${currentPlan.name} · Only pay the difference`
              : "Choose a plan to get started"}
          </p>
        </div>

        {/* ── Current Plan Pill ── */}
        {currentPlan && !loading && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary-foreground/[0.06] border border-primary-foreground/20"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-foreground/[0.15]"
            >
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-foreground">
                Current Plan
              </p>
              <p className="text-white text-sm font-semibold truncate">{currentPlan.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white font-semibold text-base">₹{currentPlan.monthlyPrice}</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                /month
              </p>
            </div>
          </div>
        )}

        {/* ── Plans ── */}
        {loading ? (
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-3xl animate-pulse"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  height: 230,
                }}
              />
            ))}
          </div>
        ) : upgradePlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-foreground/[0.08] border border-primary-foreground/[0.15]"
            >
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-white font-semibold text-lg">You're on the best plan!</p>
            <p className="text-sm text-center px-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              No higher plans are available. You already have the maximum tier.
            </p>
          </div>
        ) : (
          <>
            {currentPlan && (
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                Available upgrades
              </p>
            )}
            <div className="flex flex-col gap-4">
              {upgradePlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const upgradePrice = getUpgradePrice(plan);
                const savedAmount = currentPlan ? currentPlan.monthlyPrice : 0;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                    id={`plan-card-${plan.id}`}
                    className="relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
                    style={{
                      border: isSelected
                        ? "1.5px solid var(--primary-foreground)"
                        : plan.popular
                          ? "1.5px solid color-mix(in srgb, var(--primary-foreground) 25%, transparent)"
                          : "1px solid rgba(255,255,255,0.09)",
                      background: isSelected
                        ? "linear-gradient(135deg, color-mix(in srgb, var(--primary-foreground) 8%, transparent) 0%, rgba(184,154,90,0.04) 100%)"
                        : "rgba(255,255,255,0.03)",
                      boxShadow: isSelected
                        ? "0 0 30px color-mix(in srgb, var(--primary-foreground) 12%, transparent), inset 0 1px 0 color-mix(in srgb, var(--primary-foreground) 10%, transparent)"
                        : "none",
                      transform: isSelected ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div
                        className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl rounded-tr-3xl text-[10px] font-semibold tracking-widest"
                        style={{
                          background: "linear-gradient(135deg, var(--primary-foreground) 0%, #b89a5a 100%)",
                          color: "#000",
                        }}
                      >
                        POPULAR
                      </div>
                    )}

                    <div className="p-5 flex flex-col gap-4">
                      {/* Plan Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-white font-semibold text-lg leading-tight">{plan.name}</h2>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {plan.description}
                          </p>
                        </div>
                        {/* Selection circle */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-200"
                          style={
                            isSelected
                              ? {
                                background: "linear-gradient(135deg, var(--primary-foreground), #b89a5a)",
                                boxShadow: "0 2px 8px color-mix(in srgb, var(--primary-foreground) 40%, transparent)",
                              }
                              : { border: "1.5px solid rgba(255,255,255,0.2)" }
                          }
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                        </div>
                      </div>

                      {/* Pricing block */}
                      <div
                        className="rounded-2xl p-3 flex items-center justify-between"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {currentPlan ? "You Pay (Upgrade)" : "Monthly Price"}
                          </p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span
                              className={`text-3xl font-bold ${isSelected ? "text-primary-foreground" : "text-white"}`}
                            >
                              ₹{upgradePrice}
                            </span>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                              /mo
                            </span>
                          </div>
                        </div>

                        {currentPlan && savedAmount > 0 && (
                          <div className="text-right">
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                              Full price
                            </p>
                            <p className="text-sm font-semibold line-through" style={{ color: "rgba(255,255,255,0.3)" }}>
                              ₹{plan.monthlyPrice}
                            </p>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
                            >
                              Save ₹{savedAmount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

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
                              className="text-sm flex-1"
                              style={{ color: "rgba(255,255,255,0.75)" }}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Fine print */}
        {upgradePlans.length > 0 && !loading && (
          <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
            Cancel anytime · Secure payment via Razorpay · No hidden charges
          </p>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      {upgradePlans.length > 0 && !loading && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-20 md:pb-6 pt-4"
          style={{ 
            backgroundColor: "#0a0a0f", 
            boxShadow: "0 -24px 30px #0a0a0f" 
          }}
        >
          <div className="max-w-[700px] mx-auto w-full">
          {selectedPlan && currentPlan && (
            <div
              className="flex items-center justify-between mb-3 px-4 py-3 rounded-2xl relative bg-[#16161d] border border-primary-foreground/20"
            >
              <div className="flex items-center gap-2">
                <CrownIcon className="w-3.5 h-3.5 text-primary-foreground" />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {currentPlan.name}
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                <span className="text-xs font-semibold text-white">
                  {upgradePlans.find((p) => p.id === selectedPlan)?.name} 
                </span>
              </div>
              <span className="text-sm font-semibold text-primary-foreground">
                ₹{getUpgradePrice(upgradePlans.find((p) => p.id === selectedPlan)!)} due now
              </span>
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={!selectedPlan || !!processingPlan}
            id="subscribe-btn"
            className="w-full py-4 rounded-2xl font-semibold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
            style={
              selectedPlan && !processingPlan
                ? {
                  background: "linear-gradient(135deg, var(--primary-foreground) 0%, #b89a5a 100%)",
                  color: "#000",
                  boxShadow: "0 8px 32px color-mix(in srgb, var(--primary-foreground) 30%, transparent)",
                }
                : {
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)",
                  cursor: "not-allowed",
                }
            }
          >
            {processingPlan ? (
              <>
                <span
                  className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"
                />
                Processing…
              </>
            ) : selectedPlan ? (
              <>
                <Crown className="w-4 h-4" />
                Upgrade — Pay ₹{getUpgradePrice(upgradePlans.find((p) => p.id === selectedPlan)!)}
              </>
            ) : (
              "Select a Plan to Upgrade"
            )}
          </button>
          </div>
        </div>
      )}
    </div>
  );
};
