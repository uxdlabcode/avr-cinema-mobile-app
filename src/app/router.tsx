import { HomePage } from "@/pages/HomePage/HomePage";
import { Outlet, type RouteObject, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import Signin from "@/pages/Auth/Signin";
import { UserDashboard } from "@/pages/Dashboard/UserDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuestRoute from "@/components/GuestRoute";
import NotFound from "@/pages/NotFound";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Spinner } from "@/components/ui/spinner";

function RootRedirect() {
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

  if (!user.uid) {
    return <Navigate to="/signin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "signin",
    element: (
      <GuestRoute>
        <Signin />
      </GuestRoute>
    ),
  },
  {
    path: "/",
    element: <LayoutWrapper />,
    children: [
      {
        path: "dashboard",
        element: (
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <UserDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects",
        element: <div>My Projects</div>,
      },
      {
        path: "settings",
        element: <HomePage />,
      },
    ],
  }, 
  {
    path: "*",
    element: <NotFound />,
  },
];
