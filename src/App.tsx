import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database, Github, Server } from 'lucide-react';

// Configuration Supabase (les variables d'environnement seront ajoutées automatiquement)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // Vérifier la connexion Supabase
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('_test').select('*').limit(1);
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          // Expected error when table doesn't exist - connection is working
          setConnectionStatus('connected');
          return;
        }
        
        if (error) {
          // Unexpected error
          throw error;
        }
        
        // Table exists and query succeeded
        setConnectionStatus('connected');
      } catch (error: any) {
        // Only log unexpected errors
        if (error.code !== 'PGRST116' && error.code !== 'PGRST205') {
          console.error('Erreur de connexion Supabase:', error);
          setConnectionStatus('error');
        } else {
          // Expected error - connection is working
          setConnectionStatus('connected');
        }
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ma WebApp
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Application configurée avec React, TypeScript, Supabase, et prête pour GitHub + Vercel
          </p>
        </header>

        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {/* Supabase Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Database className="h-8 w-8 text-green-600" />
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800' 
                  : connectionStatus === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {connectionStatus === 'connected' && 'Connecté'}
                {connectionStatus === 'error' && 'Non configuré'}
                {connectionStatus === 'checking' && 'Vérification...'}
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Supabase</h3>
            <p className="text-gray-600 text-sm">
              {connectionStatus === 'connected' 
                ? 'Base de données prête à utiliser'
                : 'Cliquez sur "Connect to Supabase" en haut à droite'
              }
            </p>
          </div>

          {/* GitHub Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Github className="h-8 w-8 text-gray-700" />
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                À faire
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">GitHub</h3>
            <p className="text-gray-600 text-sm">
              Créez un repo et poussez ce code
            </p>
          </div>

          {/* Deployment Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <Server className="h-8 w-8 text-purple-600" />
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Prêt
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Déploiement</h3>
            <p className="text-gray-600 text-sm">
              Vercel ou Netlify (je peux déployer sur Netlify)
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructions de configuration</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-600" />
                  1. Supabase
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium mb-2">
                    {connectionStatus === 'connected' ? '✅ Configuré' : '⚠️ Action requise'}
                  </p>
                  <p className="text-green-700">
                    {connectionStatus === 'connected' 
                      ? 'Votre base de données Supabase est connectée et prête.'
                      : 'Cliquez sur le bouton "Connect to Supabase" en haut à droite pour configurer votre base de données.'
                    }
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Github className="h-5 w-5 mr-2 text-gray-700" />
                  2. GitHub
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-800 font-medium mb-2">📋 Étapes manuelles :</p>
                  <ol className="text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Créez un nouveau repository sur GitHub</li>
                    <li>Copiez le code de cette application</li>
                    <li>Poussez le code vers votre repository</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Server className="h-5 w-5 mr-2 text-purple-600" />
                  3. Déploiement
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800 font-medium mb-2">🚀 Options :</p>
                  <ul className="text-purple-700 space-y-1">
                    <li>• <strong>Vercel :</strong> Connectez votre repo GitHub à Vercel</li>
                    <li>• <strong>Netlify :</strong> Je peux déployer directement sur Netlify si vous voulez</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;