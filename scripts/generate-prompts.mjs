// Génère docs/prompts-exercices.md : 100 prompts d'images prêts à copier-coller
// dans Midjourney / DALL·E / Flux / Ideogram, tous dans la MÊME direction
// artistique. Usage : node scripts/generate-prompts.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- LA DA MOVAÉ (identique pour les 100 images) ----
const STYLE =
  "Minimal soft-clay 3D illustration. One friendly gender-neutral character with smooth matte clay texture, rounded proportions, simple face with two small dark eyes and no other facial details, light cream skin, short dark hair, plain sage-green (#7FA68A) long-sleeve top, charcoal grey trousers, barefoot-style simple dark shoes. A plain light-wood office chair appears ONLY if the pose is seated. Flat warm off-white background (#F7F7F2), single soft key light from top-left, one gentle contact shadow. Full body always visible, centered, three-quarter front view. Calm, premium, pastel. No text, no watermark, no extra objects. Square 1:1.";

// ---- Les 100 poses (une phrase d'action par exercice) ----
const EXOS = [
  ["rotation-nuque", "Rotations lentes de la nuque", "seated, back tall, head turned fully to one side, gaze following the turn"],
  ["inclinaison-nuque", "Inclinaisons latérales tenues", "seated, right ear dropped toward the right shoulder, opposite shoulder relaxed and low"],
  ["menton-rentre", "Rétractions du menton", "seated, chin gently tucked straight back making a subtle double chin, spine very tall"],
  ["oui-lent", "Flexions-extensions douces", "seated, chin lowered toward the chest in a slow nod, hands resting on thighs"],
  ["demi-cercles-tete", "Demi-cercles de tête", "seated, head rolling in a half circle at the front, chin near the chest turning toward one shoulder"],
  ["etirement-trapezes", "Étirement des trapèzes", "seated, right hand resting softly on the left side of the head, head tilted right, left arm hanging relaxed"],
  ["etirement-elevateur", "Étirement de l'angulaire", "seated, head turned 45 degrees looking down toward the hip, one hand resting on the back of the head"],
  ["iso-front", "Isométrique front contre main", "seated, palm pressed flat against the forehead, head pushing forward against it, nothing moving, calm face"],
  ["iso-lateral", "Isométrique latéral", "seated, palm pressed above the right ear, head pushing sideways into the hand, static gentle effort"],
  ["regard-diagonal", "Diagonales du regard", "seated, head turned diagonally down to the left, gaze following the same diagonal"],
  ["auto-massage-nuque", "Auto-massage de la nuque", "seated, both hands gripping the base of the skull, thumbs massaging the top of the neck"],
  ["petrissage-trapeze", "Pétrissage des trapèzes", "seated, right hand kneading the muscle between the left shoulder and the neck"],
  ["roulements-epaules", "Roulements d'épaules", "seated, both shoulders lifted high toward the ears mid-roll, arms fully relaxed"],
  ["haussements-relaches", "Haussements-relâchés", "seated, both shoulders raised in a big shrug on an inhale, about to drop"],
  ["ouverture-poitrine", "Ouverture de poitrine", "seated, hands clasped behind the lower back, arms straight, chest proudly lifted open"],
  ["serrage-omoplates", "Serrages d'omoplates", "seated, elbows bent at the sides pulled backward, shoulder blades squeezed together, open chest"],
  ["bras-croise", "Étirement bras croisé", "seated, right arm straight across the chest, left forearm hugging it closer to the body"],
  ["etirement-triceps", "Étirement des triceps", "seated, right arm raised with the elbow bent behind the head, left hand gently guiding the elbow"],
  ["ange-assis", "Ange assis (W vers Y)", "seated, both arms raised in a wide W shape with bent elbows, shoulder blades squeezed, chest open"],
  ["cercles-bras", "Cercles de bras", "seated, both arms extended straight out to the sides at shoulder height, mid air-circle"],
  ["rotation-externe", "Rotations externes", "seated, elbows glued to the ribs bent at 90 degrees, palms up, hands rotated outward"],
  ["pendule-bras", "Pendule de bras", "seated leaning slightly forward, one arm hanging straight down fully relaxed like a pendulum"],
  ["etirement-pectoraux", "Ouverture des pectoraux", "seated, hands behind the neck, elbows opened wide toward the back, chest expanded"],
  ["bras-devant-arrondi", "Dos rond bras tendus", "seated, fingers interlaced and palms pushed far forward, upper back rounded, chin tucked between the arms"],
  ["regle-20-20-20", "Regard au loin (20-20-20)", "seated turned slightly sideways, chin up, gazing far away into the distance, relaxed eyes"],
  ["palming", "Palming", "seated, both palms cupped over closed eyes, elbows relaxed, peaceful"],
  ["focus-proche-loin", "Focus proche / lointain", "seated, one arm extended with thumb up at eye level, eyes focused on the thumb"],
  ["cercles-oculaires", "Cercles des yeux", "close-up on the face only, head perfectly still, large eyes looking up and to the side tracing a circle"],
  ["huit-du-regard", "Huit du regard", "close-up on the face only, eyes looking sideways as if tracing a lying figure-eight, head still"],
  ["balayage-lateral", "Balayage latéral", "close-up on the face only, eyes looking far to the right, head perfectly still"],
  ["clignements-conscients", "Clignements conscients", "close-up on the face only, eyes softly closed mid-blink, serene expression"],
  ["micro-repos-yeux", "Micro-repos yeux fermés", "seated, eyes closed, hands open on thighs, deeply relaxed posture"],
  ["horizon-respire", "Horizon + respiration", "standing, arms relaxed, chin slightly lifted, gazing at a far horizon, chest open mid-breath"],
  ["rotation-assise", "Rotation du buste", "seated, torso rotated to the right, right hand on the chair backrest, looking over the shoulder"],
  ["ouverture-livre", "Livre ouvert assis", "seated, one arm sweeping wide open to the side, torso rotated, gaze following the open hand"],
  ["chat-vache-assis", "Chat-vache assis", "seated, hands on knees, back arched with chest forward and head up like a cat-cow stretch"],
  ["deroule-avant", "Déroulé du dos vers l'avant", "seated, torso folded forward over the thighs, arms hanging toward the floor, head fully relaxed"],
  ["extension-thoracique", "Extension du haut du dos", "seated, hands behind the head, elbows wide, upper back arched, chest lifted toward the ceiling"],
  ["bascule-bassin", "Bascules du bassin", "seated, hands on thighs, pelvis tilted forward creating a gentle lower-back arch"],
  ["cobra-bureau", "Cobra de bureau", "seated at a plain light-wood desk, palms flat on it, arms straight, chest pushed forward between the arms, gaze slightly up"],
  ["flexion-laterale", "Flexion latérale bras levé", "seated, right arm reaching overhead, torso bending to the left in a long side arc"],
  ["etirement-grand-dorsal", "Étirement du grand dorsal", "seated, both arms overhead, left hand pulling the right wrist to the left, long side stretch"],
  ["grandissement-axial", "Auto-grandissement", "seated, spine stretched as tall as possible, crown of the head reaching upward, shoulders pressed low"],
  ["extension-debout", "Extension debout", "standing, hands supporting the lower back, hips gently pushed forward, chest open in a slight backbend"],
  ["torsion-douce-debout", "Torsion douce debout", "standing, feet hip-width, torso rotating with both arms completely loose swinging around the body"],
  ["dos-rond-etire", "Étirement inter-omoplates", "seated, fingers interlaced pushing forward, mid-back rounded, head dropped between the arms"],
  ["balance-laterale-assise", "Balances latérales du bassin", "seated, weight shifted onto one buttock, opposite hip slightly lifted, torso calm"],
  ["etirement-flechisseurs", "Étirement des fléchisseurs", "seated, right arm straight forward palm up, left hand gently pulling the fingers down and back"],
  ["etirement-extenseurs", "Étirement des extenseurs", "seated, right arm straight forward palm down, left hand pressing the back of the hand toward the body"],
  ["cercles-poignets", "Cercles de poignets", "seated, both forearms lifted, relaxed hands drawing circles from the wrists"],
  ["eventail-doigts", "Éventail des doigts", "close-up on two hands side by side, fingers spread as wide as possible like open fans"],
  ["priere", "Étirement en prière", "seated, palms pressed together in front of the chest fingers up, forearms horizontal, elbows wide"],
  ["priere-inversee", "Prière inversée", "seated, backs of the hands pressed together in front of the chest, fingers pointing down"],
  ["poing-eclair", "Poing-éclair", "close-up on two hands: one clenched into a fist, the other wide open with spread fingers"],
  ["opposition-pouce", "Opposition du pouce", "close-up on one hand, thumb tip touching the ring fingertip, other fingers softly extended"],
  ["pronation-supination", "Paume ciel, paume terre", "seated, elbows at the ribs, forearms horizontal, one palm facing up and the other facing down"],
  ["massage-avant-bras", "Massage de l'avant-bras", "seated, left hand wrapped around the right forearm, massaging from wrist toward elbow"],
  ["secouer-mains", "Secouer les mains", "seated, both hands loose mid-shake at chest height with a soft motion feel, relaxed shoulders"],
  ["glisse-tendons", "Glissés des tendons", "close-up on one hand making a hook shape, fingers bent at the first knuckles like a soft claw"],
  ["leve-doigts-table", "Levés de doigts sur table", "close-up on one hand flat on a plain light-wood desk, index finger lifted while the others stay down"],
  ["figure-quatre", "Étirement en figure 4", "seated, right ankle resting on the left knee, torso hinged slightly forward with a straight back"],
  ["demi-papillon", "Demi-papillon assis", "seated, right ankle on the left knee, right hand gently pressing the raised knee outward and down"],
  ["genou-poitrine", "Genou vers la poitrine", "seated, both hands hugging one knee pulled up toward the chest, back tall"],
  ["cercles-bassin", "Cercles du bassin", "seated in the middle of the chair, hands on thighs, hips circling while the torso stays stable"],
  ["ouverture-genoux", "Ouverture des genoux", "seated, hands on the outside of both knees, knees pressing outward against the resisting hands"],
  ["poussee-genou-iso", "Poussée de genou isométrique", "seated, right hand pressing down on the right knee while the knee pushes up, static effort"],
  ["fente-debout", "Fente d'ouverture de hanche", "standing lunge, right leg stepped far back, front knee bent, hips pressed forward, torso upright"],
  ["assis-debout", "Assis-debout lents", "caught mid-movement between sitting and standing above the chair, arms crossed on the chest, hips reaching back"],
  ["bascules-debout", "Bascules du bassin debout", "standing, hands on hips, pelvis tilted forward, knees soft"],
  ["cercles-hanches-debout", "Cercles de hanches debout", "standing, hands on hips, hips swung out to one side mid hula-hoop circle"],
  ["marche-fessiers", "Marche des fessiers", "seated, scooting forward on the chair, one hip advanced ahead of the other"],
  ["extensions-jambes", "Extensions de jambes", "seated, right leg extended straight and horizontal, foot flexed toward the body"],
  ["talons-pointes", "Relevés talons-pointes", "seated, both heels lifted high with weight on the toes"],
  ["pompe-mollets", "Pompe à mollets rapide", "seated, heels lifted mid-bounce with a light dynamic feel"],
  ["cercles-chevilles", "Cercles de chevilles", "seated, one foot lifted off the floor, ankle drawing a circle in the air"],
  ["alphabet-cheville", "Alphabet de la cheville", "seated, one foot lifted, toes pointed as if drawing letters in the air"],
  ["etirement-ischios", "Étirement des ischio-jambiers", "seated on the chair edge, right leg straight with the heel on the floor and toes up, torso hinged forward with a flat back"],
  ["marche-assise", "Marche assise", "seated, one knee lifted high mid-march, arms swinging naturally"],
  ["maintien-jambes", "Maintien jambes tendues", "seated, both legs extended straight and horizontal together, feet flexed, posture engaged"],
  ["ciseaux-isometriques", "Ciseaux isométriques", "seated, ankles crossed under the chair, legs pressing against each other, static"],
  ["releve-mollets-debout", "Relevés de mollets debout", "standing on tiptoes with heels high, one hand resting on a plain light-wood desk for balance"],
  ["montees-genoux", "Montées de genoux debout", "standing, one knee raised to hip height mid-march, opposite arm swinging forward"],
  ["etirement-quadriceps", "Étirement des quadriceps", "standing on one leg, the other ankle held behind the buttock by the same-side hand, knees close together"],
  ["marche-2-min", "Vraie marche de 2 minutes", "walking mid-stride with relaxed energy, arms swinging naturally"],
  ["respiration-446", "Respiration 4-4-6", "seated, eyes closed, one hand on the belly, calm chest, deep slow breath"],
  ["coherence-55", "Cohérence 5-5", "seated perfectly upright and serene, hands on thighs, eyes closed, slow breathing"],
  ["respiration-ventrale", "Respiration ventrale", "seated, one hand on the belly and one on the chest, belly gently expanded on an inhale"],
  ["soupir-physiologique", "Soupir physiologique", "seated, chest lifted at the top of a big double inhale, about to release a long sigh"],
  ["respiration-carree", "Respiration carrée", "seated, calm and symmetrical, hands on thighs, eyes softly closed, composed breathing"],
  ["expiration-longue", "Expiration doublée", "seated, shoulders dropping, lips slightly pursed on a long slow exhale"],
  ["etirement-vertical", "Grand étirement vertical", "seated, fingers interlaced overhead, palms pushed toward the ceiling, whole body stretched tall"],
  ["baillement-etire", "Bâillement étiré", "seated, mouth open in a big yawn, arms stretched up and out like waking up"],
  ["tapotements-reveil", "Tapotements de réveil", "seated, both hands patting the opposite shoulders and upper arms, energizing"],
  ["moulinets-energie", "Moulinets dynamiques", "standing, both arms extended making large energetic backward circles"],
  ["detente-machoire", "Détente de la mâchoire", "close-up on the face only, jaw relaxed slightly open, two fingertips massaging the cheeks in circles"],
  ["scan-express", "Scan postural express", "seated, eyes closed, tall relaxed posture, open hands on thighs, serene"],
  ["combo-reveil", "Combo réveil 60 secondes", "rising from the chair mid sit-to-stand, arms reaching upward, energized expression"],
  ["vague-respiration", "Vague du bassin", "seated, spine in a smooth wave with the pelvis tilted and chest opening, breath visible in the posture"],
  ["pause-hydratation", "Pause hydratation", "standing mid-walk holding a plain glass of water, relaxed"],
  ["pause-lumiere", "Bain de lumière", "standing in bright soft daylight coming from the side, chin lifted, eyes toward the light, peaceful"],
];

let md = `# Les 100 prompts d'images Movaé — une seule direction artistique

**DA « Argile douce »** : personnage 3D en argile mate, palette Movaé (sauge #7FA68A,
crème #F7F7F2), lumière studio douce. Distinctif, chaleureux, cohérent d'une image à
l'autre, et tolérant aux petites variations entre générations.

## Conseils d'utilisation
1. Générez en **1:1**, exportez en **WebP ~512×512** (léger).
2. Gardez le **même outil** pour les 100 images (Midjourney : ajoutez \`--sref\` avec
   votre 1re image réussie pour verrouiller le style ; Flux/Ideogram : gardez la seed).
3. Nommez chaque fichier **exactement** comme indiqué (\`id.webp\`) et déposez-le dans
   \`public/exercises/\` — l'app l'affiche automatiquement à la place de la figure
   vectorielle (repli automatique si l'image manque).
4. Relancez \`npm run build\` (site) et \`npm run desktop:build\` (app) après ajout.

---

`;

EXOS.forEach(([id, nom, action], i) => {
  md += `## ${i + 1}. ${nom}\n**Fichier : \`public/exercises/${id}.webp\`**\n\n\`\`\`\n${STYLE} ACTION: ${action}.\n\`\`\`\n\n`;
});

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "prompts-exercices.md"), md);
console.log(`docs/prompts-exercices.md généré (${EXOS.length} prompts)`);
