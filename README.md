# Préfecture 404

**Simulation administrative absurde, enquête géographique, coopération sous pression.**

Vous travaillez au Bureau national de vérification des territoires. Des communes françaises vous soumettent des dossiers plus ou moins crédibles :

- « Grenoble déclare avoir une façade maritime. »
- « Toulouse demande un plan de prévention des crues de la Loire. »
- « Brest souhaite rejoindre les Bouches-du-Rhône pour le soleil. »

Vérifiez les déclarations, signalez les anomalies, appliquez le règlement du jour et posez le bon tampon : **Accepter, Rectifier, Transférer ou Refuser**. Avant 17 h.

Parties de 10 à 20 min, solo ou coop à 2 ou 3 joueurs.

## Jouer

### Seul

N'importe quel hébergement statique suffit (GitHub Pages : *Settings → Pages → Deploy from a branch → `main` / root*). En local :

```bash
npm start            # serveur du jeu (solo + en ligne) sur http://localhost:8404
```

### À plusieurs, en ligne (2 ou 3 joueurs)

Le mode en ligne a besoin du petit serveur Node du jeu (`server/`, aucune dépendance). Déploiement sur Render :

1. Sur [dashboard.render.com](https://dashboard.render.com) : **New → Blueprint**, choisir le dépôt `prefecture-404` (le fichier `render.yaml` configure tout).
2. Ouvrir l'adresse donnée par Render (`https://prefecture-404-xxxx.onrender.com`).
3. Saisir son nom, **Créer un salon**, puis envoyer le code à 4 lettres (ou le lien) aux collègues.

Sur l'offre gratuite de Render, le serveur s'endort après 15 min sans visite : le premier chargement prend alors 30 à 60 s, et les salons en cours sont effacés.

| Poste | Voit | Agit |
|---|---|---|
| Agent de guichet | commune, objet, condition d'éligibilité, demandeur | pose les quatre tampons |
| Géographe | les déclarations (sans le nom de la commune !) et l'atlas | annote les lignes fausses, répond au téléphone |
| Inspecteur (à 3) | règlement, décrets, montant, pièces, registre | annote pièces et registre, peut faire **opposition** à un tampon pendant 4 s |

À deux, le guichet reprend le rôle de l'inspecteur. Les postes tournent tous les N dossiers (réglable par l'hôte).

### Raccourcis (guichet)

`1` Accepter · `2` Rectifier · `3` Transférer · `4` Refuser · `Entrée` dossier suivant

## Contenu actuel (MVP)

- 3 journées de campagne écrites à la main (24 dossiers) + mode infini généré à partir d'une graine
- 83 communes, 101 départements, 18 régions, 101 chefs-lieux, 27 cours d'eau, 5 massifs, 4 mers
- Atlas thématique, règlement et décrets du jour, extrait de registre falsifiable
- Mode en ligne : salons à code, dossier réparti entre les postes, rotation des rôles, standard téléphonique, opposition de l'inspecteur
- Semaine 1 en période d'essai : notes du chef de bureau, condition d'éligibilité affichée, explication ciblée après chaque erreur
- Explication pédagogique après chaque dossier, bilan de journée, carrière (de stagiaire à directeur du tampon national)

## Fiabilité des données

Aucun verdict n'est écrit à la main : le moteur le calcule depuis la base, et tout fait incertain est exclu des dossiers. Codes et noms sont vérifiés en continu contre l'API officielle `geo.api.gouv.fr`. Détails dans [docs/DONNEES.md](docs/DONNEES.md).

```bash
npm test                          # 25 tests : données, moteur, campagne, générateur, salons en ligne
node tools/verifier-officiel.mjs  # comparaison avec le Code officiel géographique
```

## Documentation

- [docs/GDD.md](docs/GDD.md) : proposition de développement, règles, architecture, feuille de route
- [docs/DONNEES.md](docs/DONNEES.md) : protocole de vérification des données
- [docs/RELECTURE.md](docs/RELECTURE.md) : faits géographiques à relire

## Avertissement

Le Bureau national de vérification des territoires, ses décrets, fonds et formulaires sont fictifs. Les faits géographiques, eux, sont réels.
