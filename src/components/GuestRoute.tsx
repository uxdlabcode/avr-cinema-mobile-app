import React from "react";
import { useAppSelector } from "@/store/hooks";
import { Navigate } from "react-router-dom";
import { HomePageSkeleton } from "@/pages/HomePage/HomePageSkeleton";

interface Props {
  children: React.ReactElement;
}

export default function GuestRoute({ children }: Props) {
  const { user, loading, isAuthenticated } = useAppSelector((state) => state.auth);

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (isAuthenticated && user) {
    const role = (user.role || "").toLowerCase();
    if (role.includes("pro")) {
      return <Navigate to="/prodashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
