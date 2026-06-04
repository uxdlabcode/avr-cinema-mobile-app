import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { LogOut, Trash2, ChevronRight, UserCog, Settings, Crown, Headset } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/Firebase/FirebaseAuth/UserLogOut";
import { deleteUserData } from "@/Firebase/FirebaseAuth/DeleteUser";
import { useNavigate } from "react-router-dom";

export const ProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const name = user?.name || "Super Admin";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    const success = await deleteUserData(user.id);
    setIsDeleting(false);
    if (success) {
      setShowDeleteModal(false);
      logout();
    } else {
      // If delete fails, typically due to requiring a recent login
      alert("Failed to delete account. You may need to log out and log in again before deleting your account.");
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center px-4 py-8 relative">
        <div className="w-full max-w-md flex flex-col gap-8 animate-in fade-in duration-500 flex-1">

          {/* Header Section */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold text-center tracking-tight text-white">Your Profile</h1>
            <p className="text-sm text-gray-400">Manage your account details</p>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col items-center gap-4 bg-card border border-border p-6 rounded-3xl shadow-sm">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 ring-4 ring-white/20 shadow-xl">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback className="bg-white text-black text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name & Email */}
            <div className="text-center">
              <p className="text-xl font-bold text-white">{name}</p>
              <p className="text-sm text-gray-400 mt-1">
                {user?.email || "admin@avr.com"}
              </p>
            </div>

            {/* Edit Profile Button */}
            <button
              id="edit-profile-btn"
              onClick={() => navigate("/update-profile")}
              className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 font-semibold text-sm transition-colors border border-white/10 shadow-sm"
            >
              <UserCog className="w-4 h-4" />
              EDIT PROFILE
            </button>
          </div>

          {/* Personalize Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Personalize
            </h2>

            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-white/5 transition-colors group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-white/10 text-white group-hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-white">Account Setting</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              <button className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-white/5 transition-colors group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-white/10 text-yellow-400 group-hover:scale-110 transition-transform">
                    <Crown className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-white">Active Membership</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Settings Section */}
          <div className="flex flex-col gap-3 pb-24">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">
              Settings
            </h2>

            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-white/5 transition-colors group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-white/10 text-white group-hover:scale-110 transition-transform">
                    <Headset className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-white">Support & Inquiry</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-white/5 transition-colors group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-white/10 text-white group-hover:scale-110 transition-transform">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-white">Log Out</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-red-500/30 hover:bg-red-500/10 transition-colors group mt-1 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm text-red-500">Delete Account</span>
                </div>
                <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 text-center items-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Log Out</h3>
              <p className="text-sm text-gray-400 px-2">
                Are you sure you want to log out of your account? You will need to sign in again.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-zinc-700 text-white font-semibold hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-red-500/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 text-center items-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Account</h3>
              <p className="text-sm text-gray-400 px-2">
                This action is permanent and cannot be undone. All your data will be wiped out.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl border border-zinc-700 text-white font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
