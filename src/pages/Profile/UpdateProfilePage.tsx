import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { updateAuthUser } from "@/store/slices/authSlice";

import { Phone, Mail, User, CheckCircle2, Pencil, ArrowLeft, Camera, Crown, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { UploadImage } from "@/Firebase/CloudStorage/UploadImages";
import { updateDocument } from "@/Firebase";

interface ProfileData {
  name: string;
  phone: string;
  age: string;
  avatar: string;
}

export const UpdateProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData>({
    name: user?.name || "Super Admin",
    phone: user?.phone || "",
    age: user?.age !== null && user?.age !== undefined ? String(user.age) : "",
    avatar: user?.avatar || "",
  });

  const [saved, setSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [ageError, setAgeError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile({
      name: user?.name || "Super Admin",
      phone: user?.phone || "",
      age: user?.age !== null && user?.age !== undefined ? String(user.age) : "",
      avatar: user?.avatar || "",
    });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProfile((prev) => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({ ...prev, avatar: "" }));
    setAvatarFile(null);
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;

    // Validate phone
    if (profile.phone && !/^\d{0,10}$/.test(profile.phone)) {
      setPhoneError("Phone must be digits only, max 10 digits");
      return;
    }
    setPhoneError("");

    // Validate age
    if (profile.age !== "") {
      const ageNum = parseInt(profile.age, 10);
      if (isNaN(ageNum)) {
        setAgeError("Please enter a valid age");
        return;
      }
      if (ageNum > 200) {
        setAgeError("Age cannot exceed 200");
        return;
      }
    }
    setAgeError("");

    setIsUpdating(true);

    try {
      let newAvatarUrl = profile.avatar;

      // Upload new image if selected
      if (avatarFile) {
        newAvatarUrl = await UploadImage(avatarFile);
      }

      const ageNum = profile.age !== "" ? parseInt(profile.age, 10) : null;

      const updateData: Record<string, any> = {
        name: profile.name,
        phone: profile.phone,
        avatar: newAvatarUrl,
      };
      if (ageNum !== null) {
        updateData.age = ageNum;
      }

      // Save to Firestore
      await updateDocument("users", user.id, updateData);

      // Update local Redux state
      dispatch(updateAuthUser({ name: profile.name, phone: profile.phone, age: ageNum, avatar: newAvatarUrl }));

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate("/profile");
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Shared avatar section
  const AvatarSection = ({ size = "mobile" }: { size?: "mobile" | "desktop" }) => {
    const avatarSize = size === "desktop" ? "w-28 h-28" : "w-16 h-16";
    const editBtnSize = size === "desktop" ? "w-9 h-9" : "w-7 h-7";
    const editIconSize = size === "desktop" ? "w-4 h-4" : "w-3 h-3";
    const nameSize = size === "desktop" ? "text-xl" : "text-base";
    const emailSize = size === "desktop" ? "text-sm" : "text-sm";

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className={`${avatarSize} ring-3 ring-primary/20 shadow-xl`}>
            <AvatarImage src={profile.avatar} className="object-cover" />
            <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className={`focusable absolute -bottom-1 -right-1 ${editBtnSize} rounded-full shadow-lg`}
            title="Change photo"
          >
            <Camera className={`${editIconSize} text-secondary`} />
          </Button>

          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
            id="avatar-upload"
          />
        </div>

        <div className="text-center">
          <p className={`${nameSize} font-bold text-foreground`}>{profile.name}</p>
          <p className={`${emailSize} text-muted-foreground mt-0.5`}>{user?.email || "admin@avr.com"}</p>
          {profile.avatar && (
            <Button
              variant="link"
              onClick={handleRemoveAvatar}
              className="focusable text-xs font-medium text-destructive hover:text-destructive hover:underline mt-2 p-0 h-auto block mx-auto focus:bg-zinc-800 rounded px-2"
            >
              Remove photo
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Shared form section
  const FormSection = ({ isDesktop = false }: { isDesktop?: boolean }) => (
    <Card tabIndex={-1} className={`rounded-lg ${isDesktop ? "p-8" : "p-5"} flex flex-col gap-5 shadow-sm`}>

      {/* Full Name */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="edit-name"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          Full Name
        </Label>
        <Input
          id="edit-name"
          value={profile.name}
          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          placeholder="Enter your full name"
          className={`focusable ${isDesktop ? "h-10" : "h-10"} rounded-md `}
        />
      </div>

      {/* Email (read-only) */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="edit-email"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Mail className="w-4 h-4 text-muted-foreground" />
          Email
        </Label>
        <Input
          id="edit-email"
          value={user?.email || "admin@avr.com"}
          readOnly
          disabled
          className={`${isDesktop ? "h-10" : "h-10"} rounded-md bg-muted/50 text-muted-foreground cursor-not-allowed`}
        />
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="edit-phone"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Phone className="w-4 h-4 text-muted-foreground" />
          Phone
        </Label>
        <Input
          id="edit-phone"
          value={profile.phone}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
            setProfile((p) => ({ ...p, phone: val }));
            if (phoneError) setPhoneError("");
          }}
          placeholder="Enter your phone number"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          className={`focusable ${isDesktop ? "h-10" : "h-10"} rounded-md`}
        />
        {phoneError && <p className="text-xs text-destructive mt-0.5">{phoneError}</p>}
      </div>

      {/* Age */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="edit-age"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Age
        </Label>
        <Input
          id="edit-age"
          value={profile.age}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
              setProfile((p) => ({ ...p, age: val }));
            }
            if (ageError) setAgeError("");
          }}
          placeholder="e.g. 25"
          type="number"
          className={`focusable ${isDesktop ? "h-10" : "h-10"} rounded-md`}
        />
        {ageError && <p className="text-xs text-destructive mt-0.5">{ageError}</p>}
      </div>

      {/* Update Profile Button */}
      <Button
        id="update-profile-btn"
        onClick={handleUpdateProfile}
        disabled={isUpdating || saved}
        className={`focusable w-full ${isDesktop ? "h-10" : "h-10"} rounded-md bg-primary hover:bg-primary/90 text-secondary font-semibold text-sm shadow-sm flex items-center justify-center gap-2 mt-2 focus:scale-102 outline-none`}
      >
        {isUpdating ? "Saving…" : saved ? "Saved" : "Update Profile"}
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ═══ MOBILE Fixed Header ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/profile")}
            className="focusable w-9 h-9 rounded-full z-10 border-border focus:bg-zinc-850"
            id="edit-profile-back-btn"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Button>
          <h1 className="text-foreground font-bold text-lg">Edit Profile</h1>
        </div>
      </div>

      {/* ═══════════ DESKTOP LAYOUT ═══════════ */}
      <div className="hidden md:flex flex-col px-6 lg:px-10 xl:px-16 pt-8 pb-16 max-w-[1000px] mx-auto w-full">
        {/* Desktop inline header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/profile")}
            className="focusable w-10 h-10 rounded-xl border-border focus:bg-zinc-850"
            id="edit-profile-back-btn-desktop"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <div className="flex gap-8 lg:gap-10">
          {/* Left: Avatar Card */}
          <div className="w-[340px] lg:w-[380px] shrink-0 sticky top-6 self-start">
            <Card tabIndex={-1} className="rounded-lg p-8 flex flex-col items-center gap-5 relative overflow-hidden">
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />
              <div className="relative z-10 pt-4">
                <AvatarSection size="desktop" />
              </div>

              {/* Membership Status */}
              <div className="w-full border-t border-border pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => navigate("/upgrade-plan")}
                  className="w-full flex flex-row items-center justify-start p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 gap-3 cursor-pointer hover:border-primary/40 hover:from-primary/20 transition-all"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary/20">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-foreground font-bold text-sm">
                      {user?.membershipPlanId ? "Premium Member" : "Free Member"}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {user?.membershipPlanId ? "Enjoying exclusive perks" : "Upgrade for premium features"}
                    </p>
                  </div>
                </button>
              </div>
            </Card>

            {/* Success toast (desktop) */}
            {saved && (
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium transition-opacity duration-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4" />
                Profile updated! Redirecting…
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="flex-1 min-w-0">
            <h2 className="text-foreground font-semibold text-lg mb-5">Personal Information</h2>
            <FormSection isDesktop />
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE LAYOUT (unchanged) ═══════════ */}
      <div className="md:hidden flex flex-col items-center px-4 pt-[96px] pb-10">
        <div className="w-full max-w-md flex flex-col gap-6">

          {/* Avatar */}
          <AvatarSection size="mobile" />

          {/* Success toast */}
          {saved && (
            <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium transition-opacity duration-300">
              <CheckCircle2 className="w-4 h-4" />
              Profile updated! Redirecting…
            </div>
          )}

          {/* Edit Form Card */}
          <FormSection />

        </div>
      </div>

    </div>
  );
};
