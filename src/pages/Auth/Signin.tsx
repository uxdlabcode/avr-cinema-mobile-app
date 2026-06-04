import { Wrench } from "lucide-react"
import { Link } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import loginImage from "@/assets/login.jpg"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"
export default function Signin() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-secondary p-6 md:p-10">
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    )
}
