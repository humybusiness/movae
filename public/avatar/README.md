# Avatars 3D riggés (skinned GLB)

Déposez ici les modèles 3D riggés de l'avatar, exportés en **.glb** (maillage
unique + squelette + skinning), pour un rendu lisse et des mouvements fluides.

Noms de fichiers attendus (l'app les charge automatiquement s'ils existent,
sinon elle retombe sur l'avatar procédural) :

- `male.glb`   → coupe/silhouette masculine de référence
- `female.glb` → coupe/silhouette féminine de référence

## Comment les générer depuis les images de référence

1. **Image → 3D** : sur https://www.meshy.ai (crédits gratuits), « Image to 3D »,
   uploadez l'image (fond uni), générez le modèle en pose A (bras légèrement
   écartés, comme l'image).
2. **Rigging** : dans Meshy, onglet « Rig / Animate » → auto-rig humanoïde.
3. **Export** : téléchargez en **GLB** (avec textures), taille idéale < 5 Mo.
4. Renommez en `male.glb` / `female.glb` et déposez-les dans ce dossier.

Alternatives équivalentes : Tripo3D (tripo3d.ai) ou Rodin (hyper3d.ai) pour le
maillage + Mixamo (mixamo.com) pour l'auto-rig (export FBX → convertir en GLB).

Contraintes utiles : humanoïde debout, échelle réelle (~1.7 unité de haut),
squelette standard (noms type Mixamo « mixamorig… » ou « Hips/Spine/LeftArm… »).
