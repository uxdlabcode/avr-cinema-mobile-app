import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getMatchingData } from "@/Firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, AlertCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError("");

    const emailVal = email.trim().toLowerCase();
    if (!emailVal) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user exists in Firestore 'users' collection
      const users = await getMatchingData("users", "email", "==", emailVal);
      if (!users || users.length === 0) {
        setEmailError("Invalid user — this email is not registered.");
        toast.error("Invalid user: Email not registered.");
        return;
      }

      // 2. Send reset email via Cloud Function
      const fns = getFunctions();
      const sendForgotPasswordEmail = httpsCallable(fns, "sendForgotPasswordEmail");
      await sendForgotPasswordEmail({ email: emailVal });

      setSuccess(true);
      toast.success("Reset link sent! Check your email.");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      toast.error(err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#141414] p-6 md:p-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/assets/headerLogo.png"
            alt="AVR Cinema"
            className="h-12 w-auto object-contain"
          />
        </div>

        {success ? (
          /* ── Success card ── */
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-7 shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Check your Email</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                We've sent a reset link to{" "}
                <span className="text-white font-semibold">{email}</span>.
                {" "}The link expires in 15 minutes.
              </p>
            </div>
            <Link to="/signin" className="w-full">
              <Button className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm">
                Back to Log In
              </Button>
            </Link>
          </div>
        ) : (
          /* ── Email form ── */
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-7 shadow-xl">
            <h1 className="text-xl font-bold text-white text-center mb-1">Forgot Password?</h1>
            <p className="text-zinc-400 text-sm text-center mb-5">
              Enter your registered email and we'll send you a reset link.
            </p>

            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fp-email" className="text-sm font-medium text-zinc-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <Input
                    id="fp-email"
                    type="email"
                    placeholder="sarah@gmail.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    className="h-10 pl-10 bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                {emailError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {emailError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Sending link...
                  </span>
                ) : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center mt-5">
              <Link
                to="/signin"
                className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
