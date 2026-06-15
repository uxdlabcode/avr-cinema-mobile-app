import { SignupForm } from "@/components/signup-form"
import { isTvPlatform } from "@/lib/tvUtils"

export default function Signup() {
    const isTV = isTvPlatform();
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[#141414] p-6 md:p-10">
            <div className={`w-full ${isTV ? "max-w-4xl bg-zinc-900/40 p-8 md:p-12 rounded-3xl border border-zinc-800/80 shadow-2xl" : "max-w-md"}`}>
                <SignupForm />
            </div>
        </div>
    )
}
