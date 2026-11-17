/** Organes de la scène « Corps » : rôle dans le voyage du sucre. */
export type OrganeId = 'cerveau' | 'coeur' | 'estomac' | 'intestin' | 'pancreas' | 'foie' | 'reins' | 'muscles' | 'graisse' | 'sang';

export const ORGANES: Record<OrganeId, { nom: string; role: string }> = {
  cerveau: { nom: 'Cerveau', role: 'Il consomme du sucre en permanence, sans avoir besoin d\'insuline : c\'est pourquoi l\'hypoglycémie le touche vite (malaise, confusion).' },
  coeur: { nom: 'Cœur', role: 'Il fait circuler le sang, et donc le sucre et l\'insuline, dans tout le corps. Le diabète abîme ses artères (voir Hémodyssée).' },
  estomac: { nom: 'Estomac', role: 'Il reçoit le repas et le libère peu à peu vers l\'intestin. Les analogues du GLP-1 ralentissent cette vidange.' },
  intestin: { nom: 'Intestin', role: 'Il digère les glucides en glucose, qui passe dans le sang. Il prévient aussi le pancréas grâce aux incrétines (GLP-1, GIP).' },
  pancreas: { nom: 'Pancréas', role: 'Ses îlots contiennent les cellules bêta, qui fabriquent l\'insuline (la clé), et les cellules alpha, qui fabriquent le glucagon.' },
  foie: { nom: 'Foie', role: 'Après le repas, il met le sucre en réserve (glycogène). La nuit et entre les repas, il en libère juste ce qu\'il faut. L\'insuline le freine.' },
  reins: { nom: 'Reins', role: 'Ils filtrent le sang et récupèrent tout le sucre jusqu\'à environ 1,80 g/L. Au-delà, le sucre passe dans les urines.' },
  muscles: { nom: 'Muscles', role: 'Grands consommateurs de sucre : l\'insuline leur ouvre la porte. L\'effort fait entrer le sucre même avec peu d\'insuline.' },
  graisse: { nom: 'Graisse du ventre', role: 'Stocke l\'énergie. En excès, elle rend les cellules moins sensibles à l\'insuline : c\'est le terrain du diabète de type 2.' },
  sang: { nom: 'Sang', role: 'Il transporte le sucre (points dorés) et l\'insuline (clés bleues). La glycémie, c\'est la quantité de sucre dans le sang.' },
};
