import React from "react";
import { Navigate } from "react-router-dom";
import Spinner from "../ui/Spinner";

function roleHome(role) {
  if (role === "LOGISTICS_STAFF") return "/admin";
  if (role === "DRIVER") return "/driver";
  return "/passenger";
}

export default function ProtectedRoute({ role, user, ready, children }) {
  // `ready` is false only for the brief window while the app tries to
  // recover a session from the refresh cookie on first load (the access
  // token is memory-only and doesn't survive a reload by itself). Without
  // this gate, a legitimately logged-in user reloading a protected page
  // would flash-redirect to "/" before that recovery attempt finishes.
  if (ready === false) {
    return <Spinner size={40} text="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
}
