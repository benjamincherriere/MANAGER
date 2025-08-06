# Plus de Bulles - Webapp de Gestion de Projets

Application React + TypeScript avec Supabase pour la gestion des projets Plus de Bulles.

## 🚀 Fonctionnalités

### 📅 Module Suivi Fournisseurs
- Gestion de la liste des fournisseurs
- Enregistrement des rendez-vous avec notes
- Alertes automatiques pour les fournisseurs non vus depuis 2 ans
- Tableau de bord avec statistiques

### 📋 Module Fiches Produits
- Connexion à Google Sheets pour le suivi des produits
- Compteur de produits à mettre en ligne
- Objectif : arriver à 0 produits en attente
- Taux de completion en temps réel

### 💰 Module Analyse Financière
- Import quotidien de fichiers CSV
- Calcul automatique des marges
- Synthèses quotidiennes et hebdomadaires
- Rapports par email (à configurer)

## 🛠️ Stack Technique

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Base de données**: Supabase
- **Déploiement**: Vercel (recommandé)

## 📦 Installation

1. Clonez le repository
2. Installez les dépendances : `npm install`
3. Configurez Supabase (voir section ci-dessous)
4. Lancez le dev server : `npm run dev`

## 🗄️ Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Cliquez sur "Connect to Supabase" dans l'interface
3. Les migrations seront automatiquement appliquées

### Tables créées automatiquement :
- `suppliers` : Fournisseurs
- `meetings` : Rendez-vous avec fournisseurs
- `financial_data` : Données financières quotidiennes

## 🚢 Déploiement sur Vercel

1. Poussez votre code sur GitHub
2. Connectez votre repo à Vercel
3. Ajoutez les variables d'environnement Supabase
4. Déployez !

## 📁 Structure du projet

```
src/
├── components/
│   ├── SupplierModule.tsx    # Module fournisseurs
│   ├── ProductModule.tsx     # Module produits
│   └── FinanceModule.tsx     # Module financier
├── App.tsx                   # Application principale
├── main.tsx                  # Point d'entrée
└── index.css                 # Styles Tailwind
```

## 🔧 Utilisation

### Module Fournisseurs
1. Ajoutez vos fournisseurs via le bouton "Ajouter un fournisseur"
2. Enregistrez vos rendez-vous avec la date et des notes
3. Surveillez les alertes pour les fournisseurs non vus depuis 2 ans

### Module Produits
1. Configurez l'accès à votre Google Sheet
2. Le système compte automatiquement les produits à créer
3. Objectif : atteindre 0 produits en attente

### Module Finance
1. Importez quotidiennement vos fichiers CSV
2. Format requis : date, revenue, costs
3. Les marges sont calculées automatiquement
4. Configurez les rapports email

## 📊 Format CSV pour les données financières

```csv
date,revenue,costs
2024-01-15,1250.50,890.25
2024-01-16,1180.75,820.40
```

## 🎯 Roadmap

- [ ] Intégration complète Google Sheets API
- [ ] Système d'envoi d'emails automatiques
- [ ] Graphiques et visualisations avancées
- [ ] Export des données en PDF
- [ ] Notifications push pour les alertes

## 📞 Support

Pour toute question ou suggestion d'amélioration, n'hésitez pas à ouvrir une issue sur GitHub.