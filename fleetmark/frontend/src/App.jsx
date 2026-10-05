import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useTranslation } from "./context/TranslationContext";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import StudentLayout from "./components/layout/StudentLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ErrorBoundary from "./components/ui/ErrorBoundary";

import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/student/Onboarding";
import PassengerOverview from "./pages/passenger/PassengerOverview";
import ReserveASeat from "./pages/passenger/ReserveASeat";
import MyReservations from "./pages/passenger/MyReservations";
import ProfileSettings from "./pages/passenger/ProfileSettings";
import TripTracker from "./pages/passenger/TripTracker";
import AdminOverview from "./pages/admin/Overview";
import AdminTrips from "./pages/admin/Trips";
import BusManagement from "./pages/admin/BusManagement";
import AdminRoutesPage from "./pages/admin/Routes";
import Drivers from "./pages/admin/Drivers";
import AdminReservations from "./pages/admin/Reservations";
import Reports from "./pages/admin/Reports";
import AdminUsers from "./pages/admin/Users";
import Stations from "./pages/admin/Stations";
import Announcements from "./pages/admin/Announcements";
import Notifications from "./pages/passenger/Notifications";
import ComingSoon from "./pages/driver/ComingSoon";
import NotFound from "./pages/NotFound";
import OnboardingTour from "./components/ui/OnboardingTour";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";

const STUDENT_TITLES = {
  "/passenger": "navDashboard",
  "/passenger/reserve": "quickBookSeat",
  "/passenger/history": "quickMyTrips",
  "/passenger/settings": "navProfile",
  "/passenger/live-map": "navTracker",
  "/passenger/notifications": "navNotifications",
};

function StudentShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const pageTitle = t(STUDENT_TITLES[location.pathname] || "navDashboard");

  return (
    <StudentLayout
      user={user}
      activePath={location.pathname}
      onNavigate={navigate}
      onLogout={() => {
        logout();
        navigate("/");
      }}
      pageTitle={pageTitle}
    >
      <OnboardingTour role="STUDENT" />
      {children}
    </StudentLayout>
  );
}

const ADMIN_TITLES = {
  "/admin": "navDashboard",
  "/admin/trips": "navTrips",
  "/admin/buses": "navBuses",
  "/admin/stations": "navStations",
  "/admin/routes": "navRoutes",
  "/admin/drivers": "navDrivers",
  "/admin/reservations": "navHistory",
  "/admin/reports": "navReports",
  "/admin/announcements": "navAnnouncements",
  "/admin/users": "navUsers",
};

function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const pageTitle = t(ADMIN_TITLES[location.pathname] || "navDashboard");

  return (
    <AdminLayout
      user={user}
      activePath={location.pathname}
      onNavigate={navigate}
      pageTitle={pageTitle}
      onLogout={() => {
        logout();
        navigate("/");
      }}
    >
      <OnboardingTour role="LOGISTICS_STAFF" />
      {children}
    </AdminLayout>
  );
}

function AppRoutes() {
  const { user, ready } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      <Route
        path="/passenger"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <PassengerOverview />
            </StudentShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/live-map"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <TripTracker />
            </StudentShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/reserve"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <ReserveASeat />
            </StudentShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/history"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <MyReservations />
            </StudentShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/settings"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <ProfileSettings />
            </StudentShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger/notifications"
        element={
          <ProtectedRoute role="STUDENT" user={user} ready={ready}>
            <StudentShell>
              <Notifications />
            </StudentShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <AdminOverview />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/trips"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <AdminTrips />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/buses"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <BusManagement />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stations"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <Stations />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/routes"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <AdminRoutesPage />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/drivers"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <Drivers />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reservations"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <AdminReservations />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <Reports />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <Announcements />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="LOGISTICS_STAFF" user={user} ready={ready}>
            <AdminShell>
              <AdminUsers />
            </AdminShell>
          </ProtectedRoute>
        }
      />
      <Route path="/admin/settings" element={<Navigate to="/admin/users" replace />} />

      <Route
        path="/driver"
        element={
          <ProtectedRoute role="DRIVER" user={user} ready={ready}>
            <ComingSoon />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
