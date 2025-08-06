import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, FileText } from 'lucide-react';

const ProductModule: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    productsToCreate: 0,
    completionRate: 0
  });
  const [error, setError] = useState<string | null>(null);

  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1omv1n5kHaESPbqBMx4zNhFreRk-fuJns3tgECanO2Jc/edit?gid=690830060#gid=690830060';

  // Simulation de données pour la démo (à remplacer par l'intégration Google Sheets)
  const mockData = {
    totalProducts: 150,
    productsToCreate: 23,
    completionRate: 84.7
  };

  useEffect(() => {
    // Charger les données au démarrage
    loadProductData();
  }, []);

  const loadProductData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulation d'un appel API (à remplacer par l'intégration Google Sheets)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProductStats(mockData);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadProductData();
  };

  const openGoogleSheet = () => {
    window.open(SHEET_URL, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fiches Produits Plus de Bulles</h2>
          <p className="text-gray-600 mt-1">
            Suivi des produits à mettre en ligne depuis Google Sheets
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openGoogleSheet}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir Google Sheet
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Produits</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : productStats.totalProducts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${productStats.productsToCreate > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {productStats.productsToCreate > 0 ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">À créer</p>
              <p className={`text-2xl font-bold ${productStats.productsToCreate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {loading ? '...' : productStats.productsToCreate}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taux de completion</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : `${productStats.completionRate}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Progression</h3>
          <span className="text-sm text-gray-600">
            {productStats.totalProducts - productStats.productsToCreate} / {productStats.totalProducts} produits créés
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${productStats.completionRate}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>0%</span>
          <span className="font-medium">{productStats.completionRate}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Objectif */}
      <div className={`rounded-lg p-6 ${productStats.productsToCreate === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          {productStats.productsToCreate === 0 ? (
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
          ) : (
            <AlertCircle className="h-8 w-8 text-yellow-600 mr-3" />
          )}
          <div>
            <h3 className={`text-lg font-medium ${productStats.productsToCreate === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
              {productStats.productsToCreate === 0 ? 'Objectif atteint !' : 'Objectif : Arriver à 0'}
            </h3>
            <p className={`${productStats.productsToCreate === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
              {productStats.productsToCreate === 0 
                ? 'Toutes les fiches produits sont créées. Excellent travail !'
                : `Il reste ${productStats.productsToCreate} fiches produits à créer pour atteindre l'objectif.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Instructions d'intégration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-3">Configuration Google Sheets</h3>
        <div className="space-y-3 text-blue-700">
          <p>
            <strong>Étape 1:</strong> Assurez-vous que votre Google Sheet est accessible publiquement ou configurez l'authentification OAuth.
          </p>
          <p>
            <strong>Étape 2:</strong> L'intégration comptera automatiquement le nombre de lignes (produits) dans votre feuille.
          </p>
          <p>
            <strong>Étape 3:</strong> Ajoutez une colonne "Statut" pour marquer les produits comme "Créé" ou "À créer".
          </p>
          <p className="text-sm">
            <strong>Note:</strong> Cette version utilise des données de démonstration. L'intégration complète avec Google Sheets sera implémentée dans la prochaine version.
          </p>
        </div>
      </div>

      {/* Dernière mise à jour */}
      {lastUpdate && (
        <div className="text-center text-sm text-gray-500">
          Dernière mise à jour: {lastUpdate.toLocaleString('fr-FR')}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductModule;