import React from "react";
import { useAppSelector } from "@/store/hooks";
import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { HomePageSkeleton } from "@/pages/HomePage/HomePageSkeleton";

interface Props {
  allowedRoles: string[];
  children: React.ReactElement;
  skeleton?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children, skeleton }: Props) {
  const { user, token, loading, isAuthenticated } = useAppSelector((state) => state.auth);

  if (loading) {
    return <>{skeleton || <HomePageSkeleton />}</>;
  }

  if (!isAuthenticated || !token || !user) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes((user.role || "").trim().toLowerCase())) {
    return <NotFound />;
  }

  return children;
}
