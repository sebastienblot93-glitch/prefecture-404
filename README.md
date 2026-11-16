# Préfecture 404

**Simulation administrative absurde, enquête géographique, coopération sous pression.**

Vous travaillez au Bureau national de vérification des territoires. Des communes françaises vous soumettent des dossiers plus ou moins crédibles :

- « Grenoble déclare avoir une façade maritime. »
- « Toulouse demande un plan de prévention des crues de la Loire. »
- « Brest souhaite rejoindre les Bouches-du-Rhône pour le soleil. »

Vérifiez les déclarations, signalez les anomalies, appliquez le règlement du jour et posez le bon tampon : **Accepter, Rectifier, Transférer ou Refuser**. Avant 17 h.

Parties de 10 à 20 min, solo ou coop à 2 ou 3 joueurs.

## Jouer

Le jeu est un site statique, sans dépendance ni étape de build.

```bash
python3 -m http.server 8404     # ou : npm run serve
# puis ouvrir http://localhost:8404
```

(Ouvrir `index.html` directement depuis le disque ne fonctionne pas : les navigateurs bloquent les modules JavaScript en `file://`.)

Pour le publier : *Settings → Pages → Deploy from a branch → `main` / root*.

### En coopération

| Joueur | Page |
|---|---|
| Agent de guichet | `index.html`, choisir « À deux » ou « À trois » |
| Géographe | `atlas.html` |
| Inspecteur | `reglement.html?jour=1` (ou `?graine=ABCDE` en mode infini) |

Chacun sur son appareil. On parle, on se trompe, on tamponne trop vite.

### Raccourcis

`1` Accepter · `2` Rectifier · `3` Transférer · `4` Refuser · `Entrée` dossier suivant

## Contenu actuel (MVP)

- 3 journées de campagne écrites à la main (24 dossiers) + mode infini généré à partir d'une graine
- 83 communes, 101 départements, 18 régions, 101 chefs-lieux, 27 cours d'eau, 5 massifs, 4 mers
- Atlas thématique, règlement et décrets du jour, extrait de registre falsifiable
- Explication pédagogique après chaque dossier, bilan de journée, carrière (de stagiaire à directeur du tampon national)

## Fiabilité des données

Aucun verdict n'est écrit à la main : le moteur le calcule depuis la base, et tout fait incertain est exclu des dossiers. Codes et noms sont vérifiés en continu contre l'API officielle `geo.api.gouv.fr`. Détails dans [docs/DONNEES.md](docs/DONNEES.md).

```bash
npm test                          # 16 tests : données, moteur, campagne, 3 000 dossiers générés
node tools/verifier-officiel.mjs  # comparaison avec le Code officiel géographique
```

## Documentation

- [docs/GDD.md](docs/GDD.md) : proposition de développement, règles, architecture, feuille de route
- [docs/DONNEES.md](docs/DONNEES.md) : protocole de vérification des données
- [docs/RELECTURE.md](docs/RELECTURE.md) : faits géographiques à relire

## Avertissement

Le Bureau national de vérification des territoires, ses décrets, fonds et formulaires sont fictifs. Les faits géographiques, eux, sont réels.
