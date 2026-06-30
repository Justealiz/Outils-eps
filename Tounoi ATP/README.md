# 🎾 Tournoi ATP Club

Application web autonome pour gérer un tournoi de club en formule ATP (classement par points, défis selon le rang, arbitrage).

Aucune installation, aucun serveur, aucune base de données : tout fonctionne dans le navigateur (`localStorage`), un seul fichier HTML.

## ✨ Fonctionnalités

- **Classement en direct**, conçu pour être projeté pendant les séances
- **Saisie de match en 4 clics** (challengeur → adversaire → arbitre → vainqueur), adaptée à de grands groupes (jusqu'à 60 joueurs)
- **Plage de défi configurable** : nombre de rangs au-dessus / en-dessous qu'un joueur peut/doit affronter
- **Barème de points par écart signé** (`écart = rang vainqueur − rang perdant`) entièrement configurable :
  - écart négatif (le vainqueur était mieux classé) → peu de points
  - écart positif (upset, le vainqueur était moins bien classé) → beaucoup de points
- **Points d'arbitrage** réglables
- **Import / Export** Excel (.xlsx) et CSV
- **Historique des matchs**, suppression possible (recalcule les points)
- **Réinitialisation** complète en un clic
- Toutes les données restent **en local dans le navigateur** (aucune donnée envoyée à un serveur — conforme RGPD)

## 🚀 Utilisation

### Option 1 — En ligne (GitHub Pages / Netlify)
Ouvrez simplement l'URL de déploiement (voir section ci-dessous).

### Option 2 — En local
Téléchargez `index.html` et ouvrez-le directement dans n'importe quel navigateur (Chrome, Firefox, Edge, Safari). Aucune connexion internet n'est requise après le premier chargement des polices/icônes (mise en cache par le navigateur).

## 📦 Déploiement

### GitHub Pages
1. Importez ce dépôt sur GitHub
2. Dans **Settings → Pages**, choisissez la branche `main` et le dossier racine `/`
3. Le site sera disponible à `https://<votre-utilisateur>.github.io/<nom-du-repo>/`

### Netlify (glisser-déposer)
1. Allez sur [app.netlify.com/drop](https://app.netlify.com/drop)
2. Glissez le dossier contenant `index.html`
3. Votre site est en ligne immédiatement

## ⚙️ Configuration de la formule ATP

Dans l'onglet **Config** :
- **Rangs challengeables au-dessus / à accepter en-dessous** : définit qui peut défier qui
- **Table des points** : éditez ou ajoutez des lignes pour chaque écart de rang signé
- **Points par arbitrage** : récompense les joueurs qui arbitrent

## 🗂️ Stockage des données

Toutes les données (joueurs, matchs, configuration) sont stockées dans le `localStorage` du navigateur utilisé. Cela signifie :
- Les données persistent entre les sessions sur le **même appareil et navigateur**
- Pensez à **exporter régulièrement** (Excel/CSV) pour sauvegarder ou transférer les données vers un autre poste
- Vider le cache du navigateur supprimera les données locales

## 🛠️ Stack technique

- HTML / CSS / JavaScript vanilla — fichiers séparés (index.html, style.css, app.js), aucun build, aucune dépendance npm
- [SheetJS](https://sheetjs.com/) (CDN) pour l'import/export Excel
- [Tabler Icons](https://tabler.io/icons) (CDN) pour les icônes

## 📄 Licence

MIT — voir [LICENSE](LICENSE)
