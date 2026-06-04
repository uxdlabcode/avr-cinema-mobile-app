import { HomePage } from "@/pages/HomePage/HomePage";
import { Outlet, type RouteObject, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import Signin from "@/pages/Auth/Signin";
import Signup from "@/pages/Auth/Signup";
import { UserDashboard } from "@/pages/Dashboard/UserDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuestRoute from "@/components/GuestRoute";
import NotFound from "@/pages/NotFound";
import { useAppSelector } from "@/store/hooks";
import { Spinner } from "@/components/ui/spinner";

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAppSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Spinner />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
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
    path: "signup",
    element: (
      <GuestRoute>
        <Signup />
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
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
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
