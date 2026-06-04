import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { emailPasswordLogin, getMatchingData } from "@/Firebase";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/userSlice";
import type { AppDispatch } from "@/store";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/Firebase/firebase";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string) || "";
    const password = (fd.get("password") as string) || "";

    const authRes = await emailPasswordLogin(email, password);
    if (!authRes) {
      toast.error("Invalid credentials");
      setLoading(false);
      return;
    }

    // Fetch user document by email
    const users = await getMatchingData("users", "email", "==", email);
    const userDoc = users && users.length > 0 ? users[0] : null;

    const role = (userDoc?.role || "").toLowerCase();
    if (role !== "superadmin") {
      toast.error("Access denied. Only superadmins can log in.");
      await auth.signOut();
      setLoading(false);
      return;
    }

    const uid =
      userDoc?.id ||
      (typeof authRes !== "boolean" ? authRes.user?.uid : null) ||
      null;

    // Update redux
    dispatch(
      setUser({
        uid: uid,
        email: email,
        role: role,
      })
    );

    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
              Forgot your password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field>
          <Button type="submit" className="cursor-pointer" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
