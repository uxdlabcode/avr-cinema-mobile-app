import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { updateAuthUser } from "@/store/slices/authSlice";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Mail, User, CheckCircle2, Pencil } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-6 animate-in fade-in duration-500">

        {/* Header with back arrow */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-white">Edit Profile</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group">
            <Avatar className="w-24 h-24 ring-4 ring-secondary/30 shadow-lg">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="bg-secondary text-primary text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-background border-2 border-border shadow flex items-center justify-center hover:bg-secondary/10 transition-colors"
              title="Change photo"
            >
              <Pencil className="w-3.5 h-3.5 text-secondary" />
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
            <p className="text-lg font-bold text-white">{profile.name}</p>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email || "admin@avr.com"}</p>
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              Profile updated! Redirecting…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Form Card */}
        <div className="bg-card border rounded-2xl p-5 flex flex-col gap-5 shadow-sm">

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="edit-name"
              className="flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <User className="w-4 h-4 text-secondary" />
              Full Name
            </Label>
            <Input
              id="edit-name"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter your full name"
              className="h-11 rounded-xl focus-visible:ring-secondary focus-visible:border-secondary"
            />
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="edit-email"
              className="flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <Mail className="w-4 h-4 text-secondary" />
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
              className="flex items-center gap-1.5 text-sm font-semibold text-white"
            >
              <Phone className="w-4 h-4 text-secondary" />
              Phone
            </Label>
            <Input
              id="edit-phone"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Enter your phone number"
              type="tel"
              className="h-11 rounded-xl focus-visible:ring-secondary focus-visible:border-secondary"
            />
          </div>

          {/* Update Profile Button */}
          <Button
            id="update-profile-btn"
            onClick={handleUpdateProfile}
            disabled={isUpdating || saved}
            className="w-full h-11 rounded-xl bg-secondary hover:bg-secondary/90 text-primary font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
          >
            {isUpdating ? "Saving…" : saved ? "Saved" : "Update Profile"}
          </Button>
        </div>

      </div>
    </div>
  );
};
