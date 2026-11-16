// Préfecture 404 — Référentiel géographique
// -------------------------------------------------------------
// PRINCIPE DE COHÉRENCE (voir docs/DONNEES.md)
// Une déclaration n'est utilisée dans un dossier que si sa vérité est CERTAINE.
//  - VRAI   : le fait est listé explicitement sur la fiche commune.
//  - FAUX   : le fait est impossible, car la commune est dans une région
//             que le fleuve / le massif ne touche pas.
//  - sinon  : zone grise, la déclaration est interdite (le validateur bloque).
// Les listes de régions ci-dessous sont donc volontairement LARGES :
// une région en trop ne crée jamais d'erreur, elle réduit seulement
// le nombre de fausses déclarations possibles.

// Fleuves et rivières. `regions` = toutes les régions que le cours d'eau
// touche ou longe (null = inconnu, aucune fausse déclaration générée).
export const COURS_EAU = {
  Loire:    { article: 'la',  regions: ['84', '27', '24', '52'] },
  Seine:    { article: 'la',  regions: ['27', '44', '11', '28'] },
  'Rhône':  { article: 'le',  regions: ['84', '93', '76'] },
  Garonne:  { article: 'la',  regions: ['76', '75'] },
  'Saône':  { article: 'la',  regions: ['44', '27', '84'] },
  Dordogne: { article: 'la',  regions: ['84', '75', '76'] },
  Rhin:     { article: 'le',  regions: ['44'] },
  Moselle:  { article: 'la',  regions: ['44'] },
  'Isère':  { article: "l'", regions: ['84'] },
  Allier:   { article: "l'", regions: ['84', '76', '27', '24'] },
  Marne:    { article: 'la',  regions: ['44', '32', '11'] },
  Somme:    { article: 'la',  regions: ['32'] },
  Vilaine:  { article: 'la',  regions: ['53', '52'] },
  Doubs:    { article: 'le',  regions: ['27'] },
  Tarn:     { article: 'le',  regions: ['76'] },
  // Rivières utilisées uniquement en déclarations VRAIES (régions non arrêtées).
  Maine:    { article: 'la',  regions: null },
  Sarthe:   { article: 'la',  regions: null },
  Orne:     { article: "l'", regions: null },
  Aude:     { article: "l'", regions: null },
  Yonne:    { article: "l'", regions: null },
  Clain:    { article: 'le',  regions: null },
  Vienne:   { article: 'la',  regions: null },
  Eure:     { article: "l'", regions: null },
  Meurthe:  { article: 'la',  regions: null },
  Ill:      { article: "l'", regions: null },
  Drac:     { article: 'le',  regions: null },
  Cher:     { article: 'le',  regions: null },
};

export const MASSIFS = {
  Alpes:            { libelle: 'les Alpes',          regions: ['84', '93'] },
  'Pyrénées':       { libelle: 'les Pyrénées',       regions: ['76', '75'] },
  Vosges:           { libelle: 'les Vosges',         regions: ['44', '27'] },
  Jura:             { libelle: 'le Jura',            regions: ['27', '84'] },
  'Massif central': { libelle: 'le Massif central',  regions: ['84', '76', '75', '27'] },
};

export const MERS = {
  Manche:        { libelle: 'la Manche' },
  'Mer du Nord': { libelle: 'la mer du Nord' },
  Atlantique:    { libelle: "l'océan Atlantique" },
  'Méditerranée': { libelle: 'la mer Méditerranée' },
};

export function duCoursEau(nom) {
  const a = COURS_EAU[nom]?.article;
  if (a === 'le') return `du ${nom}`;
  if (a === "l'") return `de l'${nom}`;
  return `de la ${nom}`;
}
