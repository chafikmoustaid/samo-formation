import Link from "next/link";
import Image from "next/image";

const DERNIERE_MISE_A_JOUR = "28 juillet 2026";

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-block mb-8">
          <Image
            src="/logo-samo.png"
            alt="Formation SAMO"
            width={160}
            height={49}
            className="h-9 w-auto"
          />
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Dernière mise à jour : {DERNIERE_MISE_A_JOUR}
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              1. Qui nous sommes
            </h2>
            <p>
              Formation SAMO (« nous ») exploite la plateforme
              e-formation.net destinée à ses étudiants et formateurs. La
              présente politique explique quels renseignements personnels
              nous recueillons, pourquoi, et comment ils sont protégés,
              conformément à la Loi sur la protection des renseignements
              personnels dans le secteur privé (Loi 25, Québec).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              2. Renseignements que nous recueillons
            </h2>
            <p>Selon ton rôle (étudiant, formateur ou administration), nous recueillons :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ton nom complet et ton adresse courriel ;</li>
              <li>
                Ta signature électronique (dessinée ou saisie sous forme de
                texte), utilisée pour valider les fiches de présence ;
              </li>
              <li>
                Les données liées à ta formation : formation suivie,
                matières enseignées, heures de présence déclarées et
                validées ;
              </li>
              <li>Un mot de passe, stocké de façon chiffrée (jamais en clair) ;</li>
              <li>
                Pour l&apos;administration : un historique des changements
                sensibles effectués sur les comptes (rôle, formation,
                matières), incluant l&apos;identité de la personne ayant
                effectué le changement.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              3. Pourquoi nous les recueillons
            </h2>
            <p>Ces renseignements servent uniquement à :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Créer et gérer ton compte sur la plateforme ;</li>
              <li>
                Produire, faire signer et valider les fiches de présence
                requises pour ta formation ;
              </li>
              <li>Te donner accès aux contenus de cours, quiz, travaux pratiques et examens ;</li>
              <li>T&apos;envoyer des notifications liées à tes fiches (création, validation, refus), lorsque cette fonctionnalité est active ;</li>
              <li>Assurer la sécurité et la traçabilité des accès administratifs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              4. Consentement
            </h2>
            <p>
              En créant un compte et en signant une fiche de présence, tu
              consens à la collecte et à l&apos;utilisation de ta signature
              électronique et des renseignements ci-dessus, aux seules fins
              décrites dans cette politique. Tu peux retirer ton consentement
              en tout temps en nous contactant, sous réserve des obligations
              de conservation liées à ta formation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              5. Où et combien de temps tes données sont conservées
            </h2>
            <p>
              Tes renseignements sont hébergés chez Supabase, dans un centre
              de données situé au Canada (région Centre du Canada). Ils sont
              conservés le temps nécessaire à ta formation et aux obligations
              légales ou contractuelles qui s&apos;y rattachent (notamment la
              justification des heures de présence), puis supprimés ou
              anonymisés lorsqu&apos;ils ne sont plus nécessaires.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              6. Partage avec des tiers
            </h2>
            <p>
              Nous ne vendons ni ne louons tes renseignements personnels.
              Ils peuvent être traités par des fournisseurs qui nous aident à
              exploiter la plateforme, dans le strict cadre de ce service :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Supabase (hébergement de la base de données et authentification, Canada) ;</li>
              <li>Vercel (hébergement de l&apos;application web) ;</li>
              <li>Resend (envoi des courriels de notification, lorsque cette fonctionnalité est active).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              7. Sécurité
            </h2>
            <p>
              L&apos;accès à tes données est protégé par des règles de
              sécurité au niveau de la base de données (chaque personne ne
              voit que ce qui la concerne), par un mot de passe chiffré, et
              par une journalisation des actions sensibles effectuées par
              l&apos;administration. Toute action de gestion des rôles ou
              des accès nécessite une confirmation explicite et laisse une
              trace.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              8. Tes droits
            </h2>
            <p>
              Tu peux en tout temps demander à consulter, corriger ou faire
              supprimer les renseignements personnels que nous détenons à
              ton sujet, ou déposer une plainte auprès de la Commission
              d&apos;accès à l&apos;information du Québec si tu estimes que
              tes droits n&apos;ont pas été respectés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              9. Nous contacter
            </h2>
            <p>
              Pour toute question sur cette politique ou pour exercer tes
              droits, écris-nous à{" "}
              <a href="mailto:info@e-formation.net" className="text-green-700 hover:underline">
                info@e-formation.net
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              10. Modifications
            </h2>
            <p>
              Cette politique peut être mise à jour périodiquement. La date
              de dernière mise à jour figure en haut de cette page.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
