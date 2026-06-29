import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmPasswordError("");

    let valid = true;
    if (!password) {
      setPasswordError("New password is required");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const fns = getFunctions();
      const resetPasswordWithToken = httpsCallable(fns, "resetPasswordWithToken");
      await resetPasswordWithToken({ token, newPassword: password });
      setSuccess(true);
      toast.success("Password updated successfully!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err?.message || "Reset link may have expired. Please request a new one.");
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

        {/* ── No token ── */}
        {!token ? (
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-7 shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Invalid Reset Link</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                This link is invalid or has expired. Please request a new password reset link.
              </p>
            </div>
            <Link to="/forgot-password" className="w-full">
              <Button variant="outline" className="w-full h-10 font-semibold text-sm">
                Request New Link
              </Button>
            </Link>
          </div>

        ) : success ? (
          /* ── Success ── */
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-7 shadow-xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Password Updated!</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
            </div>
            <a href="https://avr-cinema-mobile-app.pages.dev/signin" className="w-full">
              <Button className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm">
                Go to Log In
              </Button>
            </a>
          </div>

        ) : (
          /* ── Password form ── */
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-7 shadow-xl">
            <h1 className="text-xl font-bold text-white text-center mb-1">Reset Password</h1>
            <p className="text-zinc-400 text-sm text-center mb-5">
              Set a new password for{" "}
              <span className="text-white font-medium">{email}</span>
            </p>

            <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rp-password" className="text-sm font-medium text-zinc-300">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <Input
                    id="rp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    className="h-10 pl-10 pr-10 "
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rp-confirm" className="text-sm font-medium text-zinc-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <Input
                    id="rp-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(""); }}
                    className="h-10 pl-10 pr-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm mt-1"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Updating...
                  </span>
                ) : "Reset Password"}
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
