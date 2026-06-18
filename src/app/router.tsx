import { HomePage } from "@/pages/HomePage/HomePage";
import { Outlet, type RouteObject, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import Signin from "@/pages/Auth/Signin";
import Signup from "@/pages/Auth/Signup";
import { UserDashboard } from "@/pages/Dashboard/UserDashboard";
import { ProfilePage } from "@/pages/Profile/ProfilePage";
import { UpgradePlanPage } from "@/pages/Profile/UpgradePlanPage";
import { UpdateProfilePage } from "@/pages/Profile/UpdateProfilePage";
import { WatchlistPage } from "@/pages/Profile/WatchlistPage";
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
import Episode from "@/pages/tvstreaming/Episode";
import { GetSupportPage } from "@/pages/GetSupport/GetSupportPage";
import { NotificationsPage } from "@/pages/Profile/NotificationsPage";
import { QuizzesPage } from "@/pages/Quizzes/QuizzesPage";
import { QuizDetailPage } from "@/pages/Quizzes/QuizDetailPage";
import { QuizResultPage } from "@/pages/Quizzes/QuizResultPage";
import Trailer from "@/pages/trailer/Trailer";

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
    path: "membership",
    element: (
      <ProtectedRoute allowedRoles={["superadmin", "user"]}>
        <Membership />
      </ProtectedRoute>
    ),
  },
  {
    path: "quizzes/:id/result",
    element: (
      <ProtectedRoute allowedRoles={["superadmin", "user"]}>
        <QuizResultPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "quizzes/:id",
    element: (
      <ProtectedRoute allowedRoles={["superadmin", "user"]}>
        <QuizDetailPage />
      </ProtectedRoute>
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
        path: "trailers",
        element: <Trailer />,
      },
      {
        path: "tv/episode/:id",
        element: <Episode />,
      },
      {
        path: "movies",
        element: <MoviesTab />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "upgrade-plan",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <UpgradePlanPage />
          </ProtectedRoute>
        ),
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
        path: "profile/watchlist",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <WatchlistPage />
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
        path: "support",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <GetSupportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "support/ticket/:ticketId",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <GetSupportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "notifications",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <NotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "quiz",
        element: (
          <ProtectedRoute allowedRoles={["superadmin", "user"]}>
            <QuizzesPage />
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
