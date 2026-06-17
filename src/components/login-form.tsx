import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
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


export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.toLowerCase());
    if (emailError) {
      setEmailError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setEmailError("");
    setPasswordError("");

    const emailVal = email.trim().toLowerCase();

    let isValid = true;
    let hasToastBeenShown = false;

    if (!emailVal) {
      setEmailError("Email address is required");
      if (!hasToastBeenShown) {
        toast.error("Please fill in all required fields");
        hasToastBeenShown = true;
      }
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailError("Please enter a valid email address");
      if (!hasToastBeenShown) {
        toast.error("Please enter a valid email address");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      if (!hasToastBeenShown) {
        toast.error("Please fill in all required fields");
        hasToastBeenShown = true;
      }
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      if (!hasToastBeenShown) {
        toast.error("Password must be at least 6 characters");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      const resultAction = await dispatch(loginAsync({ email: emailVal, password }));

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
    <div className={cn("w-full", className)}>
      <form noValidate className="flex-1 flex flex-col gap-6 w-full" onSubmit={handleSubmit} tabIndex={-1} {...props}>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-center gap-1 text-center mb-4">
            <img src="/assets/headerLogo.png" alt="AVR Cinema" className="h-20 w-auto object-contain mb-2" />
            <h1 className="text-2xl font-bold text-primary">Log in to your Account</h1>
            <p className="text-primary/70 text-sm">
              Welcome back, please enter your details.
            </p>
          </div>

          <Field data-invalid={!!emailError} className="gap-2">
            <FieldLabel htmlFor="email" className="text-primary/90">Email Address</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="sarah@gmail.com"
              value={email}
              onChange={handleEmailChange}
              className="focusable h-10 rounded-md"
            />
            {emailError && <FieldError>{emailError}</FieldError>}
          </Field>

          <Field data-invalid={!!passwordError} className="gap-2">
            <FieldLabel htmlFor="password" className="text-primary/90">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                disabled={loading}
                value={password}
                onChange={handlePasswordChange}
                className="focusable h-10 rounded-md"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="focusable absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 cursor-pointer text-primary/60 hover:text-primary focus:bg-zinc-800 rounded"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordError && <FieldError>{passwordError}</FieldError>}
          </Field>

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="focusable border-primary data-[state=checked]:bg-primary data-[state=checked]:text-secondary rounded-sm w-4 h-4" defaultChecked />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary/90"
              >
                Remember me
              </label>
            </div>
            <a href="#" className="focusable text-sm font-bold text-primary hover:underline px-2 py-1 focus:bg-zinc-800 rounded">
              Forgot Password?
            </a>
          </div>

          <Field className="mt-2">
            <Button type="submit" className="focusable cursor-pointer w-full bg-primary text-secondary hover:bg-primary/90 font-semibold h-10 text-base focus:bg-primary/80 focus:scale-102" disabled={loading}>
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
            <Link to="/signup" className="focusable font-semibold text-primary hover:underline px-2 py-1 focus:bg-zinc-800 rounded">
              Sign Up
            </Link>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
