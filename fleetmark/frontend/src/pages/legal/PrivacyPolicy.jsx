import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../context/TranslationContext";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher";

const list = { margin: 0, paddingInlineStart: 20, display: "grid", gap: 8 };
const para = { margin: "8px 0 0" };
const link = {
  display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40,
  color: "var(--nav-active-text)", fontSize: 14, fontWeight: 700, textDecoration: "none",
};

const copy = {
  en: {
    back: "Back to home",
    title: "Privacy Policy",
    updated: "Last updated: October 2026",
    intro:
      "Fleetmark / SSBS (Smart School Bus System) is a student project built at 1337 School, Ben Guerir, Morocco (42 ft_transcendence). This privacy policy explains what personal data we collect, how we use it, and your rights regarding your information.",
    other: "Terms of Service",
    sections: [
      {
        icon: "database",
        title: "1. Data we collect",
        content: (
          <ul style={list}>
            <li><strong>42 Intra login (login_42)</strong> — your unique username from the 42 Intra platform, used for authentication and identification.</li>
            <li><strong>Email address</strong> — the email associated with your 42 Intra account, used to identify your account.</li>
            <li><strong>Home station</strong> — your pickup stop in Ben Guerir, used to show you the trips that serve it.</li>
            <li><strong>Reservation history</strong> — your seat reservations, including trip details, timestamps and cancellations.</li>
            <li><strong>Profile picture link</strong> — the address of your 42 Intra profile picture, shown in the app.</li>
            <li><strong>Two-factor secret</strong> — stored only if you turn on two-factor sign-in, to check your codes.</li>
            <li><strong>Session tokens</strong> — a refresh token in an HttpOnly cookie and a short-lived access token kept in memory, to keep you signed in.</li>
          </ul>
        ),
      },
      {
        icon: "tune",
        title: "2. How we use your data",
        content: (
          <ul style={list}>
            <li><strong>Authentication</strong> — verifying your identity through 42 OAuth to give you access to the platform.</li>
            <li><strong>Station assignment</strong> — linking your home station so you see the buses that stop near you.</li>
            <li><strong>Seat reservation</strong> — processing and managing your shuttle bookings.</li>
            <li><strong>Service improvement</strong> — aggregated, anonymised usage data helps the logistics team plan schedules and routes.</li>
          </ul>
        ),
      },
      {
        icon: "schedule",
        title: "3. Data retention",
        content: (
          <>
            <p style={{ margin: 0 }}><strong>Session data</strong>: the sign-in cookie is cleared when you log out; your language and theme preferences stay in your browser's localStorage.</p>
            <p style={para}><strong>Reservation data</strong> is kept on our servers for the academic semester. Past reservation records may be kept for up to 12 months for service analytics.</p>
            <p style={para}><strong>Account data</strong> (login_42, email, station) is kept until the account is deleted or the student is no longer enrolled at 1337 School.</p>
          </>
        ),
      },
      {
        icon: "verified_user",
        title: "4. Your rights",
        content: (
          <ul style={list}>
            <li><strong>View your data</strong> — see your profile, station and reservation history at any time in the app.</li>
            <li><strong>Update your station</strong> — change your home station from your profile at any time.</li>
            <li><strong>Reservation history</strong> — see all past and upcoming reservations in My Trips.</li>
            <li><strong>Account deletion</strong> — delete your account yourself from your profile settings. Your 42 login, email and station are erased and the account is closed; past reservations are kept without them.</li>
            <li><strong>Data portability</strong> — download a copy of your personal data (JSON) from your profile settings.</li>
          </ul>
        ),
      },
      {
        icon: "lock",
        title: "5. Security",
        content: (
          <ul style={list}>
            <li><strong>Token authentication</strong> — every API request is authenticated with a short-lived JSON Web Token that is refreshed automatically.</li>
            <li><strong>HTTPS only</strong> — all traffic between your browser and our servers is encrypted with TLS.</li>
            <li><strong>HashiCorp Vault</strong> — credentials and secrets are managed in HashiCorp Vault.</li>
            <li><strong>Web application firewall</strong> — ModSecurity filters common attacks such as SQL injection and XSS.</li>
            <li><strong>OAuth 2.0</strong> — we never see your 42 password; sign-in is handled by 42 Intra.</li>
          </ul>
        ),
      },
      {
        icon: "cookie",
        title: "6. Cookies & local storage",
        content: (
          <>
            <p style={{ margin: 0 }}>
              Fleetmark uses no tracking, analytics or advertising cookies. Your long-lived sign-in credential (the refresh token) is
              kept in a single essential HttpOnly cookie (<code>fleetmark_refresh</code>) that only our servers can read; page scripts never see it.
            </p>
            <p style={para}>
              Your browser's localStorage holds your cached profile (<code>fleetmark_user</code>), theme (<code>fleetmark_theme</code>) and
              language (<code>fleetmark_lang</code>). The short-lived access token is kept in memory only and is gone when you close the tab.
            </p>
          </>
        ),
      },
      {
        icon: "share",
        title: "7. Data sharing",
        content: (
          <p style={{ margin: 0 }}>
            Your personal data is not shared with any third party. Only the 1337 School logistics staff who run the shuttle service can access it.
            We do not sell, trade or transfer your personal information.
          </p>
        ),
      },
      {
        icon: "contact_mail",
        title: "8. Contact",
        content: (
          <p style={{ margin: 0 }}>
            For any question about this policy or your personal data, contact any member of the Fleetmark team
            through 42 Intra.
          </p>
        ),
      },
    ],
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : octobre 2026",
    intro:
      "Fleetmark / SSBS (Smart School Bus System) est un projet étudiant réalisé à 1337 School, Ben Guerir, Maroc (42 ft_transcendence). Cette politique explique quelles données personnelles nous collectons, comment nous les utilisons et quels sont vos droits.",
    other: "Conditions d'utilisation",
    sections: [
      {
        icon: "database",
        title: "1. Données collectées",
        content: (
          <ul style={list}>
            <li><strong>Identifiant 42 Intra (login_42)</strong> — votre nom d'utilisateur unique sur 42 Intra, utilisé pour l'authentification et l'identification.</li>
            <li><strong>Adresse e-mail</strong> — l'e-mail associé à votre compte 42 Intra, utilisé pour identifier votre compte.</li>
            <li><strong>Station de départ</strong> — votre arrêt à Ben Guerir, utilisé pour afficher les trajets qui le desservent.</li>
            <li><strong>Historique des réservations</strong> — vos réservations de places, avec le détail des trajets, les horodatages et les annulations.</li>
            <li><strong>Lien de la photo de profil</strong> — l'adresse de votre photo de profil 42 Intra, affichée dans l'application.</li>
            <li><strong>Secret de double authentification</strong> — enregistré uniquement si vous activez la double authentification, pour vérifier vos codes.</li>
            <li><strong>Jetons de session</strong> — un jeton de rafraîchissement dans un cookie HttpOnly et un jeton d'accès de courte durée gardé en mémoire, pour garder votre session ouverte.</li>
          </ul>
        ),
      },
      {
        icon: "tune",
        title: "2. Utilisation de vos données",
        content: (
          <ul style={list}>
            <li><strong>Authentification</strong> — vérifier votre identité via OAuth 42 pour vous donner accès à la plateforme.</li>
            <li><strong>Affectation de station</strong> — associer votre station pour afficher les bus qui passent près de chez vous.</li>
            <li><strong>Réservation de places</strong> — traiter et gérer vos réservations de navette.</li>
            <li><strong>Amélioration du service</strong> — des données d'usage agrégées et anonymisées aident l'équipe logistique à planifier horaires et lignes.</li>
          </ul>
        ),
      },
      {
        icon: "schedule",
        title: "3. Conservation des données",
        content: (
          <>
            <p style={{ margin: 0 }}><strong>Données de session</strong> : le cookie de connexion est supprimé à la déconnexion ; vos préférences de langue et de thème restent dans le localStorage de votre navigateur.</p>
            <p style={para}><strong>Les réservations</strong> sont conservées sur nos serveurs pendant le semestre. L'historique peut être conservé jusqu'à 12 mois à des fins de statistiques.</p>
            <p style={para}><strong>Les données de compte</strong> (login_42, e-mail, station) sont conservées jusqu'à la suppression du compte ou la fin de l'inscription à 1337 School.</p>
          </>
        ),
      },
      {
        icon: "verified_user",
        title: "4. Vos droits",
        content: (
          <ul style={list}>
            <li><strong>Consulter vos données</strong> — votre profil, votre station et vos réservations sont visibles à tout moment dans l'application.</li>
            <li><strong>Modifier votre station</strong> — changez votre station depuis votre profil à tout moment.</li>
            <li><strong>Historique</strong> — retrouvez vos réservations passées et à venir dans Mes trajets.</li>
            <li><strong>Suppression du compte</strong> — supprimez vous-même votre compte depuis les paramètres de votre profil. Votre login 42, votre e-mail et votre station sont effacés et le compte est fermé ; les anciennes réservations sont conservées sans ces informations.</li>
            <li><strong>Portabilité</strong> — téléchargez une copie de vos données personnelles (JSON) depuis les paramètres de votre profil.</li>
          </ul>
        ),
      },
      {
        icon: "lock",
        title: "5. Sécurité",
        content: (
          <ul style={list}>
            <li><strong>Authentification par jeton</strong> — chaque requête API est authentifiée par un JSON Web Token de courte durée, renouvelé automatiquement.</li>
            <li><strong>HTTPS uniquement</strong> — tous les échanges entre votre navigateur et nos serveurs sont chiffrés en TLS.</li>
            <li><strong>HashiCorp Vault</strong> — les identifiants et secrets sont gérés dans HashiCorp Vault.</li>
            <li><strong>Pare-feu applicatif</strong> — ModSecurity filtre les attaques courantes comme l'injection SQL et le XSS.</li>
            <li><strong>OAuth 2.0</strong> — nous ne voyons jamais votre mot de passe 42 ; la connexion est gérée par 42 Intra.</li>
          </ul>
        ),
      },
      {
        icon: "cookie",
        title: "6. Cookies et stockage local",
        content: (
          <>
            <p style={{ margin: 0 }}>
              Fleetmark n'utilise aucun cookie de suivi, d'analyse ou de publicité. Votre identifiant de connexion longue durée (le jeton de
              rafraîchissement) est conservé dans un seul cookie essentiel HttpOnly (<code>fleetmark_refresh</code>) que seuls nos serveurs peuvent lire.
            </p>
            <p style={para}>
              Le localStorage de votre navigateur contient votre profil en cache (<code>fleetmark_user</code>), votre thème (<code>fleetmark_theme</code>)
              et votre langue (<code>fleetmark_lang</code>). Le jeton d'accès de courte durée reste en mémoire et disparaît à la fermeture de l'onglet.
            </p>
          </>
        ),
      },
      {
        icon: "share",
        title: "7. Partage des données",
        content: (
          <p style={{ margin: 0 }}>
            Vos données personnelles ne sont partagées avec aucun tiers. Seul le personnel logistique de 1337 School qui gère la navette y a accès.
            Nous ne vendons, n'échangeons ni ne transférons vos informations personnelles.
          </p>
        ),
      },
      {
        icon: "contact_mail",
        title: "8. Contact",
        content: (
          <p style={{ margin: 0 }}>
            Pour toute question sur cette politique ou vos données personnelles, contactez un membre de l'équipe Fleetmark
            via 42 Intra.
          </p>
        ),
      },
    ],
  },
};

export default function PrivacyPolicy() {
  const { lang, setLang } = useTranslation();
  const c = copy[lang] || copy.en;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "grid",
        placeItems: "center",
        padding: "clamp(12px, 4vw, var(--space-6))",
      }}
    >
      <article
        style={{
          width: "100%",
          maxWidth: 780,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(20px, 5vw, var(--space-8))",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "var(--space-5)" }}>
          <Link to="/" style={link}>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_back</span>
            {c.back}
          </Link>
          {/* indigo-500 on indigo-50 is under 4.5:1 for the active pill; the app's darker active-link ink passes */}
          <span className="noc-lang" style={{ "--blue": "var(--nav-active-text)" }}>
            <LanguageSwitcher value={lang} onChange={setLang} />
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-4)" }}>
          <div
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              background: "var(--blue-light)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22, color: "var(--blue)" }}>
              shield
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {c.title}
            </h1>
            <p className="mono" style={{ margin: "4px 0 0", fontSize: 11, color: "var(--dim)" }}>
              {c.updated}
            </p>
          </div>
        </div>

        <p style={{ color: "var(--mid)", fontSize: 15, lineHeight: 1.7, marginBottom: "var(--space-6)" }}>
          {c.intro}
        </p>

        {c.sections.map((section) => (
          <section
            key={section.icon}
            style={{
              marginBottom: "var(--space-4)",
              padding: "clamp(14px, 3.5vw, var(--space-5))",
              borderRadius: "var(--radius-md)",
              background: "var(--surface2)",
              border: "1px solid var(--line2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18, color: "var(--blue)" }}>
                {section.icon}
              </span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{section.title}</h2>
            </div>
            <div style={{ fontSize: 14, color: "var(--mid)", lineHeight: 1.7, overflowWrap: "anywhere" }}>
              {section.content}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "var(--space-3)",
            marginTop: "var(--space-5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "4px 12px",
          }}
        >
          <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>
            © 2026 Fleetmark / SSBS — 1337 School Ben Guerir
          </p>
          <Link to="/terms" style={link}>
            {c.other}
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
