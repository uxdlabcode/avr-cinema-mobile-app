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
// import { emailPasswordLogin, getMatchingData } from "@/Firebase"; // Removed Firebase for JWT
import { useAppDispatch } from "@/store/hooks";
import { loginAsync } from "@/store/slices/authSlice";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import LogoImage from "@/assets/Media (3) 1.png";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string) || "";
    const password = (fd.get("password") as string) || "";

    try {
      // Dispatch JWT login action
      const resultAction = await dispatch(loginAsync({ email, password }));

      if (loginAsync.fulfilled.match(resultAction)) {
        toast.success("Login successful");
        navigate("/dashboard");
      } else {
        if (resultAction.payload) {
          toast.error(resultAction.payload as string);
        } else {
          toast.error("Login failed");
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup className="gap-6">
        <div className="flex flex-col items-center gap-1 text-center mb-4">
          <img src={LogoImage} alt="AVR Cinema" className="h-20 w-auto object-contain mb-2" />
          <h1 className="text-2xl font-bold text-primary">Log in to your Account</h1>
          <p className="text-primary/70 text-sm">
            Welcome back, please enter your details.
          </p>
        </div>
        <Field className="gap-2">
          <FieldLabel htmlFor="email" className="text-primary/90">Email Address</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="sarah@gmail.com" required className="bg-transparent border-primary/20 text-primary placeholder:text-primary/40 focus-visible:ring-primary/50" />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="password" className="text-primary/90">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••"
              disabled={loading}
              className="bg-transparent border-primary/20 text-primary placeholder:text-primary/40 focus-visible:ring-primary/50 tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 cursor-pointer text-primary/60 hover:text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-secondary rounded-sm w-4 h-4" defaultChecked />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary/90"
            >
              Remember me
            </label>
          </div>
          <a href="#" className="text-sm font-bold text-primary hover:underline">
            Forgot Password?
          </a>
        </div>
        <Field className="mt-2">
          <Button type="submit" className="cursor-pointer w-full bg-primary text-secondary hover:bg-primary/90 font-bold h-12 text-base" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
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
              "Log in"
            )}
          </Button>
        </Field>
        <div className="text-center text-sm text-primary/80 mt-2">
          Don't have an account?{" "}
          <Link to="/signup" className="font-bold text-primary hover:underline">
            Sign Up
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
