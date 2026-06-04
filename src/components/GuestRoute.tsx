import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Navigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  children: React.ReactElement;
}

export default function GuestRoute({ children }: Props) {
  const user = useSelector((state: RootState) => state.user);

  if (user.loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (user && user.uid) {
    const role = (user.role || "").toLowerCase();
    if (role.includes("pro")) {
      return <Navigate to="/prodashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
