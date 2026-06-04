import { HomePage } from "@/pages/HomePage/HomePage";
import { Outlet, type RouteObject, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import Signin from "@/pages/Auth/Signin";
import Signup from "@/pages/Auth/Signup";
import { UserDashboard } from "@/pages/Dashboard/UserDashboard";
import { ProfilePage } from "@/pages/Profile/ProfilePage";
import { UpdateProfilePage } from "@/pages/Profile/UpdateProfilePage";
import ProtectedRoute from "@/components/ProtectedRoute";
import GuestRoute from "@/components/GuestRoute";
import NotFound from "@/pages/NotFound";
import { useAppSelector } from "@/store/hooks";
import { HomePageSkeleton } from "@/pages/HomePage/HomePageSkeleton";
import Search from "@/pages/search/Search";
import VideoDetails from "@/pages/videodetails/VideoDetails";
import TvDetails from "@/pages/tvstreaming/TvDetails";
import MoviesTab from "@/pages/movies/MoviesTab";
import Membership from "@/pages/membership/Membership";

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAppSelector((state) => state.auth);

  if (loading) {
    return <HomePageSkeleton />;
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
        path: "search",
        element: <Search />,
      },
      {
        path: "video/:id",
        element: <VideoDetails />,
      },
      {
        path: "tv",
        element: <TvDetails />,
      },
      {
        path: "movies",
        element: <MoviesTab />,
      },
      {
        path: "settings",
        element: <HomePage />,
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "update-profile",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <UpdateProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "membership",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <Membership />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];
