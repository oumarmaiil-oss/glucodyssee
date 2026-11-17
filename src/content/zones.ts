/** Zones anatomiques cliquables (corps, îlot, cellule, rein). */
import type { Niveau } from '../core/types.ts';

export type ZoneId =
  | 'estomac' | 'intestin' | 'veinePorte' | 'foie' | 'sang' | 'pancreas' | 'ilot'
  | 'muscles' | 'graisse' | 'cerveau' | 'reins' | 'globules'
  | 'yeux' | 'nerfs' | 'pieds' | 'coeur';

export interface Zone {
  id: ZoneId;
  nom: string;
  role: Record<Niveau, string>;
  chiffres?: string; // repères (niveau 2-3)
}

export const ZONES: Record<ZoneId, Zone> = {
  estomac: {
    id: 'estomac', nom: 'Estomac',
    role: {
      1: 'Le repas arrive dans l\'estomac, qui le brasse puis le laisse passer petit à petit vers l\'intestin.',
      2: 'L\'estomac se vide progressivement dans le duodénum : c\'est la vidange gastrique. Plus elle est rapide, plus la glycémie monte vite après le repas. Les aGLP-1 la ralentissent.',
      3: 'La vitesse de vidange gastrique explique une grande partie de la forme du pic glycémique post-prandial. Les fibres, les graisses et les protéines du repas la ralentissent ; les aGLP-1 aussi (effet plus marqué au début du traitement).',
    },
  },
  intestin: {
    id: 'intestin', nom: 'Intestin grêle',
    role: {
      1: 'L\'amidon du riz, du mil ou du pain est coupé en petits morceaux de sucre (glucose), qui traversent la paroi de l\'intestin et passent dans le sang.',
      2: 'Les enzymes (amylase, puis enzymes de la paroi) transforment l\'amidon en glucose, absorbé par des transporteurs (SGLT1, GLUT2). L\'intestin prévient aussi le pancréas : il libère des hormones, les incrétines (GLP-1, GIP).',
      3: 'Effet incrétine : à glycémie égale, le glucose avalé déclenche bien plus d\'insuline que le glucose injecté en veine, grâce au GIP (cellules K du duodénum) et au GLP-1 (cellules L de l\'iléon et du côlon). Cet effet est diminué dans le type 2. Le GLP-1 est détruit en quelques minutes par l\'enzyme DPP-4.',
    },
  },
  veinePorte: {
    id: 'veinePorte', nom: 'Veine porte',
    role: {
      1: 'Le sucre absorbé passe d\'abord par le foie, grâce à une grosse veine : la veine porte.',
      2: 'Tout le sang de l\'intestin traverse le foie avant de rejoindre le cœur. Le foie reçoit aussi directement l\'insuline du pancréas, en plus forte concentration que le reste du corps.',
      3: 'L\'insuline sécrétée dans la veine porte est en partie captée par le foie dès son premier passage : le foie voit environ deux fois plus d\'insuline que les muscles. L\'insuline injectée sous la peau inverse ce rapport.',
    },
    chiffres: 'Dans le modèle : le foie voit 2 fois plus d\'insuline du pancréas que la périphérie',
  },
  foie: {
    id: 'foie', nom: 'Foie',
    role: {
      1: 'Le foie est le grenier du sucre : il le met en réserve après le repas, et le relâche la nuit et entre les repas.',
      2: 'Après le repas, l\'insuline lui fait stocker le glucose sous forme de glycogène et arrêter sa propre production. À jeun, le glucagon lui fait libérer du glucose (glycogénolyse) et en fabriquer (néoglucogenèse).',
      3: 'À jeun, le foie produit environ 2 mg de glucose par kg et par minute, autant que ce que consomment le cerveau et les tissus. Dans le type 2, le foie résiste à l\'insuline : sa production nocturne non freinée explique la glycémie haute au réveil. La metformine la réduit.',
    },
    chiffres: 'Production à jeun ≈ 2 mg/kg/min · réserve de glycogène du foie ≈ 100 g',
  },
  sang: {
    id: 'sang', nom: 'Le sucre dans le sang',
    role: {
      1: 'Le sang transporte le sucre vers tous les organes. Il en contient très peu : à peine une cuillère à café dans tout le corps.',
      2: 'La glycémie normale à jeun est inférieure à 1,00 g/L. Elle monte après le repas puis redescend en 2 à 3 heures. Sous 0,70 g/L, c\'est l\'hypoglycémie.',
      3: 'Avec 5 litres de sang à 0,90 g/L, le sang ne contient qu\'environ 4,5 g de glucose : la régulation doit être permanente. Diabète : glycémie à jeun ≥ 1,26 g/L (à deux reprises), ou ≥ 2,00 g/L 2 h après une HGPO à 75 g, ou ≥ 2,00 g/L à tout moment avec des symptômes, ou HbA1c ≥ 6,5 % (ADA).',
    },
    chiffres: 'À jeun : normal < 1,00 g/L · prédiabète 1,00-1,25 · diabète ≥ 1,26 · hypoglycémie < 0,70',
  },
  pancreas: {
    id: 'pancreas', nom: 'Pancréas',
    role: {
      1: 'Le pancréas surveille le sucre du sang. Quand il monte, il libère l\'insuline, la clé qui fait entrer le sucre dans les cellules.',
      2: 'Le pancréas a deux rôles : digestif (enzymes) et hormonal. La partie hormonale est faite de petits amas de cellules dispersés : les îlots de Langerhans, qui fabriquent l\'insuline et le glucagon.',
      3: 'Les îlots ne représentent qu\'environ 1 à 2 % de la masse du pancréas. Dans le type 1, une réaction auto-immune détruit les cellules bêta ; dans le type 2, elles fonctionnent de moins en moins bien au fil des années.',
    },
  },
  ilot: {
    id: 'ilot', nom: 'Îlot de Langerhans',
    role: {
      1: 'Dans l\'îlot, les cellules bêta fabriquent l\'insuline (qui fait baisser le sucre) et les cellules alpha le glucagon (qui le fait remonter).',
      2: 'Quand le glucose entre dans la cellule bêta, elle produit plus d\'énergie (ATP), ce qui ferme ses canaux potassiques (K-ATP) et déclenche la libération d\'insuline. Les sulfamides ferment directement ces canaux, même quand le sucre est bas.',
      3: 'Chez l\'humain, les cellules sont mélangées dans l\'îlot : environ 55 % de bêta, 35 % d\'alpha et 10 % de delta (la proportion varie d\'une personne à l\'autre). L\'insuline des cellules bêta freine les cellules alpha voisines ; sans elle (type 1), le glucagon reste trop élevé.',
    },
    chiffres: 'Îlot humain : ≈ 55 % de cellules bêta, 35 % alpha, 10 % delta (Cabrera 2006 ; variable)',
  },
  muscles: {
    id: 'muscles', nom: 'Muscles',
    role: {
      1: 'Les muscles sont les plus gros consommateurs de sucre après le repas. L\'insuline leur ouvre la porte ; l\'effort physique aussi.',
      2: 'L\'insuline se fixe sur son récepteur, ce qui fait monter les transporteurs GLUT4 à la surface de la cellule : le glucose entre. La contraction musculaire fait monter GLUT4 par une autre voie, sans insuline.',
      3: 'Le muscle assure la plus grande part de la captation du glucose stimulée par l\'insuline (environ 80 % lors des clamps). Dans le type 2, la cascade après le récepteur répond mal : c\'est l\'insulinorésistance. L\'activité physique augmente la sensibilité pendant plusieurs heures.',
    },
  },
  graisse: {
    id: 'graisse', nom: 'Tissu gras',
    role: {
      1: 'Le tissu gras stocke l\'énergie en trop. Le gras du ventre favorise la résistance à l\'insuline.',
      2: 'L\'insuline fait entrer le glucose dans les cellules graisseuses et bloque la libération des graisses. Le tour de taille élevé (graisse viscérale) s\'accompagne d\'insulinorésistance.',
      3: 'Sans insuline (type 1 non traité), les graisses sont libérées en masse ; le foie les transforme en corps cétoniques : c\'est le mécanisme de l\'acidocétose. Les acides gras en excès entretiennent aussi l\'insulinorésistance du muscle et du foie.',
    },
  },
  cerveau: {
    id: 'cerveau', nom: 'Cerveau',
    role: {
      1: 'Le cerveau a besoin de sucre en permanence, et il n\'a pas besoin d\'insuline pour le prendre. C\'est lui qui souffre en premier en cas d\'hypoglycémie.',
      2: 'Le cerveau consomme environ 120 g de glucose par jour, sans insuline. Sous 0,70 g/L apparaissent sueurs, tremblements, faim (alerte de l\'adrénaline) ; plus bas, confusion, troubles du comportement, puis perte de connaissance.',
      3: 'Les signes « adrénergiques » (sueurs, palpitations, tremblements) précèdent les signes « neuroglucopéniques » (troubles de la concentration, de la parole, convulsions). Après des hypoglycémies répétées, les signes d\'alerte s\'émoussent : hypoglycémie non ressentie, plus dangereuse.',
    },
    chiffres: 'Consommation ≈ 120 g de glucose par jour, sans insuline',
  },
  reins: {
    id: 'reins', nom: 'Reins',
    role: {
      1: 'Les reins filtrent le sang et récupèrent tout le sucre. Quand il y en a trop dans le sang, il passe dans les urines.',
      2: 'Les reins filtrent environ 180 g de glucose par jour et le réabsorbent presque entièrement, surtout grâce au transporteur SGLT2. Au-dessus d\'environ 1,80 g/L, la capacité est dépassée : le sucre passe dans les urines et entraîne de l\'eau (soif, urines abondantes).',
      3: 'SGLT2 (début du tubule) réabsorbe environ 90 % du glucose filtré, SGLT1 le reste. Les iSGLT2 abaissent le seuil rénal vers 0,70-0,75 g/L : 40 à 100 g de glucose quittent le corps chaque jour par les urines, indépendamment de l\'insuline.',
    },
    chiffres: 'Seuil rénal ≈ 1,80 g/L · filtrés ≈ 180 g de glucose par jour',
  },
  globules: {
    id: 'globules', nom: 'Globules rouges et HbA1c',
    role: {
      1: 'Le sucre colle peu à peu à l\'hémoglobine des globules rouges. On mesure cette « hémoglobine sucrée » (HbA1c) pour connaître la glycémie des 3 derniers mois.',
      2: 'Les globules rouges vivent environ 120 jours. Plus la glycémie moyenne est haute, plus l\'HbA1c est élevée. Objectif le plus fréquent dans le diabète : HbA1c < 7 %, à adapter à chaque patient.',
      3: 'Formule ADAG : glycémie moyenne (mg/dL) ≈ 28,7 × HbA1c − 46,7 ; une HbA1c de 7 % correspond à environ 1,54 g/L de moyenne. L\'HbA1c est faussée par les anémies, les hémoglobinopathies (drépanocytose) et les transfusions.',
    },
    chiffres: 'HbA1c 7 % ≈ glycémie moyenne 1,54 g/L (étude ADAG)',
  },
  yeux: {
    id: 'yeux', nom: 'Yeux (rétine)',
    role: {
      1: 'Le sucre en excès abîme les tout petits vaisseaux de l\'œil. Au début, on ne sent rien : seul l\'examen du fond d\'œil le voit.',
      2: 'Rétinopathie diabétique : micro-anévrismes, petites hémorragies, puis nouveaux vaisseaux fragiles qui peuvent saigner et rendre aveugle. Un bon équilibre du sucre et de la tension la ralentit ; le dépistage permet de traiter à temps (laser, injections).',
      3: 'Le risque augmente avec l\'HbA1c et la durée du diabète, et avec la PA. Dépistage : fond d\'œil au diagnostic du type 2 (dans les 5 ans pour le type 1), puis tous les 1 à 2 ans selon les résultats (ADA).',
    },
  },
  nerfs: {
    id: 'nerfs', nom: 'Nerfs',
    role: {
      1: 'Avec les années, le sucre abîme les nerfs, surtout ceux des pieds : fourmillements, brûlures, puis perte de la sensibilité.',
      2: 'Neuropathie périphérique « en chaussettes » : le pied ne sent plus une blessure, une chaussure qui serre ou un sol brûlant. Elle touche aussi les nerfs des organes (digestion, vessie, érection, tension en position debout).',
      3: 'Dépistage au moins une fois par an : monofilament, diapason, réflexes. La perte de la sensibilité protectrice est le principal facteur de risque d\'ulcère du pied.',
    },
  },
  pieds: {
    id: 'pieds', nom: 'Pieds',
    role: {
      1: 'Un pied qui ne sent plus et une plaie qui guérit mal : le pied diabétique peut mener à l\'amputation. On le prévient en regardant ses pieds tous les jours.',
      2: 'Neuropathie (on ne sent plus) + artérite (le sang arrive mal) + infection : c\'est le trio du pied diabétique. Prévention : examen quotidien, chaussures adaptées, pas de marche pieds nus, soins des ongles prudents.',
      3: 'Toute plaie du pied chez un diabétique est une urgence : mise en décharge, recherche d\'infection et d\'artérite, soins locaux. L\'examen des pieds se fait au moins une fois par an, à chaque consultation en cas de risque.',
    },
  },
  coeur: {
    id: 'coeur', nom: 'Cœur et artères',
    role: {
      1: 'Le diabète abîme aussi les grosses artères : il augmente le risque d\'infarctus et d\'AVC. Dans Hémodyssée, on voit ces artères en détail.',
      2: 'Le diabète double environ le risque de maladie cardiovasculaire. La tension, le cholestérol et le tabac comptent autant que le sucre. Les iSGLT2 et les aGLP-1 protègent le cœur et les reins, indépendamment de l\'HbA1c.',
      3: 'Chez un diabétique de type 2 avec maladie cardiovasculaire, insuffisance cardiaque ou maladie rénale, on choisit un iSGLT2 ou un aGLP-1 au bénéfice démontré quel que soit l\'HbA1c (ADA). L\'objectif de LDL est aussi plus bas.',
    },
  },
};
