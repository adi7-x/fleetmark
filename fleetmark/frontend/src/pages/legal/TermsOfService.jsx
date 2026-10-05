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
    title: "Terms of Service",
    updated: "Last updated: October 2026",
    intro:
      "By using Fleetmark / SSBS (Smart School Bus System), you agree to these terms of service. Please read them carefully before using the platform.",
    other: "Privacy Policy",
    sections: [
      {
        icon: "person_check",
        title: "1. Eligibility",
        content: (
          <>
            <p style={{ margin: 0 }}>Fleetmark is available only to:</p>
            <ul style={{ ...list, marginTop: 8 }}>
              <li>Students enrolled at 1337 School (Ben Guerir campus) with an active 42 Intra account.</li>
              <li>1337 School logistics staff given the logistics role by an administrator.</li>
              <li>Approved bus drivers whose accounts are created by the logistics staff.</li>
            </ul>
            <p style={para}>Access is granted through 42 Intra sign-in. If your 42 account is deactivated or you are no longer enrolled, your access to Fleetmark ends.</p>
          </>
        ),
      },
      {
        icon: "rule",
        title: "2. Acceptable use",
        content: (
          <ul style={list}>
            <li><strong>Personal use only</strong> — reserve seats only for yourself. Do not book for others or hold reservations you do not intend to use.</li>
            <li><strong>No abuse</strong> — do not try to manipulate the reservation system, exploit bugs or use automated tools to get seats.</li>
            <li><strong>Accurate information</strong> — keep your home station correct. Booking for a stop you do not use wastes limited seats.</li>
            <li><strong>Respect</strong> — treat drivers, passengers and logistics staff with respect. Report problems through the in-app reports.</li>
          </ul>
        ),
      },
      {
        icon: "event_seat",
        title: "3. Reservations",
        content: (
          <ul style={list}>
            <li><strong>One seat per night</strong> — each student may hold one reservation per night.</li>
            <li><strong>Cancellation</strong> — if you cannot take your trip, cancel as early as possible so the seat goes to someone else.</li>
            <li><strong>No-shows</strong> — repeatedly reserving without boarding may lead to a temporary booking restriction.</li>
            <li><strong>Availability</strong> — seats are first come, first served. A seat on a given trip is not guaranteed.</li>
            <li><strong>Confirmation</strong> — a reservation counts only once the app confirms it. If the trip is full, the booking is refused.</li>
          </ul>
        ),
      },
      {
        icon: "schedule",
        title: "4. Service hours",
        content: (
          <>
            <p style={{ margin: 0 }}>The night shuttle departs from 1337 at these times:</p>
            <ul style={{ ...list, marginTop: 8 }}>
              <li><strong>Peak — 21:00, 22:00 and 01:00:</strong> two buses, OCP Route and Coin Blue Route.</li>
              <li><strong>Midnight — 23:00 and 00:00:</strong> one bus serving every stop of both routes.</li>
              <li><strong>Late night — hourly from 03:00 to 06:00:</strong> one bus serving every stop.</li>
              <li>There is no departure at 02:00.</li>
            </ul>
            <p style={para}>Schedules may change with demand, holidays and operations. The app always shows the current schedule.</p>
          </>
        ),
      },
      {
        icon: "warning",
        title: "5. Liability",
        content: (
          <ul style={list}>
            <li>1337 School and the Fleetmark team are not liable for missed buses caused by downtime, network problems or technical failures.</li>
            <li>The shuttle is provided as a convenience; uninterrupted service is not guaranteed.</li>
            <li>Schedules and routes may be changed or cancelled, with or without notice, because of weather, road conditions or operations.</li>
            <li>Passengers are responsible for belongings left on the shuttle.</li>
          </ul>
        ),
      },
      {
        icon: "block",
        title: "6. Account suspension",
        content: (
          <>
            <p style={{ margin: 0 }}>An account may be suspended or closed in case of:</p>
            <ul style={{ ...list, marginTop: 8, gap: 6 }}>
              <li>a breach of the acceptable use rules;</li>
              <li>repeated no-shows or reservation abuse;</li>
              <li>deactivation of the linked 42 Intra account;</li>
              <li>expulsion or withdrawal from 1337 School;</li>
              <li>behaviour that disrupts the service, at the logistics staff's discretion.</li>
            </ul>
            <p style={para}>Suspended users are notified and may appeal to the 1337 School administration.</p>
          </>
        ),
      },
      {
        icon: "update",
        title: "7. Changes to these terms",
        content: (
          <p style={{ margin: 0 }}>
            These terms may be updated at any time. Significant changes are announced in the app. Continuing to use Fleetmark after a change means
            you accept the revised terms. The date at the top of this page shows the latest revision.
          </p>
        ),
      },
      {
        icon: "info",
        title: "8. Intellectual property",
        content: (
          <p style={{ margin: 0 }}>
            Fleetmark / SSBS is a student project built as part of the 42 curriculum (ft_transcendence). The code, design and assets are the
            collective work of the project team, provided for educational and operational use at 1337 School only.
          </p>
        ),
      },
    ],
  },
  fr: {
    back: "Retour à l'accueil",
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour : octobre 2026",
    intro:
      "En utilisant Fleetmark / SSBS (Smart School Bus System), vous acceptez les présentes conditions d'utilisation. Lisez-les attentivement avant d'utiliser la plateforme.",
    other: "Politique de confidentialité",
    sections: [
      {
        icon: "person_check",
        title: "1. Conditions d'accès",
        content: (
          <>
            <p style={{ margin: 0 }}>Fleetmark est réservé :</p>
            <ul style={{ ...list, marginTop: 8 }}>
              <li>aux étudiants inscrits à 1337 School (campus de Ben Guerir) disposant d'un compte 42 Intra actif ;</li>
              <li>au personnel logistique de 1337 School auquel un administrateur a attribué le rôle logistique ;</li>
              <li>aux chauffeurs agréés dont le compte est créé par le personnel logistique.</li>
            </ul>
            <p style={para}>L'accès se fait par la connexion 42 Intra. Si votre compte 42 est désactivé ou si vous n'êtes plus inscrit, votre accès à Fleetmark prend fin.</p>
          </>
        ),
      },
      {
        icon: "rule",
        title: "2. Règles d'utilisation",
        content: (
          <ul style={list}>
            <li><strong>Usage personnel</strong> — ne réservez que pour vous. Ne réservez pas pour d'autres et ne gardez pas de réservation que vous n'utiliserez pas.</li>
            <li><strong>Pas d'abus</strong> — n'essayez pas de manipuler le système de réservation, d'exploiter des bugs ou d'utiliser des outils automatisés.</li>
            <li><strong>Informations exactes</strong> — gardez votre station à jour. Réserver pour un arrêt que vous n'utilisez pas gaspille des places.</li>
            <li><strong>Respect</strong> — respectez les chauffeurs, les passagers et le personnel logistique. Signalez les problèmes via les signalements de l'application.</li>
          </ul>
        ),
      },
      {
        icon: "event_seat",
        title: "3. Réservations",
        content: (
          <ul style={list}>
            <li><strong>Une place par nuit</strong> — chaque étudiant peut avoir une seule réservation par nuit.</li>
            <li><strong>Annulation</strong> — si vous ne pouvez pas prendre votre trajet, annulez au plus tôt pour libérer la place.</li>
            <li><strong>Absences</strong> — réserver sans embarquer de façon répétée peut entraîner une restriction temporaire des réservations.</li>
            <li><strong>Disponibilité</strong> — les places sont attribuées dans l'ordre des demandes. Une place sur un trajet donné n'est pas garantie.</li>
            <li><strong>Confirmation</strong> — une réservation n'est valable qu'une fois confirmée dans l'application. Si le trajet est complet, elle est refusée.</li>
          </ul>
        ),
      },
      {
        icon: "schedule",
        title: "4. Horaires du service",
        content: (
          <>
            <p style={{ margin: 0 }}>La navette de nuit part de 1337 aux horaires suivants :</p>
            <ul style={{ ...list, marginTop: 8 }}>
              <li><strong>Pointe — 21:00, 22:00 et 01:00 :</strong> deux bus, OCP Route et Coin Blue Route.</li>
              <li><strong>Minuit — 23:00 et 00:00 :</strong> un bus qui dessert tous les arrêts des deux lignes.</li>
              <li><strong>Fin de nuit — chaque heure de 03:00 à 06:00 :</strong> un bus qui dessert tous les arrêts.</li>
              <li>Pas de départ à 02:00.</li>
            </ul>
            <p style={para}>Les horaires peuvent changer selon la demande, les vacances et les contraintes d'exploitation. L'application affiche toujours les horaires en vigueur.</p>
          </>
        ),
      },
      {
        icon: "warning",
        title: "5. Responsabilité",
        content: (
          <ul style={list}>
            <li>1337 School et l'équipe Fleetmark ne sont pas responsables des bus manqués à cause d'une panne, d'un problème réseau ou d'une défaillance technique.</li>
            <li>La navette est un service de confort ; sa disponibilité continue n'est pas garantie.</li>
            <li>Les horaires et lignes peuvent être modifiés ou annulés, avec ou sans préavis, en raison de la météo, de l'état des routes ou de l'exploitation.</li>
            <li>Les passagers sont responsables des effets personnels laissés dans la navette.</li>
          </ul>
        ),
      },
      {
        icon: "block",
        title: "6. Suspension du compte",
        content: (
          <>
            <p style={{ margin: 0 }}>Un compte peut être suspendu ou fermé en cas :</p>
            <ul style={{ ...list, marginTop: 8, gap: 6 }}>
              <li>de non-respect des règles d'utilisation ;</li>
              <li>d'absences répétées ou d'abus de réservation ;</li>
              <li>de désactivation du compte 42 Intra associé ;</li>
              <li>d'exclusion ou de départ de 1337 School ;</li>
              <li>de comportement perturbant le service, à l'appréciation du personnel logistique.</li>
            </ul>
            <p style={para}>Les utilisateurs suspendus sont prévenus et peuvent faire appel auprès de l'administration de 1337 School.</p>
          </>
        ),
      },
      {
        icon: "update",
        title: "7. Modification des conditions",
        content: (
          <p style={{ margin: 0 }}>
            Ces conditions peuvent être modifiées à tout moment. Les changements importants sont annoncés dans l'application. Continuer à utiliser
            Fleetmark après une modification vaut acceptation. La date en haut de cette page indique la dernière révision.
          </p>
        ),
      },
      {
        icon: "info",
        title: "8. Propriété intellectuelle",
        content: (
          <p style={{ margin: 0 }}>
            Fleetmark / SSBS est un projet étudiant réalisé dans le cadre du cursus 42 (ft_transcendence). Le code, le design et les ressources
            sont le travail collectif de l'équipe, mis à disposition pour un usage pédagogique et opérationnel à 1337 School uniquement.
          </p>
        ),
      },
    ],
  },
};

export default function TermsOfService() {
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
              background: "var(--green-light)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 22, color: "var(--green)" }}>
              gavel
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
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18, color: "var(--green)" }}>
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
          <Link to="/privacy" style={link}>
            {c.other}
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
