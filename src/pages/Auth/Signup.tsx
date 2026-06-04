import { Wrench } from "lucide-react"
import { Link } from "react-router-dom"
import { SignupForm } from "@/components/signup-form"
import loginImage from "@/assets/login.jpg"
import { motion } from "framer-motion"


export default function Signup() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-secondary p-6 md:p-10">

            <div className="w-full max-w-sm">
                <SignupForm />
            </div>
        </div>
    )
}
