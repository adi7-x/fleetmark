import React from "react";

const LANGS = [
  { id: "en", label: "EN" },
  { id: "fr", label: "FR" },
];

export default function LanguageSwitcher({ value = "en", onChange }) {
  const options = LANGS;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--line)",
        borderRadius: "999px",
        padding: "3px",
        background: "var(--surface2)",
      }}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange && onChange(option.id)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: "999px",
              padding: "6px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              background: active ? "var(--blue-bg)" : "transparent",
              color: active ? "var(--blue)" : "var(--mid)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
