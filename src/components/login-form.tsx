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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginAsync, clearBlockedDevices, setAuthUser } from "@/store/slices/authSlice";
import { useState } from "react";
import { Eye, EyeOff, Monitor, Smartphone, MapPin, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { revokeDevice, getBrowserInfo, buildLocationInfo, getDeviceId, saveDevice } from "@/lib/deviceManager";
import type { DeviceEntry } from "@/lib/deviceManager";
import { getDocumentData } from "@/Firebase";
import { auth } from "@/Firebase/firebase";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const blockedDevices = useAppSelector((s) => s.auth.blockedDevices);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const pendingUid = useAppSelector((s) => s.auth.pendingUid);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.toLowerCase());
    if (emailError) setEmailError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous device-limit state
    dispatch(clearBlockedDevices());

    setEmailError("");
    setPasswordError("");

    const emailVal = email.trim().toLowerCase();
    let isValid = true;
    let hasToastBeenShown = false;

    if (!emailVal) {
      setEmailError("Email is required");
      if (!hasToastBeenShown) { toast.error("Please fill in all required fields"); hasToastBeenShown = true; }
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailError("Please enter a valid email address");
      if (!hasToastBeenShown) { toast.error("Please enter a valid email address"); hasToastBeenShown = true; }
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      if (!hasToastBeenShown) { toast.error("Please fill in all required fields"); hasToastBeenShown = true; }
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      if (!hasToastBeenShown) { toast.error("Password must be at least 6 characters"); hasToastBeenShown = true; }
      isValid = false;
    }

    if (!isValid) return;

    setLoading(true);
    try {
      sessionStorage.setItem("avr_login_pending", "true");
      const resultAction = await dispatch(loginAsync({ email: emailVal, password }));

      if (loginAsync.fulfilled.match(resultAction)) {
        toast.success("Login successful");
        navigate("/dashboard");
      } else {
        const payload = resultAction.payload as any;
        if (payload?.type === "DEVICE_LIMIT") {
          toast.error("Device limit reached. Logout from an active device to proceed.");
        } else {
          toast.error(
            typeof payload === "string" ? payload : payload?.message || "Login failed"
          );
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      sessionStorage.removeItem("avr_login_pending");
      setLoading(false);
    }
  };

  /** Revoke a specific device from the locked-out screen. */
  const handleRevokeBlocked = async (device: DeviceEntry) => {
    if (!pendingUid) {
      toast.error("Unable to identify your account. Please try logging in again.");
      return;
    }
    setRevokingId(device.deviceId);
    sessionStorage.setItem("avr_login_pending", "true");
    try {
      await revokeDevice(pendingUid, device.deviceId);
      toast.success(`Logged out from ${device.deviceName}`);

      // Automatically re-attempt login without flashing the sign-in form
      const emailVal = email.trim().toLowerCase();
      let loggedIn = false;

      if (emailVal && password) {
        const result = await dispatch(loginAsync({ email: emailVal, password }));
        if (loginAsync.fulfilled.match(result)) {
          loggedIn = true;
        }
      }

      // Fallback direct registration if loginAsync could not execute or fulfill
      if (!loggedIn) {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === pendingUid) {
          const [browserInfo, locationInfo] = await Promise.all([
            Promise.resolve(getBrowserInfo()),
            buildLocationInfo(),
          ]);
          const deviceId = getDeviceId();
          const deviceResult = await saveDevice(pendingUid, currentUser.email || emailVal || "", {
            deviceId,
            deviceName: browserInfo.deviceName,
            browser: browserInfo.browser,
            platform: browserInfo.platform,
            os: browserInfo.os,
            ip: locationInfo.ip,
            city: locationInfo.city,
            country: locationInfo.country,
            latitude: locationInfo.latitude,
            longitude: locationInfo.longitude,
          });

          if (deviceResult.allowed) {
            sessionStorage.setItem("device_session_active", "true");
            sessionStorage.setItem("avr_session_device_id", deviceId);
            const token = await currentUser.getIdToken();
            const userDoc = await getDocumentData("users", pendingUid);
            const role = (userDoc?.role || "user").toLowerCase();
            dispatch(setAuthUser({
              user: {
                id: userDoc?.id || pendingUid,
                email: currentUser.email || emailVal || "",
                role,
                name: userDoc?.name,
                phone: userDoc?.phone,
                avatar: userDoc?.avatar,
                membershipPlanId: userDoc?.membershipPlanId,
                membershipStatus: userDoc?.membershipStatus,
              },
              token,
            }));
            loggedIn = true;
          }
        }
      }

      sessionStorage.removeItem("device_limit_blocked");
      dispatch(clearBlockedDevices());

      if (loggedIn) {
        toast.success("Login successful");
        navigate("/dashboard");
      }
    } catch {
      toast.error("Failed to logout from that device");
    } finally {
      sessionStorage.removeItem("avr_login_pending");
      setRevokingId(null);
    }
  };

  // ─── Device Limit Modal ─────────────────────────────────────────────────────
  if (blockedDevices) {
    return (
      <div className={cn("w-full", className)}>
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <img src="/assets/headerLogo.png" alt="AVR Cinema" className="h-16 w-auto object-contain mb-1" />
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-1">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Device Limit Reached</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You're already signed in on <strong>2 devices</strong>. Log out from one to continue.
          </p>
        </div>

        {/* Active Devices */}
        <div className="flex flex-col gap-3 mb-6">
          {blockedDevices.map((device) => {
            const isRevokingThis = revokingId === device.deviceId;
            const locationStr = [device.city, device.country].filter(Boolean).join(", ") || "Unknown location";
            const loginDate = device.loginTime
              ? new Date(
                  typeof device.loginTime === "object" && device.loginTime.seconds
                    ? device.loginTime.seconds * 1000
                    : device.loginTime
                ).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              : "Unknown";
            const isMobile = device.platform === "Mobile" || device.platform === "Tablet";

            return (
              <div
                key={device.deviceId}
                className="flex flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border/50 bg-muted/20"
              >
                <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {isMobile ? (
                      <Smartphone className="w-5 h-5 text-primary" />
                    ) : (
                      <Monitor className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {device.deviceName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{locationStr}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Logged in {loginDate}</p>
                  </div>
                </div>
                <Button
                  id={`revoke-blocked-${device.deviceId}`}
                  variant="destructive"
                  size="sm"
                  disabled={isRevokingThis}
                  onClick={() => handleRevokeBlocked(device)}
                  className="focusable shrink-0 h-8 px-3 text-xs font-semibold gap-1.5"
                >
                  {isRevokingThis ? (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Logging out…
                    </span>
                  ) : (
                    <>
                      <LogOut className="w-3 h-3" />
                      Log Out
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <Button
          id="device-limit-back-btn"
          variant="outline"
          className="focusable w-full h-10 font-semibold"
          onClick={async () => {
            dispatch(clearBlockedDevices());
            sessionStorage.removeItem("device_limit_blocked");

            // Sign out of Firebase Auth to ensure unauthenticated state is restored
            await auth.signOut();
          }}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  // ─── Normal Login Form ──────────────────────────────────────────────────────
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
                className="focusable focusable absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 cursor-pointer text-primary/60 hover:text-primary focus:bg-zinc-800 rounded"
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
            <Link to="/forgot-password" className="focusable text-sm font-bold text-primary hover:underline px-2 py-1 focus:bg-zinc-800 rounded">
              Forgot Password?
            </Link>
          </div>

          <Field className="mt-2">
            <Button type="submit" id="login-submit-btn" className="focusable cursor-pointer w-full bg-primary text-secondary hover:bg-primary/90 font-semibold h-10 text-base focus:bg-primary/80 focus:scale-102" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
