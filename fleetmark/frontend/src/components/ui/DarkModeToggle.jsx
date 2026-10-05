import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../context/TranslationContext";
import Toggle from "./Toggle";

export default function DarkModeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <span className="theme-toggle-label" style={{ fontSize: "0.85rem", color: "var(--mid)" }}>
        {isDark ? t("themeDark") : t("themeLight")}
      </span>
      <Toggle checked={isDark} onChange={toggleTheme} label={t("themeToggle")} />
    </div>
  );
}
