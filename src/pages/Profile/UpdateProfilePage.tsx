import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { updateAuthUser } from "@/store/slices/authSlice";

import { Phone, Mail, User, CheckCircle2, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { UploadImage } from "@/Firebase/CloudStorage/UploadImages";
import { updateDocument } from "@/Firebase";

interface ProfileData {
  name: string;
  phone: string;
  avatar: string;
}

export const UpdateProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData>({
    name: user?.name || "Super Admin",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });

  const [saved, setSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile({
      name: user?.name || "Super Admin",
      phone: user?.phone || "",
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

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsUpdating(true);

    try {
      let newAvatarUrl = profile.avatar;

      // Upload new image if selected
      if (avatarFile) {
        newAvatarUrl = await UploadImage(avatarFile);
      }

      const updateData = {
        name: profile.name,
        phone: profile.phone,
        avatar: newAvatarUrl,
      };

      // Save to Firestore
      await updateDocument("users", user.id, updateData);

      // Update local Redux state
      dispatch(updateAuthUser(updateData));

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

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="relative flex items-center justify-center px-4 pt-5 pb-4 min-h-[64px]">
          <button
            onClick={() => navigate("/profile")}
            className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors z-10"
            id="edit-profile-back-btn"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-foreground font-bold text-lg">Edit Profile</h1>
        </div>
      </div>

      <div className="flex flex-col items-center px-4 pt-[96px] pb-10">
        <div className="w-full max-w-md flex flex-col gap-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-16 h-16 ring-2 ring-foreground/40 shadow-lg">
              <AvatarImage src={profile.avatar} className="object-cover" />
              <AvatarFallback className="bg-muted text-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
              title="Change photo"
            >
              <Pencil className="w-3 h-3 text-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              id="avatar-upload"
            />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{user?.email || "admin@avr.com"}</p>
          </div>
        </div>

        {/* Success toast */}
        {saved && (
          <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium transition-opacity duration-300">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated! Redirecting…
          </div>
        )}

        {/* Edit Form Card */}
        <div className="bg-card border rounded-2xl p-5 flex flex-col gap-5 shadow-sm">

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
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
              className="h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground"
            />
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
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
              className="h-11 rounded-xl bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
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
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter your phone number"
              type="tel"
              className="h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-foreground"
            />
          </div>

          {/* Update Profile Button */}
          <Button
            id="update-profile-btn"
            onClick={handleUpdateProfile}
            disabled={isUpdating || saved}
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-secondary font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            {isUpdating ? "Saving…" : saved ? "Saved" : "Update Profile"}
          </Button>
        </div>

      </div>
    </div>

    </div>
  );
};
