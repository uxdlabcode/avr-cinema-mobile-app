import { SignupForm } from "@/components/signup-form"

export default function Signup() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[#141414] p-6 md:p-10">
            <div className="w-full max-w-md">
                <SignupForm />
            </div>
        </div>
    )
}
