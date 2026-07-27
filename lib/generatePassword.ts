import { randomInt } from "crypto";

// Génère un mot de passe temporaire lisible (sans caractères ambigus comme
// 0/O ou 1/l/I), utilisé pour les comptes créés par l'administration.
// Usage serveur uniquement (routes API) — s'appuie sur node:crypto.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10): string {
  let password = "";

  for (let i = 0; i < length; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }

  return password;
}
