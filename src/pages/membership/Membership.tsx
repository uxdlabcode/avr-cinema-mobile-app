import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
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
import { Button } from "@/components/ui/button";
import { CheckCircle2, MonitorSmartphone, X, Crown, ShieldCheck, AlertTriangle } from "lucide-react";
import { MembershipSkeleton } from "./MembershipSkeleton";
import { Spinner } from "@/components/ui/spinner";
import LogoImage from "@/assets/Media (3) 1.png";
import { toast } from "sonner";

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
    const { plans, loading } = useAppSelector((state) => state.membership);
    const { user } = useAppSelector((state) => state.auth);
    const [localLoadingPlan, setLocalLoadingPlan] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const { Razorpay } = useRazorpay();

    const isSuccess = searchParams.get("success") === "true";

    useEffect(() => {
        dispatch(setLoading(true));

        const unsubscribe = onSnapshot(collection(db, "plans"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
            const sortedData = data.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
            dispatch(setPlans(sortedData));
            dispatch(setLoading(false));
        }, (error) => {
            console.error("Error fetching plans realtime:", error);
            dispatch(setError(error.message));
            dispatch(setLoading(false));
        });

        return () => unsubscribe();
    }, [dispatch]);

    const handleSkip = () => {
        navigate("/dashboard");
    };

    const handleSelectPlan = async (plan: Plan) => {
        if (!user) {
            toast.error("Please sign in to subscribe to a plan");
            return;
        }

        // Prevent double-clicks while processing
        if (localLoadingPlan) return;

        setLocalLoadingPlan(plan.id);
        setPaymentError(null);
        
        try {
            const resultAction = await dispatch(createRazorpayOrderAsync({
                planId: plan.id,
                price: plan.monthlyPrice,
                name: plan.name,
                description: plan.description,
                userId: user.id,
            }));
            
            if (createRazorpayOrderAsync.fulfilled.match(resultAction)) {
                const { orderId, amount, currency } = resultAction.payload;
                
                const options: any = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: amount.toString(),
                    currency: currency,
                    name: "AVR Cinema",
                    description: `${plan.name} - Monthly Subscription`,
                    image: LogoImage,
                    order_id: orderId,
                    handler: async (res: any) => {
                        // Payment was successful — now verify on server
                        try {
                            toast.loading("Verifying payment...", { id: "payment-verify" });

                            const verifyAction = await dispatch(verifyRazorpayPaymentAsync({
                                razorpay_order_id: res.razorpay_order_id,
                                razorpay_payment_id: res.razorpay_payment_id,
                                razorpay_signature: res.razorpay_signature,
                                userId: user.id,
                                planId: plan.id,
                                amount: amount,
                                currency: currency
                            }));

                            toast.dismiss("payment-verify");

                            if (verifyRazorpayPaymentAsync.fulfilled.match(verifyAction)) {
                                toast.success("Payment successful! 🎉");
                                setSearchParams({ success: "true" });
                            } else {
                                const errorMsg = "Payment verification failed. Please contact support.";
                                setPaymentError(errorMsg);
                                toast.error(errorMsg);
                            }
                        } catch (err: any) {
                            toast.dismiss("payment-verify");
                            const errorMsg = "Payment verification error. Your payment may have been processed. Please contact support.";
                            setPaymentError(errorMsg);
                            toast.error(errorMsg);
                            console.error("Verification error", err);
                        }
                    },
                    prefill: {
                        name: user.displayName || "",
                        email: user.email || "",
                        contact: user.phone || "",
                    },
                    notes: {
                        userId: user.id,
                        planId: plan.id,
                        planName: plan.name,
                    },
                    theme: {
                        color: "#eab308",
                    },
                    modal: {
                        ondismiss: () => {
                            // User closed the Razorpay modal without completing
                            setLocalLoadingPlan(null);
                            toast.info("Payment cancelled");
                        },
                        confirm_close: true,
                        escape: true,
                    },
                    retry: {
                        enabled: true,
                        max_count: 3,
                    },
                };

                const rzp = new Razorpay(options);

                rzp.on("payment.failed", function (response: any) {
                    const errorDesc = response?.error?.description || "Payment failed";
                    const errorCode = response?.error?.code || "";
                    const errorReason = response?.error?.reason || "";
                    
                    console.error("Payment Failed:", { errorDesc, errorCode, errorReason });

                    let userMessage = "Payment failed. ";

                    // Map Razorpay error codes to user-friendly messages
                    if (errorCode === "BAD_REQUEST_ERROR") {
                        if (errorReason === "payment_failed") {
                            userMessage += "Your bank declined the transaction. Please try a different payment method.";
                        } else if (errorDesc.includes("OTP")) {
                            userMessage += "OTP verification failed. Please try again after some time.";
                        } else {
                            userMessage += "There was an issue with the payment details. Please try again.";
                        }
                    } else if (errorCode === "GATEWAY_ERROR") {
                        userMessage += "Your bank is currently facing issues. Please try again later or use a different payment method.";
                    } else if (errorCode === "SERVER_ERROR") {
                        userMessage += "A temporary server error occurred. Please try again after a few minutes.";
                    } else {
                        userMessage += errorDesc;
                    }

                    setPaymentError(userMessage);
                    toast.error(userMessage, { duration: 6000 });
                    setLocalLoadingPlan(null);
                });

                rzp.open();
            } else {
                const errorMsg = (resultAction.payload as string) || "Failed to create payment order. Please try again.";
                setPaymentError(errorMsg);
                toast.error(errorMsg);
                setLocalLoadingPlan(null);
            }
        } catch (err: any) {
            const errorMsg = "Something went wrong. Please try again.";
            setPaymentError(errorMsg);
            toast.error(errorMsg);
            console.error("Payment error:", err);
            setLocalLoadingPlan(null);
        }
    };

    if (isSuccess) {
        return <SubscriptionSuccess />;
    }

    return (
        <div className="min-h-screen bg-black text-primary p-6 relative pb-20">
            {/* Skip Button */}
            <button
                onClick={handleSkip}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white font-medium text-sm transition-colors z-10 flex items-center gap-1 bg-zinc-900/50 py-1.5 px-3 rounded-full border border-zinc-800"
            >
                Skip
            </button>

            {/* Fixed Logo at the top */}
            <div className="fixed top-0 left-0 right-0 pt-4 flex justify-center z-50 pointer-events-none bg-gradient-to-b from-black/80 to-transparent pb-4">
                <img src={LogoImage} alt="AVR Cinema" className="h-10 md:h-14 w-auto object-contain" />
            </div>

            <div className="max-w-2xl mx-auto pt-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Choose your plan</h1>
                    <p className="text-zinc-400 text-sm">Unlock endless entertainment. Cancel anytime.</p>
                </div>

                {/* Payment Error Banner */}
                {paymentError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-red-300 text-sm">{paymentError}</p>
                            <button
                                onClick={() => setPaymentError(null)}
                                className="text-red-400 hover:text-red-300 text-xs mt-2 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                        <button onClick={() => setPaymentError(null)} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <MembershipSkeleton />
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {plans.map((plan) => (
                            <AccordionItem
                                key={plan.id}
                                value={plan.id}
                                className={plan.popular ? "border-primary/50 relative" : ""}
                            >
                                <AccordionTrigger className="hover:no-underline">
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
                                            <span className="font-bold text-white">₹{plan.monthlyPrice}</span>
                                            <span className="text-[10px] text-zinc-500 font-normal">/ month</span>
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
                                                    <CheckCircle2 className="w-4 h-4 text-primary-foreground shrink-0" />
                                                    <span className="text-sm text-zinc-300">Ad-free streaming</span>
                                                </div>
                                            )}
                                            {plan.downloads && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-primary-foreground shrink-0" />
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
                                                className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-10"
                                                onClick={() => handleSelectPlan(plan)}
                                                disabled={!!localLoadingPlan}
                                            >
                                                {localLoadingPlan === plan.id ? (
                                                    <Spinner className="w-4 h-4 mr-2 border-black" />
                                                ) : (
                                                    <Crown className="w-4 h-4 mr-2" />
                                                )}
                                                {localLoadingPlan === plan.id ? "Processing..." : `Select ${plan.name}`}
                                            </Button>
                                            {plan.yearlyPrice > 0 && (
                                                <p className="text-center text-xs text-zinc-500 mt-3">
                                                    Or get yearly for ₹{plan.yearlyPrice} (Save {(100 - (plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100).toFixed(0)}%)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
