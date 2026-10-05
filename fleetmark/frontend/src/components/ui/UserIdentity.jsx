import React from "react";
import Avatar from "./Avatar";

/**
 * UserIdentity — displays avatar + login + role.
 * Used in sidebar bottom of both Admin and Student layouts.
 *
 * login:     string (42 Intra login)
 * avatarUrl: string (42 profile image, optional — falls back to initials)
 * role:      string (optional, e.g. "admin", "passenger")
 * compact:   boolean — hide name/role, show avatar only (for collapsed sidebar)
 */
export default function UserIdentity({ login = "—", avatarUrl, role, compact = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-md)",
        minWidth: 0,
      }}
    >
      <Avatar login={login} avatarUrl={avatarUrl} size={32} />

      {/* Name + role */}
      {!compact && (
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-semibold)",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {login}
          </div>
          {role && (
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                textTransform: "capitalize",
                marginTop: 1,
              }}
            >
              {role}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
