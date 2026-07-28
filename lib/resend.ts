import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

/**
 * Adresse d'expédition des courriels de notification. Par défaut, utilise
 * le domaine de test de Resend (onboarding@resend.dev), qui ne peut envoyer
 * qu'à l'adresse du compte Resend. Pour notifier tous les formateurs et
 * étudiants en production, il faut vérifier un domaine (ex. e-formationsamo.ca)
 * dans Resend et définir RESEND_FROM_EMAIL avec une adresse de ce domaine.
 */
export const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Formation SAMO <onboarding@resend.dev>";

let client: Resend | null = null;

/**
 * Client Resend, initialisé paresseusement. Retourne null si aucune clé
 * API n'est configurée, pour que l'envoi de courriel échoue silencieusement
 * (log seulement) plutôt que de casser le reste de l'application.
 */
export function getResendClient() {
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}
