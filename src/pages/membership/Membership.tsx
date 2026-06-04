import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPlans, setLoading, setError } from "@/store/slices/membershipSlice";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MonitorSmartphone, X, Crown, ShieldCheck } from "lucide-react";
import { MembershipSkeleton } from "./MembershipSkeleton";
import LogoImage from "@/assets/Media (3) 1.png";

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
    const dispatch = useAppDispatch();
    const { plans, loading } = useAppSelector((state) => state.membership);

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

    const handleSelectPlan = (planId: string) => {
        // Navigate to payment or handle selection
        // For now, let's just proceed to dashboard
        navigate("/dashboard");
    };

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
                                                className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-12"
                                                onClick={() => handleSelectPlan(plan.id)}
                                            >
                                                <Crown className="w-4 h-4 mr-2" /> Select {plan.name}
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
