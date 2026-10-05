import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Mounts the guarded element at a unique "/secret" path so it never
// collides with the redirect-target routes below it.
function renderGuarded(element) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/" element={<div>Landing</div>} />
        <Route path="/admin" element={<div>Admin Home</div>} />
        <Route path="/passenger" element={<div>Passenger Home</div>} />
        <Route path="/secret" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a session-check spinner while auth is still resolving (ready=false)", () => {
    renderGuarded(
      <ProtectedRoute role="STUDENT" user={null} ready={false}>
        <div>Secret</div>
      </ProtectedRoute>
    );
    // Must NOT flash-redirect to Landing before the session is known.
    expect(screen.queryByText("Landing")).not.toBeInTheDocument();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
  });

  it("redirects an unauthenticated user to the landing page", () => {
    renderGuarded(
      <ProtectedRoute role="STUDENT" user={null} ready={true}>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Landing")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("renders children for a user with the matching role", () => {
    renderGuarded(
      <ProtectedRoute role="STUDENT" user={{ role: "STUDENT" }} ready={true}>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("redirects a wrong-role user to their own role home", () => {
    renderGuarded(
      <ProtectedRoute role="STUDENT" user={{ role: "LOGISTICS_STAFF" }} ready={true}>
        <div>Secret</div>
      </ProtectedRoute>
    );
    // A staff member hitting a student route lands on the admin home, not the secret.
    expect(screen.getByText("Admin Home")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });
});
