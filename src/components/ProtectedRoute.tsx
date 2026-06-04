import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  allowedRoles: string[];
  children: React.ReactElement;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const user = useSelector((state: RootState) => state.user);

  if (user.loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user || !user.uid) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes((user.role || "").trim().toLowerCase())) {
    return <NotFound />;
  }

  return children;
}
