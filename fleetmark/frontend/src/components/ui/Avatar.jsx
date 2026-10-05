import React, { useEffect, useState } from "react";

/**
 * Avatar — the user's 42 Intra profile image with a guaranteed initials fallback.
 * Renders the image when `avatarUrl` is set and loads successfully; otherwise (null
 * url, or the image 404s / fails to load) it shows the initials circle. Never a
 * broken-image icon.
 *
 * login:     string  — 42 login (used for initials + title)
 * avatarUrl: string  — 42 image.link (may be null)
 * size:      number  — px diameter
 * gradient:  boolean — filled gradient style (top bar) vs tinted style (sidebar)
 */
export default function Avatar({ login = "—", avatarUrl, size = 32, gradient = false }) {
  const [failed, setFailed] = useState(false);

  // If the url changes (e.g. after login), give the image another chance.
  useEffect(() => setFailed(false), [avatarUrl]);

  const initials = login && login !== "—" ? login.slice(0, 2).toUpperCase() : "??";
  const showImage = Boolean(avatarUrl) && !failed;

  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    userSelect: "none",
  };

  if (showImage) {
    return (
      <div style={base} title={login}>
        <img
          src={avatarUrl}
          alt={`${login} avatar`}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      title={login}
      style={{
        ...base,
        background: gradient
          ? "linear-gradient(135deg, var(--blue), var(--blue2, var(--blue)))"
          : "var(--blue-mid)",
        color: gradient ? "#fff" : "var(--blue)",
        fontSize: Math.round(size * 0.34),
        fontWeight: 800,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}
