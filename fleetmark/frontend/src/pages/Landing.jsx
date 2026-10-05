import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../services/api";
import { useTranslation } from "../context/TranslationContext";
import LanguageSwitcher from "../components/shared/LanguageSwitcher";
import useInView from "../hooks/useInView";

function RevealSection({ id, children, className = "" }) {
  const [ref, visible] = useInView();
  return (
    <section id={id} ref={ref} className={`reveal-section${visible ? " is-visible" : ""} ${className}`.trim()}>
      {children}
    </section>
  );
}

/** Landing copy (en/fr). Route names are proper nouns and stay in English in both. */
const copy = {
  en: {
    navHow: "How it works",
    navSchedule: "Schedule",
    navTeam: "Team",
    navSignIn: "Sign in with 42",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    heroBadge: "Student project · 1337 School",
    heroA: "Night shuttle.",
    heroB: "Reserved.",
    heroText:
      "A night-shuttle booking app built by 1337 students, for 1337 students. Sign in once with 42 Intra — your seat confirmed before you leave campus.",
    heroBtnPrimary: "Sign in with 42",
    heroBtnSecondary: "How it works",
    boardTitle: "Nightly departures · from 1337",
    boardBadge: "EVERY NIGHT",
    board: [
      { time: "21:00", route: "OCP Route + Coin Blue Route", path: "2 buses · again at 22:00", tag: "PEAK", status: "reserved" },
      { time: "23:00", route: "Unified Night Route", path: "1 bus · again at 00:00", tag: "MIDNIGHT", status: "boarding" },
      { time: "01:00", route: "OCP Route + Coin Blue Route", path: "2 buses · split routes", tag: "PEAK", status: "reserved" },
      { time: "03:00", route: "Unified Night Route", path: "Hourly until 06:00", tag: "LATE NIGHT", status: "late" },
    ],
    statsLabel: "Fleetmark at a glance",
    heroStats: [
      { value: "3", label: "ROUTES" },
      { value: "1", label: "SEAT / NIGHT" },
      { value: "21:00", label: "FIRST BUS" },
      { value: "06:00", label: "LAST BUS" },
    ],
    howEyebrow: "HOW IT WORKS",
    howTitle: "Four steps. One seat, confirmed.",
    howSteps: [
      { title: "Sign in with 42 Intra", lines: ["No new account. Your 1337 credentials work instantly."] },
      { title: "Pick your home stop", lines: ["Choose from stations across Ben Guerir. Only trips that serve your stop are shown."] },
      { title: "Reserve your seat", lines: ["One seat per night, confirmed instantly. Cancel any time before departure."] },
      { title: "Show up and ride", lines: ["Your seat is waiting. Board the shuttle at 1337."] },
    ],
    pass: {
      brand: "Fleetmark · Boarding pass",
      route: "Night Shuttle — OCP Route",
      cells: ["50 seats", "22:00", "18 stops"],
      confirm: "Seat confirmed · OCP Route · 22:00",
    },
    schedEyebrow: "SCHEDULE",
    schedTitle: "Runs all night. Every night.",
    schedDesc: "Departures every hour from 21:00 to 06:00. No departure at 02:00.",
    schedBlocks: [
      { tone: "aurora", label: "PEAK", time: "21:00 · 22:00 · 01:00", icon: "bolt", cardTitle: "Split routes", desc: "Two buses leave together: OCP Route and Coin Blue Route.", tags: ["2 buses", "OCP Route", "Coin Blue Route"] },
      { tone: "sodium", label: "MIDNIGHT", time: "23:00 · 00:00", icon: "update", cardTitle: "Unified run", desc: "One bus covers every stop of both routes.", tags: ["1 bus", "All stops"] },
      { tone: "muted", label: "LATE NIGHT", time: "03:00 → 06:00", icon: "dark_mode", cardTitle: "Hourly unified run", desc: "One bus every hour for students who stay late.", tags: ["1 bus", "Hourly"] },
    ],
    teamEyebrow: "THE TEAM",
    teamTitle: "Built by 1337 students, for 1337 students.",
    teamSubtitle: "Five students set out to build a smart system for managing their school's bus transportation.",
    teamMembers: [
      { name: "Adil Bourji", role: "Frontend Developer", skills: "React · Vite · Design System" },
      { name: "Mohamed Lahrech", role: "Backend Developer", skills: "Django REST · PostgreSQL · API" },
      { name: "Abderrahman Chakour", role: "Backend · Auth", skills: "42 OAuth · JWT · Security" },
      { name: "Ayoub El Haouti", role: "Backend · QA", skills: "Testing · Django · Pytest" },
      { name: "Aamir Tahtah", role: "DevOps", skills: "Docker · Nginx · ELK" },
    ],
    gsEyebrow: "GET STARTED",
    gsTitle: "Your seat is waiting. Claim it now.",
    gsSteps: ["Authenticate with your 42 Intra account", "Your role is detected automatically", "Pick your home stop and start reserving"],
    gsCardTitle: "Access Fleetmark",
    gsCardSub: "1337 School Ben Guerir only. Your role is detected automatically.",
    gsBtn: "Sign in with 42 Intra",
    gsSecured: "secured by 42 OAuth",
    gsChips: ["No new account", "Instant access", "Auto role detect", "1337 only"],
    gsFootTag: "1337 School · Ben Guerir · Morocco",
    footerSub: "Night shuttle reservation · 1337 School Morocco",
    footerCopy: "© 2026 · Built by 1337/42 students",
    footerTech: "React · Django · PostgreSQL · Docker · 42 OAuth",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  fr: {
    navHow: "Fonctionnement",
    navSchedule: "Horaires",
    navTeam: "Équipe",
    navSignIn: "Connexion 42",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    heroBadge: "Projet étudiant · 1337 School",
    heroA: "Navette de nuit.",
    heroB: "Réservée.",
    heroText:
      "Une application de réservation de navette de nuit, créée par des étudiants 1337 pour les étudiants 1337. Une connexion 42 Intra — votre place confirmée avant de quitter le campus.",
    heroBtnPrimary: "Connexion 42",
    heroBtnSecondary: "Fonctionnement",
    boardTitle: "Départs chaque nuit · depuis 1337",
    boardBadge: "CHAQUE NUIT",
    board: [
      { time: "21:00", route: "OCP Route + Coin Blue Route", path: "2 bus · aussi à 22:00", tag: "POINTE", status: "reserved" },
      { time: "23:00", route: "Unified Night Route", path: "1 bus · aussi à 00:00", tag: "MINUIT", status: "boarding" },
      { time: "01:00", route: "OCP Route + Coin Blue Route", path: "2 bus · lignes séparées", tag: "POINTE", status: "reserved" },
      { time: "03:00", route: "Unified Night Route", path: "Toutes les heures jusqu'à 06:00", tag: "FIN DE NUIT", status: "late" },
    ],
    statsLabel: "Fleetmark en bref",
    heroStats: [
      { value: "3", label: "LIGNES" },
      { value: "1", label: "PLACE / NUIT" },
      { value: "21:00", label: "PREMIER BUS" },
      { value: "06:00", label: "DERNIER BUS" },
    ],
    howEyebrow: "COMMENT ÇA MARCHE",
    howTitle: "Quatre étapes. Une place confirmée.",
    howSteps: [
      { title: "Connexion avec 42 Intra", lines: ["Pas de nouveau compte. Vos identifiants 1337 suffisent."] },
      { title: "Choisissez votre arrêt", lines: ["Stations dans tout Ben Guerir. Seuls les trajets qui desservent votre arrêt s'affichent."] },
      { title: "Réservez votre place", lines: ["Une place par nuit, confirmée tout de suite. Annulable avant le départ."] },
      { title: "Montez et partez", lines: ["Votre place vous attend. Embarquez à 1337."] },
    ],
    pass: {
      brand: "Fleetmark · Carte d'embarquement",
      route: "Navette de nuit — OCP Route",
      cells: ["50 places", "22:00", "18 arrêts"],
      confirm: "Place confirmée · OCP Route · 22:00",
    },
    schedEyebrow: "HORAIRES",
    schedTitle: "Toute la nuit. Chaque nuit.",
    schedDesc: "Un départ chaque heure de 21:00 à 06:00. Pas de départ à 02:00.",
    schedBlocks: [
      { tone: "aurora", label: "POINTE", time: "21:00 · 22:00 · 01:00", icon: "bolt", cardTitle: "Lignes séparées", desc: "Deux bus partent ensemble : OCP Route et Coin Blue Route.", tags: ["2 bus", "OCP Route", "Coin Blue Route"] },
      { tone: "sodium", label: "MINUIT", time: "23:00 · 00:00", icon: "update", cardTitle: "Ligne unique", desc: "Un seul bus dessert tous les arrêts des deux lignes.", tags: ["1 bus", "Tous les arrêts"] },
      { tone: "muted", label: "FIN DE NUIT", time: "03:00 → 06:00", icon: "dark_mode", cardTitle: "Ligne unique, chaque heure", desc: "Un bus chaque heure pour ceux qui restent tard.", tags: ["1 bus", "Chaque heure"] },
    ],
    teamMembers: [
      { name: "Adil Bourji", role: "Développeur Frontend", skills: "React · Vite · Design System" },
      { name: "Mohamed Lahrech", role: "Développeur Backend", skills: "Django REST · PostgreSQL · API" },
      { name: "Abderrahman Chakour", role: "Backend · Auth", skills: "42 OAuth · JWT · Sécurité" },
      { name: "Ayoub El Haouti", role: "Backend · QA", skills: "Tests · Django · Pytest" },
      { name: "Aamir Tahtah", role: "DevOps", skills: "Docker · Nginx · ELK" },
    ],
    teamEyebrow: "L'ÉQUIPE",
    teamTitle: "Construit par des étudiants 1337, pour des étudiants 1337.",
    teamSubtitle: "Cinq étudiants se sont lancés dans la création d'un système intelligent pour gérer le transport scolaire.",
    gsEyebrow: "COMMENCER",
    gsTitle: "Votre place vous attend. Réclamez-la.",
    gsSteps: ["Authentification avec votre compte 42 Intra", "Votre rôle est détecté automatiquement", "Choisissez votre arrêt et réservez"],
    gsCardTitle: "Accéder à Fleetmark",
    gsCardSub: "1337 School Ben Guerir uniquement. Rôle détecté automatiquement.",
    gsBtn: "Connexion 42 Intra",
    gsSecured: "sécurisé par OAuth 42",
    gsChips: ["Pas de nouveau compte", "Accès instantané", "Détection du rôle", "1337 uniquement"],
    gsFootTag: "1337 School · Ben Guerir · Maroc",
    footerSub: "Réservation navette nocturne · 1337 School Maroc",
    footerCopy: "© 2026 · Réalisé par des étudiants 1337/42",
    footerTech: "React · Django · PostgreSQL · Docker · OAuth 42",
    privacy: "Confidentialité",
    terms: "Conditions d'utilisation",
  },
};

// Shown when the OAuth callback bounces back with ?auth_error=<code>.
const AUTH_ERRORS = {
  en: {
    denied: "Sign-in was cancelled on 42. Try again when you're ready.",
    expired: "Your sign-in took too long or was opened in another tab. Please try again.",
    provider: "42 Intra couldn't complete the sign-in right now. Please try again in a minute.",
    blocked: "This account has been deactivated. Contact the logistics team.",
    start: "Couldn't start the sign-in. Check your connection and try again.",
  },
  fr: {
    denied: "Connexion annulée sur 42. Réessayez quand vous voulez.",
    expired: "La connexion a expiré ou a été ouverte dans un autre onglet. Réessayez.",
    provider: "42 Intra n'a pas pu terminer la connexion. Réessayez dans une minute.",
    blocked: "Ce compte a été désactivé. Contactez l'équipe logistique.",
    start: "Impossible de lancer la connexion. Vérifiez votre réseau et réessayez.",
  },
};

const toneColor = { aurora: "var(--aurora)", sodium: "var(--sodium)", muted: "var(--n-mid)" };

function scrollToId(e, id) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Landing() {
  // Shared with the app so the language picked here survives sign-in.
  const { lang, setLang } = useTranslation();
  // Keep the code, not the message, so the banner follows language switches.
  const [errorCode, setErrorCode] = useState(() => new URLSearchParams(window.location.search).get("auth_error") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const text = useMemo(() => copy[lang] || copy.en, [lang]);
  const errors = AUTH_ERRORS[lang] || AUTH_ERRORS.en;
  const error = errorCode ? errors[errorCode] || errors.provider : "";

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function login() {
    setErrorCode("");
    if (window.location.search) window.history.replaceState(null, "", "/");
    try {
      const res = await auth.getLoginUrl();
      if (!res?.authorization_url) throw new Error("Missing OAuth URL.");
      window.location.href = res.authorization_url;
    } catch {
      setErrorCode("start"); // apiCall already logs the technical error
    }
  }

  return (
    <div className="nocturne">
      {/* ─────────── NAV ─────────── */}
      <nav className="noc-nav">
        <div className="noc-wrap noc-nav__inner">
          <div className="noc-nav__left">
            <span className="noc-brand ltr">
              <span className="noc-brand__mark" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11v6a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  <circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/>
                </svg>
              </span>
              Fleetmark
            </span>
            <div className="noc-nav__links">
              <a href="#how-it-works" onClick={(e) => scrollToId(e, "how-it-works")}>{text.navHow}</a>
              <a href="#schedule" onClick={(e) => scrollToId(e, "schedule")}>{text.navSchedule}</a>
              <a href="#team" onClick={(e) => scrollToId(e, "team")}>{text.navTeam}</a>
            </div>
          </div>
          <div className="noc-nav__right">
            <button
              type="button"
              className="noc-hamburger"
              aria-expanded={menuOpen}
              aria-controls="noc-mobile-menu"
              aria-label={menuOpen ? text.menuClose : text.menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{menuOpen ? "close" : "menu"}</span>
            </button>
            {/* No theme toggle here: the landing is always dark, so it had no visible effect. */}
            <span className="noc-lang"><LanguageSwitcher value={lang} onChange={setLang} /></span>
            <button type="button" className="noc-btn noc-btn--outline noc-btn--sm" onClick={login}>
              {text.navSignIn}
            </button>
          </div>
        </div>
      </nav>

      <div id="noc-mobile-menu" className={`noc-mobile-menu${menuOpen ? " open" : ""}`}>
        <a href="#how-it-works" onClick={(e) => { setMenuOpen(false); scrollToId(e, "how-it-works"); }}>{text.navHow}</a>
        <a href="#schedule" onClick={(e) => { setMenuOpen(false); scrollToId(e, "schedule"); }}>{text.navSchedule}</a>
        <a href="#team" onClick={(e) => { setMenuOpen(false); scrollToId(e, "team"); }}>{text.navTeam}</a>
        <button type="button" onClick={() => { setMenuOpen(false); login(); }}>{text.navSignIn}</button>
      </div>

      <main>
        {/* ─────────── HERO ─────────── */}
        <section className="noc-hero">
          <div className="noc-hero__bg" aria-hidden="true">
            <div className="noc-stars" />
            <div className="noc-stars--2" />
            <div className="noc-headlights" />
            <div className="noc-headlights--warm" />
            <div className="noc-hero__grid" />
          </div>

          <div className="noc-wrap noc-hero__inner">
            {error ? (
              <div role="alert" className="noc-alert noc-rise noc-rise-1">
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                <p>{error}</p>
              </div>
            ) : null}
            <div className="noc-rise noc-rise-1">
              <span className="noc-status">
                <span className="noc-status__dot" />
                {text.heroBadge}
              </span>
            </div>

            <h1 className="noc-h1 noc-rise noc-rise-2">
              {text.heroA}
              <br />
              <span className="accent">{text.heroB}</span>
            </h1>

            <p className="noc-lede noc-rise noc-rise-3">{text.heroText}</p>

            <div className="noc-cta-row noc-rise noc-rise-3">
              <button type="button" className="noc-btn noc-btn--primary" onClick={login}>
                {text.heroBtnPrimary}
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
              <button type="button" className="noc-btn noc-btn--ghost" onClick={(e) => scrollToId(e, "how-it-works")}>
                {text.heroBtnSecondary}
              </button>
            </div>

            {/* Departure board */}
            <div className="noc-board noc-rise noc-rise-4" role="group" aria-label={text.boardTitle}>
              <div className="noc-board__head">
                <span className="noc-board__title ltr">{text.boardTitle}</span>
                <span className="noc-board__live ltr">{text.boardBadge}</span>
              </div>
              {text.board.map((row) => (
                <div className="noc-board__row" key={row.time + row.route}>
                  <span className="noc-board__time ltr">{row.time}</span>
                  <span className="noc-board__route">
                    <b>{row.route}</b>
                    <span className="ltr">{row.path}</span>
                  </span>
                  <span className={`noc-chip noc-chip--${row.status} ltr`}>{row.tag}</span>
                </div>
              ))}
            </div>

            <div className="noc-stats noc-rise noc-rise-5" role="group" aria-label={text.statsLabel}>
              {text.heroStats.map((stat) => (
                <div className="noc-stat" key={stat.label}>
                  <b className="ltr">{stat.value}</b>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ─────────── HOW IT WORKS ─────────── */}
        <RevealSection id="how-it-works" className="noc-section noc-section--line">
          <div className="noc-wrap noc-grid-2">
            <div>
              <span className="noc-eyebrow">{text.howEyebrow}</span>
              <h2 className="noc-h2">{text.howTitle}</h2>
              <div className="noc-steps">
                {text.howSteps.map((item, idx) => (
                  <div className="noc-step" key={idx}>
                    <span className="noc-step__num ltr">{String(idx + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{item.title}</h3>
                      {item.lines.map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="noc-pass" aria-hidden="true">
              <div className="noc-pass__head">
                <div className="noc-pass__brand ltr">{text.pass.brand}</div>
                <div className="noc-pass__route">{text.pass.route}</div>
                <div className="noc-pass__path ltr">1337 → OCP Saka → Nakhil → …</div>
              </div>
              <div className="noc-pass__grid">
                {["event_seat", "schedule", "pin_drop"].map((icon, i) => (
                  <div className="noc-pass__cell" key={icon}>
                    <span className="material-symbols-outlined">{icon}</span>
                    <b className="ltr">{text.pass.cells[i]}</b>
                  </div>
                ))}
              </div>
              <div style={{ padding: "0 24px" }}><div className="noc-pass__tear" /></div>
              <div className="noc-pass__foot">
                <div className="noc-pass__confirm">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>{text.pass.confirm}</span>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* ─────────── SCHEDULE ─────────── */}
        <RevealSection id="schedule" className="noc-section noc-section--line">
          <div className="noc-wrap">
            <span className="noc-eyebrow">{text.schedEyebrow}</span>
            <h2 className="noc-h2">{text.schedTitle}</h2>
            <p className="noc-sub">{text.schedDesc}</p>

            <div className="noc-timeline">
              <div className="noc-timeline__track" aria-hidden="true">
                {/* 21–23 peak · 23–01 unified · 01–02 peak · 02–03 no bus · 03–06 hourly */}
                <div className="noc-timeline__seg" style={{ flex: 2, background: "var(--aurora)" }} />
                <div className="noc-timeline__seg" style={{ flex: 2, background: "var(--sodium)" }} />
                <div className="noc-timeline__seg" style={{ flex: 1, background: "var(--aurora)" }} />
                <div className="noc-timeline__seg" style={{ flex: 1, background: "var(--n-surface-3)" }} />
                <div className="noc-timeline__seg" style={{ flex: 3, background: "var(--n-mid)" }} />
              </div>
              <div className="noc-timeline__labels ltr">
                <span>21:00</span><span>00:00</span><span>03:00</span><span>06:00</span>
              </div>
            </div>

            <div className="noc-sched-grid">
              {text.schedBlocks.map((block) => (
                <article className="noc-sched-card" key={block.label}>
                  <div className="noc-sched-card__head">
                    <span className="noc-sched-card__label" style={{ color: toneColor[block.tone] }}>{block.label}</span>
                    <span className="material-symbols-outlined" style={{ color: toneColor[block.tone], fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{block.icon}</span>
                  </div>
                  <div className="noc-sched-card__time ltr" style={{ color: toneColor[block.tone] }}>{block.time}</div>
                  <h3>{block.cardTitle}</h3>
                  <p>{block.desc}</p>
                  <div className="noc-tags">
                    {block.tags.map((tag) => <span className="noc-tag ltr" key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ─────────── TEAM ─────────── */}
        <RevealSection id="team" className="noc-section noc-section--line">
          <div className="noc-wrap">
            <span className="noc-eyebrow">{text.teamEyebrow}</span>
            <h2 className="noc-h2">{text.teamTitle}</h2>
            <p className="noc-sub">{text.teamSubtitle}</p>
            <div className="noc-team-scroll">
              {text.teamMembers.map((member, idx) => {
                const initials = member.name.split(" ").map((w) => w[0]).join("").toUpperCase();
                return (
                  <article className={`noc-teamcard${idx % 2 ? " noc-teamcard--sodium" : ""}`} key={member.name}>
                    <div className="noc-avatar ltr">{initials}</div>
                    <h4>{member.name}</h4>
                    <p className="noc-teamcard__role">{member.role}</p>
                    <p className="noc-teamcard__skills ltr">
                      {/* each skill stays whole, so a line never starts with a stray "·" */}
                      {member.skills.split(" · ").map((skill, i, all) => (
                        <React.Fragment key={skill}>
                          {i > 0 && " "}
                          <span>{skill}{i < all.length - 1 ? " ·" : ""}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </RevealSection>

        {/* ─────────── GET STARTED ─────────── */}
        <RevealSection id="get-started" className="noc-section noc-section--line">
          <div className="noc-wrap noc-grid-2">
            <div>
              <span className="noc-eyebrow">{text.gsEyebrow}</span>
              <h2 className="noc-h2">{text.gsTitle}</h2>
              <ul className="noc-list">
                {text.gsSteps.map((item, idx) => (
                  <li key={idx}>
                    <span className="noc-list__num ltr">{idx + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="noc-access">
              <div className="noc-access__inner">
                <div className="noc-access__badge ltr">42</div>
                <h3>{text.gsCardTitle}</h3>
                <p>{text.gsCardSub}</p>
                <button type="button" className="noc-btn noc-btn--primary noc-btn--block" style={{ marginTop: 20 }} onClick={login}>
                  {text.gsBtn}
                  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
                <p className="noc-access__secured">{text.gsSecured}</p>
                <div className="noc-chips">
                  {text.gsChips.map((chip) => <span key={chip}>{chip}</span>)}
                </div>
                <p className="noc-access__foot ltr">{text.gsFootTag}</p>
              </div>
            </div>
          </div>
        </RevealSection>
      </main>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="noc-footer">
        <div className="noc-wrap noc-footer__inner">
          <div className="noc-footer__top">
            <div>
              <div className="noc-footer__brand ltr">Fleetmark</div>
              <p className="noc-footer__meta" style={{ marginTop: 8 }}>{text.footerSub}</p>
            </div>
            <div className="noc-footer__meta">{text.footerCopy}</div>
          </div>
          <div className="noc-footer__links">
            <p className="noc-footer__meta ltr" style={{ margin: 0 }}>{text.footerTech}</p>
            <div className="noc-footer__legal">
              <Link to="/privacy">{text.privacy}</Link>
              <Link to="/terms">{text.terms}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
