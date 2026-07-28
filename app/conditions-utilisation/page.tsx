import Link from "next/link";
import Image from "next/image";

const DERNIERE_MISE_A_JOUR = "28 juillet 2026";

export default function ConditionsUtilisationPage() {
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
          Conditions d&apos;utilisation
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Dernière mise à jour : {DERNIERE_MISE_A_JOUR}
        </p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              1. Acceptation
            </h2>
            <p>
              En utilisant la plateforme formationsamo.ca (« la
              plateforme »), tu acceptes les présentes conditions. Si tu
              n&apos;es pas d&apos;accord, tu ne dois pas utiliser la
              plateforme. Pour tout ce qui concerne tes renseignements
              personnels, consulte notre{" "}
              <Link href="/confidentialite" className="text-green-700 hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              2. Ton compte
            </h2>
            <p>
              Ton compte est personnel et confidentiel. Tu es responsable de
              garder ton mot de passe secret et de toute activité effectuée
              sous ton compte. Préviens l&apos;administration immédiatement
              si tu soupçonnes un accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              3. Fiches de présence et signature électronique
            </h2>
            <p>
              En signant une fiche de présence électroniquement, tu
              confirmes l&apos;exactitude des heures déclarées. Une fiche
              inexacte ou falsifiée peut entraîner des conséquences sur ton
              parcours de formation, incluant un signalement à
              l&apos;organisme responsable du financement de la formation,
              le cas échéant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              4. Contenu des cours
            </h2>
            <p>
              Les supports de cours, quiz, travaux pratiques, examens et
              autres contenus pédagogiques mis à disposition sur la
              plateforme sont la propriété de Formation SAMO ou de ses
              formateurs, et sont destinés exclusivement à ton usage
              personnel dans le cadre de ta formation. Toute reproduction,
              redistribution ou usage commercial sans autorisation est
              interdit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              5. Usage attendu
            </h2>
            <p>Tu t&apos;engages à ne pas :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Partager ton compte avec une autre personne ;</li>
              <li>Tenter d&apos;accéder à des comptes ou données qui ne te sont pas destinés ;</li>
              <li>Perturber le fonctionnement normal de la plateforme (ex. tentatives répétées d&apos;intrusion) ;</li>
              <li>Utiliser la plateforme à des fins illégales ou frauduleuses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              6. Disponibilité du service
            </h2>
            <p>
              Nous faisons des efforts raisonnables pour maintenir la
              plateforme accessible, mais ne garantissons pas une
              disponibilité continue. Des interruptions peuvent survenir
              pour maintenance ou pour des raisons hors de notre contrôle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              7. Résiliation
            </h2>
            <p>
              Nous pouvons suspendre ou fermer un compte en cas de
              non-respect de ces conditions, notamment en cas d&apos;usage
              frauduleux ou de partage de compte. Ton accès prend fin
              normalement à la fin de ta formation ou de ton mandat de
              formateur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              8. Modifications
            </h2>
            <p>
              Ces conditions peuvent être mises à jour périodiquement. La
              date de dernière mise à jour figure en haut de cette page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              9. Nous contacter
            </h2>
            <p>
              Pour toute question sur ces conditions, écris-nous à{" "}
              <a href="mailto:info@formationsamo.ca" className="text-green-700 hover:underline">
                info@formationsamo.ca
              </a>
              .
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
