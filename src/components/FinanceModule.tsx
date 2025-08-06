import React, { useState, useEffect } from 'react';
import { Upload, TrendingUp, DollarSign, Calendar, BarChart3, PieChart, Download, RefreshCw, AlertCircle, CheckCircle, Settings, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface FinancialData {
  id: string;
  date: string;
  revenue: number;
  costs: number;
  margin: number;
  margin_percentage: number;
  created_at: string;
}

interface ChartData {
  date: string;
  revenue: number;
  costs: number;
  margin: number;
  margin_percentage: number;
}

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

const CHANNEL_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

const FinanceModule: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    loadFinancialData();
    loadChannelStats();
  }, []);

  const loadFinancialData = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      setFinancialData(data || []);
      
      // Préparer les données pour le graphique
      const chartData = (data || [])
        .slice()
        .reverse()
        .map(item => ({
          date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
          costs: item.costs,
          margin: item.margin,
          margin_percentage: item.margin_percentage
        }));

      setChartData(chartData);
    } catch (error) {
      console.error('Erreur lors du chargement des données financières:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannelStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('setting_value')
        .eq('setting_key', 'channel_statistics')
        .single();

      if (error || !data) {
        // Utiliser des données simulées si pas de stats
        setChannelData(getSimulatedChannelData());
        return;
      }

      const stats = data.setting_value as any;
      if (stats.channels) {
        const channelDataArray: ChannelData[] = [];
        let colorIndex = 0;
        
        Object.entries(stats.channels).forEach(([name, channelStats]: [string, any]) => {
          channelDataArray.push({
            name,
            value: channelStats.revenue,
            color: CHANNEL_COLORS[colorIndex % CHANNEL_COLORS.length]
          });
          colorIndex++;
        });

        setChannelData(channelDataArray.sort((a, b) => b.value - a.value));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats canaux:', error);
      setChannelData(getSimulatedChannelData());
    }
  };

  const getSimulatedChannelData = (): ChannelData[] => {
    return [
      { name: 'Site Web', value: 15420.50, color: CHANNEL_COLORS[0] },
      { name: 'Magasin Physical', value: 12350.75, color: CHANNEL_COLORS[1] },
      { name: 'Marketplace', value: 8750.25, color: CHANNEL_COLORS[2] },
      { name: 'B2B Direct', value: 6200.00, color: CHANNEL_COLORS[3] }
    ];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                  file.type === 'text/csv' || 
                  file.type === 'application/csv' ||
                  file.type === 'text/plain';
                  
    if (!isCSV) {
      alert('❌ Veuillez sélectionner un fichier CSV (.csv)');
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      
      if (!text || text.trim() === '') {
        throw new Error('Le fichier CSV semble vide');
      }

      console.log('📄 Fichier CSV chargé, taille:', text.length, 'caractères');

      // Parser le CSV - votre format utilise probablement des virgules
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length <= 1) {
        throw new Error('Le fichier CSV doit contenir au moins une ligne de données en plus de l\'en-tête');
      }

      console.log('📋 Nombre de lignes:', lines.length);
      
      // Analyser l'en-tête - votre format exact
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      console.log('📊 En-têtes détectés:', headers);
      
      // Mapping exact pour votre format Plus de Bulles
      const columnMap = {
        channel: headers.findIndex(h => h === 'channel'),
        orderNumber: headers.findIndex(h => h === 'order_number'), 
        orderDate: headers.findIndex(h => h === 'order_date'),
        productRef: headers.findIndex(h => h === 'product_ref'),
        productName: headers.findIndex(h => h === 'product_name'),
        brandName: headers.findIndex(h => h === 'brand_name'),
        quantity: headers.findIndex(h => h === 'quantity'),
        unitSellingPrice: headers.findIndex(h => h === 'unit_selling_price'),
        unitPurchasePrice: headers.findIndex(h => h === 'unit_purchase_price'),
        discount: headers.findIndex(h => h === 'discount'),
        rewardCredit: headers.findIndex(h => h === 'reward_credit'),
        totalSales: headers.findIndex(h => h === 'total_sales'),
        totalCost: headers.findIndex(h => h === 'total_cost'),
        totalMargin: headers.findIndex(h => h === 'total_margin'),
        marginRate: headers.findIndex(h => h === 'margin_rate')
      };
      
      console.log('🗂️ Mapping des colonnes:', columnMap);
      
      // Vérifier que les colonnes essentielles sont présentes
      const essentialColumns = ['orderDate', 'totalSales', 'totalCost'];
      const missingColumns = essentialColumns.filter(col => columnMap[col] === -1);
      
      if (missingColumns.length > 0) {
        throw new Error(`Colonnes essentielles manquantes: ${missingColumns.join(', ')}`);
      }

      // Structures pour l'agrégation
      const ordersByDate = new Map<string, {
        revenue: number;
        costs: number; 
        discounts: number;
        cashback: number;
        orders: Set<string>;
        channels: Set<string>;
      }>();
      
      const channelsByDate = new Map<string, Map<string, {
        revenue: number;
        costs: number;
        orders: Set<string>;
      }>>();
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      // Traiter chaque ligne de données
      for (let i = 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) {
            skippedCount++;
            continue;
          }
          
          const columns = line.split(',').map(c => c.trim().replace(/"/g, ''));
          
          if (columns.length !== headers.length) {
            console.warn(`Ligne ${i + 1}: Nombre de colonnes incorrect (${columns.length} vs ${headers.length})`);
            errorCount++;
            continue;
          }

          // Extraire les données avec votre format exact
          const channel = columns[columnMap.channel] || 'Non spécifié';
          const orderNumber = columns[columnMap.orderNumber] || `Order-${i}`;
          const orderDate = columns[columnMap.orderDate];
          const quantity = parseFloat(columns[columnMap.quantity]) || 0;
          const unitSellingPrice = parseFloat(columns[columnMap.unitSellingPrice]) || 0;
          const unitPurchasePrice = parseFloat(columns[columnMap.unitPurchasePrice]) || 0;
          const discount = parseFloat(columns[columnMap.discount]) || 0;
          const rewardCredit = parseFloat(columns[columnMap.rewardCredit]) || 0;
          const totalSales = parseFloat(columns[columnMap.totalSales]) || 0;
          const totalCost = parseFloat(columns[columnMap.totalCost]) || 0;
          const totalMargin = parseFloat(columns[columnMap.totalMargin]) || 0;
          const marginRate = parseFloat(columns[columnMap.marginRate]) || 0;

          // Utiliser les totaux directement (plus précis que de recalculer)
          let lineRevenue = totalSales;
          let lineCosts = totalCost;
          let lineDiscount = discount;
          let lineCashback = rewardCredit;

          // Fallback sur le calcul si les totaux sont à 0 mais qu'on a les détails
          if (lineRevenue === 0 && lineCosts === 0 && quantity > 0) {
            lineRevenue = quantity * unitSellingPrice;
            lineCosts = quantity * unitPurchasePrice;
          }

          // Ignorer les lignes sans données financières significatives
          if (lineRevenue === 0 && lineCosts === 0) {
            console.log(`Ligne ${i + 1}: Pas de données financières, ignorée`);
            skippedCount++;
            continue;
          }

          // Parser et valider la date
          const parsedDate = new Date(orderDate);
          if (isNaN(parsedDate.getTime())) {
            console.warn(`Ligne ${i + 1}: Date invalide "${orderDate}"`);
            errorCount++;
            continue;
          }

          const dateKey = parsedDate.toISOString().split('T')[0];

          // Agrégation par date pour financial_data
          if (!ordersByDate.has(dateKey)) {
            ordersByDate.set(dateKey, {
              revenue: 0,
              costs: 0,
              discounts: 0,
              cashback: 0,
              orders: new Set(),
              channels: new Set()
            });
          }

          const dayData = ordersByDate.get(dateKey)!;
          dayData.revenue += lineRevenue;
          dayData.costs += lineCosts;
          dayData.discounts += lineDiscount;
          dayData.cashback += lineCashback;
          dayData.orders.add(orderNumber);
          dayData.channels.add(channel);

          // Agrégation par canal et date pour les statistiques
          if (!channelsByDate.has(dateKey)) {
            channelsByDate.set(dateKey, new Map());
          }

          const dateChannels = channelsByDate.get(dateKey)!;
          if (!dateChannels.has(channel)) {
            dateChannels.set(channel, {
              revenue: 0,
              costs: 0,
              orders: new Set()
            });
          }

          const channelData = dateChannels.get(channel)!;
          channelData.revenue += lineRevenue;
          channelData.costs += lineCosts;
          channelData.orders.add(orderNumber);

          successCount++;

        } catch (error) {
          console.warn(`Erreur ligne ${i + 1}:`, error);
          errorCount++;
        }
      }

      if (ordersByDate.size === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
      }

      // Préparer les données pour financial_data
      const dataToInsert = [];
      ordersByDate.forEach((data, date) => {
        dataToInsert.push({
          date,
          revenue: Math.round(data.revenue * 100) / 100,
          costs: Math.round(data.costs * 100) / 100,
          discounts: Math.round(data.discounts * 100) / 100,
          cashback: Math.round(data.cashback * 100) / 100
        });
      });

      console.log('💾 Données à insérer:', dataToInsert);

      // Vérifier la configuration Supabase
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Configuration Supabase manquante. Vérifiez votre fichier .env');
      }

      // Insérer en base de données
      const { data: insertedData, error } = await supabase
        .from('financial_data')
        .upsert(dataToInsert, { 
          onConflict: 'date',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      console.log('✅ Données insérées avec succès:', insertedData);

      // Préparer les statistiques par canal pour la visualisation
      const channelStats = {};
      const allChannels = new Set<string>();

      channelsByDate.forEach((channels, date) => {
        channels.forEach((data, channel) => {
          allChannels.add(channel);
          
          if (!channelStats[channel]) {
            channelStats[channel] = {
              revenue: 0,
              costs: 0,
              orders: new Set(),
              dates: []
            };
          }

          channelStats[channel].revenue += data.revenue;
          channelStats[channel].costs += data.costs;
          data.orders.forEach(order => channelStats[channel].orders.add(order));
          channelStats[channel].dates.push(date);
        });
      });

      // Finaliser les stats des canaux
      Object.keys(channelStats).forEach(channel => {
        const stats = channelStats[channel];
        stats.order_count = stats.orders.size;
        stats.avg_order_value = stats.order_count > 0 ? stats.revenue / stats.order_count : 0;
        stats.margin = stats.revenue - stats.costs;
        stats.margin_rate = stats.revenue > 0 ? stats.margin / stats.revenue : 0;
        delete stats.orders; // Supprimer pour la sérialisation JSON
      });

      // Sauvegarder les statistiques
      try {
        await supabase
          .from('user_settings')
          .upsert({
            setting_key: 'channel_statistics',
            setting_value: {
              channels: channelStats,
              last_update: new Date().toISOString(),
              total_channels: allChannels.size
            }
          }, {
            onConflict: 'setting_key'
          });
      } catch (statsError) {
        console.warn('⚠️ Erreur sauvegarde des statistiques:', statsError);
      }

      // Recharger les données de l'interface
      await loadFinancialData();
      await loadChannelStats();

      // Créer les données pour la visualisation par canal
      const channelDataArray: ChannelData[] = [];
      let colorIndex = 0;
      Object.entries(channelStats).forEach(([name, stats]: [string, any]) => {
        channelDataArray.push({
          name,
          value: stats.revenue,
          color: CHANNEL_COLORS[colorIndex % CHANNEL_COLORS.length]
        });
        colorIndex++;
      });

      setChannelData(channelDataArray.sort((a, b) => b.value - a.value));

      // Message de succès détaillé
      const uniqueOrders = new Set();
      ordersByDate.forEach(data => {
        data.orders.forEach(order => uniqueOrders.add(order));
      });

      const totalRevenue = dataToInsert.reduce((sum, item) => sum + item.revenue, 0);
      const totalCosts = dataToInsert.reduce((sum, item) => sum + item.costs, 0);
      const totalDiscounts = dataToInsert.reduce((sum, item) => sum + (item.discounts || 0), 0);
      const totalCashback = dataToInsert.reduce((sum, item) => sum + (item.cashback || 0), 0);

      const successMessage = [
        '✅ Import Plus de Bulles réussi !',
        '',
        `📊 Format: Données de ventes détaillées`,
        `📅 ${dataToInsert.length} jour(s) de données traité(s)`,
        `🛍️ ${uniqueOrders.size} commande(s) unique(s)`,
        `📈 CA total: ${totalRevenue.toLocaleString('fr-FR')}€`,
        `💰 Coûts totaux: ${totalCosts.toLocaleString('fr-FR')}€`,
        totalDiscounts > 0 ? `🎟️ Remises: ${totalDiscounts.toLocaleString('fr-FR')}€` : '',
        totalCashback > 0 ? `🎁 Cagnottes: ${totalCashback.toLocaleString('fr-FR')}€` : '',
        `📊 ${allChannels.size} canal(aux) détecté(s): ${Array.from(allChannels).join(', ')}`,
        '',
        `✅ ${successCount} lignes traitées`,
        errorCount > 0 ? `⚠️ ${errorCount} erreurs` : '',
        skippedCount > 0 ? `➡️ ${skippedCount} lignes ignorées` : '',
        '',
        '💡 Les marges ont été calculées automatiquement !'
      ].filter(Boolean).join('\n');

      alert(successMessage);

      // Réinitialiser l'input
      event.target.value = '';

    } catch (error) {
      console.error('❌ Erreur complète:', error);
      
      const errorMessage = [
        '❌ Erreur lors de l\'import Plus de Bulles:',
        '',
        error instanceof Error ? error.message : 'Erreur inconnue',
        '',
        '🔍 Vérifications:',
        '• Le fichier contient-il les colonnes: order_date, total_sales, total_cost ?',
        '• Les dates sont-elles au format YYYY-MM-DD ?',
        '• La configuration Supabase est-elle correcte ?',
        '',
        '💡 Consultez la console développeur (F12) pour plus de détails'
      ].join('\n');
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const generateAnalysis = async (type: 'daily' | 'weekly' | 'monthly') => {
    if (!openaiApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setAnalysisLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          openai_api_key: openaiApiKey
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la génération de l\'analyse');
      }

      setAnalysisResult(result.analysis);
      setShowAnalysis(true);
      setSuccess('Analyse générée avec succès !');
    } catch (error) {
      console.error('Erreur analyse:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la génération de l\'analyse');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('openai_api_key', openaiApiKey);
    setShowApiKeyModal(false);
  };

  const exportData = () => {
    if (financialData.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const csvContent = [
      'Date,Chiffre d\'Affaires,Coûts,Marge,Pourcentage de Marge',
      ...financialData.map(item => 
        `${item.date},${item.revenue},${item.costs},${item.margin},${item.margin_percentage}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `donnees_financieres_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = financialData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCosts = financialData.reduce((sum, item) => sum + item.costs, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPercentage = financialData.length > 0 
    ? financialData.reduce((sum, item) => sum + item.margin_percentage, 0) / financialData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analyse Financière</h2>
          <p className="text-gray-600 mt-1">
            Suivi des performances et marges de Plus de Bulles
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
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CA Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Coûts Totaux</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCosts.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marge Totale</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalMargin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PieChart className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marge Moyenne</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgMarginPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Import de données CSV</h3>
          <button
            onClick={() => loadFinancialData()}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </button>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {uploading ? 'Import en cours...' : 'Cliquez pour importer un fichier CSV'}
                </span>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Format Plus de Bulles: channel, order_number, order_date, total_sales, total_cost, total_margin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution des revenus et coûts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')}€`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" name="Revenus" strokeWidth={2} />
                <Line type="monotone" dataKey="costs" stroke="#EF4444" name="Coûts" strokeWidth={2} />
                <Line type="monotone" dataKey="margin" stroke="#10B981" name="Marge" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')}€`} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analysis Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Analyse IA avec ChatGPT</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => generateAnalysis('daily')}
              disabled={analysisLoading}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Zap className="h-4 w-4 mr-1" />
              Quotidien
            </button>
            <button
              onClick={() => generateAnalysis('weekly')}
              disabled={analysisLoading}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Zap className="h-4 w-4 mr-1" />
              Hebdomadaire
            </button>
            <button
              onClick={() => generateAnalysis('monthly')}
              disabled={analysisLoading}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Zap className="h-4 w-4 mr-1" />
              Mensuel
            </button>
          </div>
        </div>

        {analysisLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Génération de l'analyse en cours...</span>
          </div>
        )}

        {showAnalysis && analysisResult && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Rapport d'analyse :</h4>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{analysisResult}</div>
          </div>
        )}
      </div>

      {/* Recent Data Table */}
      {financialData.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Données récentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coûts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialData.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.revenue.toLocaleString('fr-FR')}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.costs.toLocaleString('fr-FR')}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.margin.toLocaleString('fr-FR')}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${item.margin_percentage >= 20 ? 'text-green-600' : item.margin_percentage >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.margin_percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration OpenAI</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clé API OpenAI
                </label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nécessaire pour les analyses IA avec ChatGPT
                </p>
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

export default FinanceModule;