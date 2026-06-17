import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { signupAsync } from "@/store/slices/authSlice";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function SignupForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [terms, setTerms] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [termsError, setTermsError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError("");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.toLowerCase());
    if (emailError) setEmailError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (confirmPasswordError) setConfirmPasswordError("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric characters, max 10 digits
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(val);
    if (phoneError) setPhoneError("");
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string, optional minus sign, and digits
    if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
      setAge(val);
    }
    if (ageError) setAgeError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setPhoneError("");
    setAgeError("");
    setTermsError("");

    const emailVal = email.trim().toLowerCase();

    let isValid = true;
    let hasToastBeenShown = false;

    if (!name.trim()) {
      setNameError("Full name is required");
      if (!hasToastBeenShown) {
        toast.error("Please fill in all required fields");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

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

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      if (!hasToastBeenShown) {
        toast.error("Passwords do not match");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

    if (!terms) {
      setTermsError("You must agree to the Terms of Service");
      if (!hasToastBeenShown) {
        toast.error("You must agree to the Terms of Service");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

    // Phone validation (optional field but must be digits only, max 10)
    if (phone && phone.length > 10) {
      setPhoneError("Phone number must be at most 10 digits");
      if (!hasToastBeenShown) {
        toast.error("Phone number must be at most 10 digits");
        hasToastBeenShown = true;
      }
      isValid = false;
    }

    // Age validation (optional, but if provided must be a number between -200 and 200... user says max 200, can be negative)
    if (age !== "") {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum)) {
        setAgeError("Please enter a valid age");
        if (!hasToastBeenShown) {
          toast.error("Please enter a valid age");
          hasToastBeenShown = true;
        }
        isValid = false;
      } else if (ageNum > 200) {
        setAgeError("Age cannot exceed 200");
        if (!hasToastBeenShown) {
          toast.error("Age cannot exceed 200");
          hasToastBeenShown = true;
        }
        isValid = false;
      }
    }

    if (!isValid) {
      return;
    }

    setLoading(true);
    try {
      const ageNum = age !== "" ? parseInt(age, 10) : null;
      const resultAction = await dispatch(signupAsync({ name, email: emailVal, password, phone: phone || undefined, age: ageNum }));

      if (signupAsync.fulfilled.match(resultAction)) {
        toast.success("Account created successfully!");
        navigate("/dashboard");
      } else {
        if (resultAction.payload) {
          toast.error(resultAction.payload as string);
        } else {
          toast.error("Signup failed");
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
      <form noValidate className="flex-1 flex flex-col gap-3 w-full" onSubmit={handleSubmit} tabIndex={-1} {...props}>
        <FieldGroup className="gap-6">
          <div className="flex flex-col items-center gap-1 text-center mb-1">
            <img src="/assets/headerLogo.png" alt="AVR Cinema" className="h-20 w-auto object-contain mb-2" />
            <h1 className="text-2xl font-bold text-primary">Create an Account</h1>
            <p className="text-primary/70 text-sm">
              Sign up now to get started with an account.
            </p>
          </div>

          <Field data-invalid={!!nameError} className="gap-2">
            <FieldLabel htmlFor="name" className="text-primary/90">
              Full Name<span className="text-red-500">*</span>
            </FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={handleNameChange}
              className="focusable h-10 rounded-md"
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          {/* Phone & Age — single row */}
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!phoneError} className="gap-2">
              <FieldLabel htmlFor="phone" className="text-primary/90">
                Phone <span className="text-primary/40 font-normal text-xs">(Optional)</span>
              </FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                placeholder="1234567890"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={10}
                className="focusable h-10 rounded-md"
              />
              {phoneError && <FieldError>{phoneError}</FieldError>}
            </Field>

            <Field data-invalid={!!ageError} className="gap-2">
              <FieldLabel htmlFor="age" className="text-primary/90">
                Age <span className="text-primary/40 font-normal text-xs">(Optional)</span>
              </FieldLabel>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="e.g. 25"
                value={age}
                onChange={handleAgeChange}
                className="focusable h-10 rounded-md"
              />
              {ageError && <FieldError>{ageError}</FieldError>}
            </Field>
          </div>

          <Field data-invalid={!!emailError} className="gap-2">
            <FieldLabel htmlFor="email" className="text-primary/90">
              Email Address<span className="text-red-500">*</span>
            </FieldLabel>
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
            <FieldLabel htmlFor="password" className="text-primary/90">
              Password<span className="text-red-500">*</span>
            </FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
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

          <Field data-invalid={!!confirmPasswordError} className="gap-2">
            <FieldLabel htmlFor="confirmPassword" className="text-primary/90">
              Confirm Password<span className="text-red-500">*</span>
            </FieldLabel>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                disabled={loading}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
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
            {confirmPasswordError && <FieldError>{confirmPasswordError}</FieldError>}
          </Field>



          <Field data-invalid={!!termsError} className="gap-1.5 mt-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={terms}
                onCheckedChange={(checked) => {
                  setTerms(!!checked);
                  if (termsError) setTermsError("");
                }}
                className="focusable border-primary data-[state=checked]:bg-primary data-[state=checked]:text-secondary rounded-sm w-4 h-4 bg-white"
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary/90 text-left"
              >
                I have read and agree to the <a href="#" className="focusable font-semibold text-primary hover:underline px-1 py-0.5 focus:bg-zinc-800 rounded">Terms of Service</a>
              </label>
            </div>
            {termsError && <FieldError>{termsError}</FieldError>}
          </Field>

          <Field className="mt-2">
            <Button type="submit" className="focusable cursor-pointer w-full bg-primary text-secondary hover:bg-primary/90 font-semibold h-10 text-base focus:bg-primary/80 focus:scale-102" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Get Started"
              )}
            </Button>
          </Field>

          <div className="text-center text-sm text-primary/80 mt-2">
            Already have an account?{" "}
            <Link to="/signin" className="focusable font-semibold text-primary hover:underline px-2 py-1 focus:bg-zinc-800 rounded">
              Log in
            </Link>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
