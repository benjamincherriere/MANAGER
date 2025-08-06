import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, FileText, Settings } from 'lucide-react';

const ProductModule: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    productsToCreate: 0,
    completionRate: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('google_sheets_api_key') || '');

  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1omv1n5kHaESPbqBMx4zNhFreRk-fuJns3tgECanO2Jc/edit?gid=690830060#gid=690830060';
  const SHEET_ID = '1omv1n5kHaESPbqBMx4zNhFreRk-fuJns3tgECanO2Jc';
  const SHEET_GID = '690830060';
  const SHEET_NAME = 'Feuille 1'; // Nom par défaut, ajustez si nécessaire

  useEffect(() => {
    loadProductData();
  }, []);

  const loadProductData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!apiKey) {
        // Si pas de clé API, utiliser les données publiques CSV
        await loadFromPublicSheet();
      } else {
        // Utiliser l'API Google Sheets avec la clé
        await loadFromGoogleSheetsAPI();
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erreur lors du chargement des données. Vérifiez que votre feuille est accessible publiquement.');
      console.error('Erreur:', err);
      
      // Fallback sur les données simulées en cas d'erreur
      setProductStats({
        totalProducts: 82,
        productsToCreate: 82,
        completionRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFromPublicSheet = async () => {
    // Utiliser l'export CSV public de Google Sheets
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error('Impossible d\'accéder à la feuille. Assurez-vous qu\'elle est publique.');
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    // Ignorer la ligne d'en-tête
    const dataLines = lines.slice(1);
    
    let totalProducts = 0;
    let productsToCreate = 0;
    
    dataLines.forEach(line => {
      const columns = line.split(',');
      if (columns.length >= 6) { // Au moins 6 colonnes (A à F)
        totalProducts++;
        const status = columns[5]?.trim().replace(/"/g, ''); // Colonne F, nettoyer les guillemets
        if (status === 'À créer' || status === 'A créer' || !status) {
          productsToCreate++;
        }
      }
    });
    
    const completionRate = totalProducts > 0 ? Math.round(((totalProducts - productsToCreate) / totalProducts) * 100) : 0;
    
    setProductStats({
      totalProducts,
      productsToCreate,
      completionRate
    });
  };

  const loadFromGoogleSheetsAPI = async () => {
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:F?key=${apiKey}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error('Erreur API Google Sheets. Vérifiez votre clé API.');
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    // Ignorer la ligne d'en-tête
    const dataRows = rows.slice(1);
    
    let totalProducts = 0;
    let productsToCreate = 0;
    
    dataRows.forEach((row: string[]) => {
      if (row.length >= 6) { // Au moins 6 colonnes (A à F)
        totalProducts++;
        const status = row[5]?.trim(); // Colonne F
        if (status === 'À créer' || status === 'A créer' || !status) {
          productsToCreate++;
        }
      }
    });
    
    const completionRate = totalProducts > 0 ? Math.round(((totalProducts - productsToCreate) / totalProducts) * 100) : 0;
    
    setProductStats({
      totalProducts,
      productsToCreate,
      completionRate
    });
  };

  const refreshData = () => {
    loadProductData();
  };

  const openGoogleSheet = () => {
    window.open(SHEET_URL, '_blank');
  };

  const saveApiKey = () => {
    localStorage.setItem('google_sheets_api_key', apiKey);
    setShowApiKeyModal(false);
    loadProductData();
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
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </button>
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
        <div className="mb-4 p-3 bg-white rounded border">
          <p className="text-sm text-gray-600 mb-2"><strong>Feuille Google Sheets configurée :</strong></p>
          <p className="text-xs text-gray-500 font-mono break-all">{SHEET_URL}</p>
        </div>
        <div className="space-y-3 text-blue-700">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✅ <strong>Intégration active !</strong> L'application lit maintenant votre Google Sheet en temps réel.
            </p>
          </div>
          <p>
            <strong>Méthode 1 - Accès public (recommandé) :</strong>
            <br />
            <span className="text-sm ml-4">• Rendez votre feuille accessible : "Partager" → "Tous les utilisateurs ayant le lien"</span>
            <br />
            <span className="text-sm ml-4">• L'application lira automatiquement les données via CSV</span>
          </p>
          <p>
            <strong>Méthode 2 - API Google Sheets :</strong>
            <br />
            <span className="text-sm ml-4">• Cliquez sur "Configuration" pour ajouter une clé API</span>
            <br />
            <span className="text-sm ml-4">• Plus sécurisé mais nécessite une configuration supplémentaire</span>
          </p>
          <p>
            <strong>Structure de votre feuille :</strong>
            <br />
            <span className="text-xs ml-4 font-mono bg-white px-2 py-1 rounded border">
              Colonne A-E: Données produit | Colonne F: Statut ("Créé" ou "À créer")
            </span>
          </p>
          <p className="text-sm mt-2">
            <strong>Logique de comptage :</strong> L'application lit la colonne F et compte les lignes où Statut = "À créer" ou vide.
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

      {/* Modal Configuration API */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Google Sheets API</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clé API Google Sheets (optionnel)
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre clé API Google..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Laissez vide pour utiliser l'accès public CSV
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Pour obtenir une clé API :</strong></p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Allez sur Google Cloud Console</li>
                  <li>Activez l'API Google Sheets</li>
                  <li>Créez une clé API</li>
                  <li>Collez-la ici</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductModule;