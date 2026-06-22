import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { addDocument } from "@/Firebase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPlans, setLoading, setError, createRazorpayOrderAsync, verifyRazorpayPaymentAsync } from "@/store/slices/membershipSlice";
import { useRazorpay } from "react-razorpay";
import SubscriptionSuccess from "./SubscriptionSuccess";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CheckCircle2, MonitorSmartphone, X, Crown, ShieldCheck, AlertTriangle } from "lucide-react";
import { MembershipSkeleton } from "./MembershipSkeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { isTvPlatform } from "@/lib/tvUtils";

interface Plan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    popular: boolean;
    resolution: string;
    screens: number;
    adFree: boolean;
    downloads: boolean;
    dolbyAtmos: boolean;
}

export default function Membership() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useAppDispatch();
    const { plans, loading, paymentProcessing } = useAppSelector((state) => state.membership);
    const { user } = useAppSelector((state) => state.auth);
    const [localLoadingPlan, setLocalLoadingPlan] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
    const { Razorpay } = useRazorpay();

    const isSuccess = searchParams.get("success") === "true";
    const isTV = isTvPlatform();
    const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

    // If loaded on mobile with parameters (e.g. from scanning TV QR code), trigger payment flow automatically
    useEffect(() => {
        const selectPlanId = searchParams.get("selectPlan");
        const cycle = searchParams.get("cycle") || "monthly";
        
        if (selectPlanId && plans.length > 0 && user) {
            const plan = plans.find(p => p.id === selectPlanId);
            if (plan) {
                // Clear search params so it doesn't loop
                setSearchParams({});
                setBillingCycle(cycle as "monthly" | "yearly");
                // Trigger select plan after a small timeout to let SDK render
                setTimeout(() => {
                    handleSelectPlan(plan);
                }, 800);
            }
        }
    }, [plans, searchParams, user]);

    // On TV, watch user membership status to automatically mark success once paid on phone
    useEffect(() => {
        if (isTV && user?.membershipStatus === "active" && checkoutPlan) {
            toast.success("Payment completed successfully! 🎉");
            setSearchParams({ success: "true" });
            setCheckoutPlan(null);
        }
    }, [user?.membershipStatus, isTV, checkoutPlan]);

    useEffect(() => {
        dispatch(setLoading(true));

        const unsubscribe = onSnapshot(collection(db, "plans"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
            const sortedData = data.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
            dispatch(setPlans(sortedData));
            dispatch(setLoading(false));
        }, (error) => {
            console.error("Error fetching plans:", error);
            dispatch(setError(error.message));
            dispatch(setLoading(false));
            toast.error("Failed to load plans");
        });

        return () => unsubscribe();
    }, [dispatch]);

    const handleSkip = () => {
        navigate("/dashboard");
    };

    const handleSelectPlan = async (plan: Plan) => {
        // Clear previous errors
        setPaymentError(null);

        if (!user) {
            toast.error("Please sign in to subscribe");
            navigate("/signin"); // Modified to /signin to match router
            return;
        }

        if (isTV) {
            // TV mode: open QR code overlay
            setCheckoutPlan(plan);
            return;
        }

        if (localLoadingPlan) {
            toast.info("Please wait, processing...");
            return;
        }

        // Set loading state for this specific plan
        setLocalLoadingPlan(plan.id);

        const selectedPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
        const billingDesc = billingCycle === "monthly" ? "Monthly Subscription" : "Yearly Subscription";

        try {
            console.log("Creating order for plan:", plan.id, "Price:", selectedPrice);

            const resultAction = await dispatch(createRazorpayOrderAsync({
                planId: plan.id,
                price: selectedPrice,
                name: plan.name,
                description: `${plan.name} - ${billingDesc}`,
                userId: user.id,
            }));

            console.log("Order creation result:", resultAction);

            if (createRazorpayOrderAsync.fulfilled.match(resultAction)) {
                const { orderId, amount, currency, keyId } = resultAction.payload;

                console.log("Order created:", orderId, amount, currency);

                // Check if Razorpay is loaded
                if (!Razorpay) {
                    throw new Error("Razorpay SDK not loaded. Please wait a moment and try again.");
                }

                const options = {
                    key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: amount,
                    currency: currency as any,
                    name: "AVR Cinema",
                    description: `${plan.name} - ${billingCycle === "monthly" ? "Monthly" : "Yearly"} Subscription`,
                    order_id: orderId,
                    prefill: {
                        name: user.displayName || user.email?.split('@')[0] || "",
                        email: user.email || "",
                        contact: user.phone || "",
                    },
                    notes: {
                        userId: user.id,
                        planId: plan.id,
                        planName: plan.name,
                        billingCycle: billingCycle
                    },
                    theme: {
                        color: "#eab308",
                    },
                    modal: {
                        ondismiss: () => {
                            console.log("Payment modal closed");
                            setLocalLoadingPlan(null);
                            toast.info("Payment cancelled");
                        },
                    },
                    handler: async (response: any) => {
                        // console.log("Payment success response:", response);

                        const loadingToast = toast.loading("Verifying payment...");

                        try {
                            const verifyAction = await dispatch(verifyRazorpayPaymentAsync({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                userId: user.id,
                                planId: plan.id,
                                amount: amount,
                                currency: currency,
                                billingCycle: billingCycle
                            }));

                            toast.dismiss(loadingToast);

                            if (verifyRazorpayPaymentAsync.fulfilled.match(verifyAction)) {
                                toast.success("Payment successful! 🎉");
                                setLocalLoadingPlan(null);
                                setSearchParams({ success: "true" });

                                // Save membership notification
                                try {
                                    const startDate = Date.now();
                                    const durationDays = billingCycle === "monthly" ? 30 : 365;
                                    const endDate = startDate + durationDays * 24 * 60 * 60 * 1000;

                                    await addDocument("notifications", {
                                        userId: user.id,
                                        uid: user.id,
                                        planId: plan.id,
                                        startDate,
                                        endDate,
                                        title: "Subscription Purchased! 👑",
                                        description: `You successfully subscribed to the ${plan.name} plan.`,
                                        type: "membership",
                                        image: "/assets/headerLogo.png",
                                        read: false,
                                        createdAt: Date.now(),
                                        link: "/profile"
                                    });
                                } catch (err) {
                                    console.error("Error creating purchase notification:", err);
                                }
                            } else {
                                const errorMsg = (verifyAction.payload as string) || "Verification failed";
                                console.error("Verification failed:", errorMsg);
                                toast.error(errorMsg);
                                setPaymentError(errorMsg);
                                setLocalLoadingPlan(null);
                            }
                        } catch (verifyError: any) {
                            toast.dismiss(loadingToast);
                            console.error("Verification error:", verifyError);
                            toast.error("Payment verification failed");
                            setPaymentError("Payment verification failed. Please contact support.");
                            setLocalLoadingPlan(null);
                        }
                    },
                };

                const razorpay = new Razorpay(options as any);

                razorpay.on('payment.failed', (response: any) => {
                    console.error("Payment failed:", response.error);
                    const errorMsg = response.error?.description || "Payment failed. Please try again.";
                    toast.error(errorMsg);
                    setPaymentError(errorMsg);
                    setLocalLoadingPlan(null);
                });

                razorpay.open();
            } else {
                const errorMsg = (resultAction.payload as string) || "Failed to create order";
                console.error("Order creation failed:", errorMsg);
                toast.error(errorMsg);
                setPaymentError(errorMsg);
                setLocalLoadingPlan(null);
            }
        } catch (err: any) {
            console.error("Payment error:", err);
            toast.error(err.message || "Something went wrong");
            setPaymentError(err.message || "Payment failed");
            setLocalLoadingPlan(null);
        }
    };

    if (isSuccess) {
        return <SubscriptionSuccess />;
    }

    return (
        <div className="min-h-screen bg-black text-primary p-6 relative pb-20">
            {/* Payment Processing Overlay */}
            {paymentProcessing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                    <Spinner size="lg" className="text-primary-foreground" />
                    <div className="text-center">
                        <p className="text-white font-bold text-lg mb-1">Processing Payment</p>
                        <p className="text-zinc-400 text-sm px-4">Please do not close this window or click back.</p>
                    </div>
                </div>
            )}

            {/* Skip Button */}
            <button
                onClick={handleSkip}
                className="focusable absolute top-6 right-6 text-primary font-medium text-sm transition-colors z-10 flex items-center gap-1 focus:bg-zinc-800 focus:scale-105 px-3 py-1.5 rounded-lg border border-transparent focus:border-zinc-700 outline-none"
            >
                Skip
            </button>

            {/* Logo */}
            <div className="fixed top-0 left-0 right-0 pt-4 flex justify-center z-50 pointer-events-none bg-gradient-to-b from-black/80 to-transparent pb-4">
                <img
                    src="/assets/headerLogo.png"
                    alt="AVR Cinema"
                    className="h-10 md:h-14 w-auto object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
            </div>

            <div className="max-w-2xl md:max-w-6xl mx-auto pt-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Choose your plan</h1>
                    <p className="text-zinc-400 text-sm mb-6">Unlock endless entertainment. Cancel anytime.</p>

                    {/* Billing Cycle Switcher */}
                    <div className="flex justify-center items-center mb-4">
                        <ToggleGroup
                            type="single"
                            value={billingCycle}
                            onValueChange={(value) => {
                                if (value) setBillingCycle(value as "monthly" | "yearly");
                            }}
                            className="bg-zinc-950/80  rounded-md border border-zinc-800"
                        >
                            <ToggleGroupItem
                                value="monthly"
                                className="focusable rounded-md px-5 !py-1 text-sm font-semibold cursor-pointer data-[state=on]:bg-primary data-[state=on]:text-secondary text-zinc-400 hover:text-white hover:bg-transparent data-[state=on]:hover:bg-primary transition-all focus:bg-zinc-800"
                            >
                                Monthly
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="yearly"
                                className="focusable rounded-md px-5 text-sm font-semibold cursor-pointer data-[state=on]:bg-primary data-[state=on]:text-secondary text-zinc-400 hover:text-white hover:bg-transparent data-[state=on]:hover:bg-primary transition-all flex items-center gap-1.5 focus:bg-zinc-800"
                            >
                                Annually
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>

                {/* Payment Error Banner */}
                {paymentError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-red-300 text-sm">{paymentError}</p>
                            <button 
                                onClick={() => setPaymentError(null)}
                                className="focusable focusable text-red-400 hover:text-red-300 text-xs mt-2 underline focus:bg-zinc-800 rounded px-1"
                            >
                                Dismiss
                            </button>
                        </div>
                        <button  onClick={() => setPaymentError(null)} className="focusable focusable text-red-400 hover:text-red-300 p-1 focus:bg-zinc-800 rounded-full">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <MembershipSkeleton />
                ) : (
                    <>
                        {/* Desktop Cards Grid View */}
                        <div className="hidden md:grid md:grid-cols-3 gap-6 mt-8">
                            {plans.map((plan) => (
                                <Card
                                    key={plan.id}
                                    tabIndex={-1}
                                    className={`bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between relative overflow-hidden ${plan.popular ? "border-primary/60 ring-1 ring-primary/30" : ""
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 bg-primary text-secondary text-[10px] uppercase font-black px-3 py-1 rounded-bl-lg tracking-wider">
                                            Popular
                                        </div>
                                    )}
                                    <div>
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                                                {plan.name}
                                            </CardTitle>
                                            <CardDescription className="text-zinc-400 text-xs mt-1">
                                                {plan.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Price Section */}
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-primary">
                                                    ₹{billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                                                </span>
                                                <span className="text-xs text-zinc-500 font-medium">
                                                    / {billingCycle === "monthly" ? "month" : "year"}
                                                </span>
                                            </div>

                                            {/* Separator */}
                                            <div className="h-px bg-zinc-800/60 w-full" />

                                            {/* Features List */}
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <MonitorSmartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-xs text-white">Resolution</p>
                                                        <p className="text-zinc-400 text-xs">{plan.resolution}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-xs text-white">Active Screens</p>
                                                        <p className="text-zinc-400 text-xs">{plan.screens} devices at once</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2.5 pt-2">
                                                    {plan.adFree && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="text-xs text-zinc-300">Ad-free streaming</span>
                                                        </div>
                                                    )}
                                                    {plan.downloads && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="text-xs text-zinc-300">Download for offline viewing</span>
                                                        </div>
                                                    )}
                                                    {plan.dolbyAtmos && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                            <span className="text-xs text-zinc-300">Dolby Atmos audio support</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </div>

                                    <CardFooter className="pt-6 border-t border-zinc-800/40 flex flex-col gap-3">
                                        <Button
                                            className="focusable w-full bg-primary-foreground text-secondary hover:bg-primary-foreground/90 font-bold h-10 cursor-pointer text-sm focus:bg-[#DECB94]/85 focus:scale-102 outline-none"
                                            onClick={() => handleSelectPlan(plan)}
                                            disabled={!!localLoadingPlan}
                                        >
                                            {localLoadingPlan === plan.id ? (
                                                <>
                                                    <Spinner size="sm" className="mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Crown className="w-4 h-4 mr-2" />
                                                    Select {plan.name}
                                                </>
                                            )}
                                        </Button>
                                        {plan.yearlyPrice > 0 && (
                                            <p className="text-center text-[10px] text-zinc-500">
                                                {billingCycle === "monthly" ? (
                                                    `Or get yearly for ₹${plan.yearlyPrice} (Save ${(100 - (plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100).toFixed(0)}%)`
                                                ) : (
                                                    `Or get monthly for ₹${plan.monthlyPrice}`
                                                )}
                                            </p>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        {/* Mobile Accordion View */}
                        <div className="block md:hidden">
                            <Accordion type="single" collapsible className="w-full">
                                {plans.map((plan) => (
                                    <AccordionItem
                                        key={plan.id}
                                        value={plan.id}
                                        className={plan.popular ? "border-primary/50 relative" : ""}
                                    >
                                        <AccordionTrigger className="focusable hover:no-underline focus:bg-zinc-800 rounded px-2 outline-none">
                                            <div className="flex items-center justify-between w-full text-left pr-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-white">{plan.name}</span>
                                                        {plan.popular && (
                                                            <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full border border-primary/30">
                                                                Popular
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-400 font-normal">{plan.description}</p>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 ml-4">
                                                    <span className="font-bold text-white">
                                                        ₹{billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 font-normal">
                                                        / {billingCycle === "monthly" ? "month" : "year"}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <MonitorSmartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-sm">Resolution</p>
                                                            <p className="text-zinc-400 text-sm">{plan.resolution}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3">
                                                        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-sm">Active Screens</p>
                                                            <p className="text-zinc-400 text-sm">{plan.screens} devices at once</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pt-2">
                                                    {plan.adFree && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="text-sm text-zinc-300">Ad-free streaming</span>
                                                        </div>
                                                    )}
                                                    {plan.downloads && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                            <span className="text-sm text-zinc-300">Download for offline viewing</span>
                                                        </div>
                                                    )}
                                                    {plan.dolbyAtmos && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                            <span className="text-sm text-zinc-300">Dolby Atmos audio support</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-6 border-t border-zinc-800/50">
                                                    <Button
                                                        className="focusable w-full bg-primary-foreground text-secondary hover:bg-primary-foreground/90 font-bold h-10 cursor-pointer focus:bg-[#DECB94]/85 focus:scale-102 outline-none"
                                                        onClick={() => handleSelectPlan(plan)}
                                                        disabled={!!localLoadingPlan}
                                                    >
                                                        {localLoadingPlan === plan.id ? (
                                                            <>
                                                                <Spinner size="sm" className="mr-2" />
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Crown className="w-4 h-4 mr-2" />
                                                                Select {plan.name} ({billingCycle === "monthly" ? "Monthly" : "Annually"})
                                                            </>
                                                        )}
                                                    </Button>
                                                    {plan.yearlyPrice > 0 && (
                                                        <p className="text-center text-xs text-zinc-500 mt-3">
                                                            {billingCycle === "monthly" ? (
                                                                `Or get yearly for ₹${plan.yearlyPrice} (Save ${(100 - (plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100).toFixed(0)}%)`
                                                            ) : (
                                                                `Or get monthly for ₹${plan.monthlyPrice}`
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </>
                )}
            </div>

            {/* TV Mode QR Code Checkout Overlay */}
            {isTV && checkoutPlan && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl relative">
                        {/* Close button */}
                        <button 
                            onClick={() => setCheckoutPlan(null)}
                            className="focusable focusable absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 focus:bg-zinc-800 rounded-full border border-transparent focus:border-zinc-700 outline-none"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <Crown className="w-12 h-12 text-[#DECB94] animate-pulse" />
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold text-white">Subscribe on Your Phone</h2>
                            <p className="text-sm text-zinc-400">
                                You have selected the <span className="text-primary font-bold">{checkoutPlan.name}</span> plan ({billingCycle}).
                            </p>
                        </div>

                        {/* QR Code Container */}
                        <div className="bg-white p-5 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                    window.location.origin + "/membership?selectPlan=" + checkoutPlan.id + "&cycle=" + billingCycle
                                )}`}
                                alt="Checkout QR Code"
                                className="w-[180px] h-[180px]"
                            />
                        </div>

                        <div className="text-center space-y-3">
                            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                                Scan this QR code with your mobile camera to finish the Razorpay checkout securely on your phone.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-[#DECB94] bg-[#DECB94]/10 py-2 px-4 rounded-xl border border-[#DECB94]/20">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                                Waiting for phone payment to complete...
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}