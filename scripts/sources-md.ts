// Produit docs/SOURCES.md à partir de src/content/sources.ts (même contenu que dans l'application).
import { writeFileSync } from 'node:fs';
import { SOURCES, SOURCES_FICHE } from '../src/content/sources.ts';
import { PATHO_PAR_ID } from '../src/content/pathologies.ts';
import { CLASSE_PAR_ID } from '../src/content/classes.ts';

const l: string[] = ['# Sources de Glucodyssée', '', '> Fichier produit automatiquement par `npm run docs:sources` à partir de `src/content/sources.ts` : ne pas modifier à la main.', '> Dans l\'application : pied de page « Sources des chiffres », ou puces « Sources » sous chaque fiche.', '',
  'Liens : DOI ou PubMed quand ils ont été vérifiés, sinon une recherche PubMed par le titre exact.', '', '## Sommaire', ''];
for (const s of SOURCES) l.push(`- [${s.court}](#${s.id}) · ${s.type}`);
for (const s of SOURCES) {
  l.push('', `## <a id="${s.id}"></a>${s.court}`, '', `*${s.type}* · [ouvrir la source](${s.lien})`, '', `> ${s.citation}`, '', '**Ce que Glucodyssée en tire**', '', ...s.tire.map((t) => `- ${t}`), '', '**Où le voir**', '', ...s.ou.map((t) => `- ${t}`));
  if (s.limites) l.push('', `**Limites** : ${s.limites}`);
  const fiches = Object.entries(SOURCES_FICHE).filter(([, ids]) => ids.includes(s.id)).map(([k]) => PATHO_PAR_ID[k]?.nom ?? CLASSE_PAR_ID[k as keyof typeof CLASSE_PAR_ID]?.court ?? k);
  if (fiches.length) l.push('', `**Fiches qui la citent** : ${fiches.join(', ')}.`);
}
writeFileSync(new URL('../docs/SOURCES.md', import.meta.url), l.join('\n') + '\n');
console.log(`docs/SOURCES.md : ${SOURCES.length} sources`);
