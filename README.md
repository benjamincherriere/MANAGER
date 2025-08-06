# Ma WebApp

Application React + TypeScript avec Supabase, configurée pour GitHub et Vercel.

## 🚀 Stack Technique

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Base de données**: Supabase
- **Déploiement**: Vercel (recommandé) ou Netlify

## 📦 Installation locale

1. Clonez le repository
2. Installez les dépendances : `npm install`
3. Configurez Supabase (voir section ci-dessous)
4. Lancez le dev server : `npm run dev`

## 🗄️ Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez votre URL et votre clé anonyme
3. Créez un fichier `.env` basé sur `.env.example`
4. Ajoutez vos clés Supabase

## 🚢 Déploiement

### Vercel (recommandé)
1. Connectez votre repo GitHub à Vercel
2. Ajoutez les variables d'environnement Supabase
3. Déployez !

### Netlify
1. Connectez votre repo à Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Ajoutez les variables d'environnement

## 📁 Structure du projet

```
src/
├── App.tsx          # Composant principal
├── main.tsx         # Point d'entrée
├── index.css        # Styles Tailwind
└── vite-env.d.ts    # Types Vite
```

## 🛠️ Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Aperçu du build
- `npm run lint` - Linting ESLint

## 🔧 Technologies utilisées

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- ESLint