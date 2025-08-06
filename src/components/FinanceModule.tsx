import React, { useState, useEffect } from 'react';
import { Upload, TrendingUp, TrendingDown, DollarSign, Mail, Calendar, FileText, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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

interface WeeklySummary {
  week: string;
  totalRevenue: number;
  totalCosts: number;
  averageMargin: number;
  marginTrend: 'up' | 'down' | 'stable';
}

const FinanceModule: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    email: '',
    dailyReports: true,
    weeklyReports: true
  });

  useEffect(() => {
    loadFinancialData();
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
      
      // Calculer les résumés hebdomadaires
      calculateWeeklySummaries(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklySummaries = (data: FinancialData[]) => {
    const weeklyData: { [key: string]: FinancialData[] } = {};
    
    data.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      weeklyData[weekKey].push(item);
    });

    const summaries: WeeklySummary[] = Object.entries(weeklyData).map(([week, items]) => {
      const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
      const totalCosts = items.reduce((sum, item) => sum + item.costs, 0);
      const averageMargin = items.reduce((sum, item) => sum + item.margin_percentage, 0) / items.length;
      
      return {
        week,
        totalRevenue,
        totalCosts,
        averageMargin,
        marginTrend: averageMargin > 20 ? 'up' : averageMargin < 15 ? 'down' : 'stable'
      };
    });

    setWeeklySummaries(summaries.slice(0, 4));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulation du traitement du fichier CSV
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      // Ici, vous implémenteriez la logique de parsing du CSV
      // et l'insertion en base de données
      
      console.log('Fichier CSV traité:', { headers, lineCount: lines.length });
      
      // Recharger les données après upload
      await loadFinancialData();
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
    } finally {
      setUploading(false);
    }
  };

  const getCurrentStats = () => {
    if (financialData.length === 0) return null;
    
    const today = financialData[0];
    const yesterday = financialData[1];
    
    return {
      todayRevenue: today?.revenue || 0,
      todayMargin: today?.margin_percentage || 0,
      marginTrend: yesterday ? 
        (today.margin_percentage > yesterday.margin_percentage ? 'up' : 
         today.margin_percentage < yesterday.margin_percentage ? 'down' : 'stable') : 'stable'
    };
  };

  const stats = getCurrentStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analyse Financière</h2>
          <p className="text-gray-600 mt-1">
            Suivi de la santé financière et des marges de Plus de Bulles
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Traitement...' : 'Importer CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Stats du jour */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">CA Aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.todayRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stats.marginTrend === 'up' ? 'bg-green-100' : stats.marginTrend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
                {stats.marginTrend === 'up' ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : stats.marginTrend === 'down' ? (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-gray-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Marge Aujourd'hui</p>
                <p className={`text-2xl font-bold ${stats.marginTrend === 'up' ? 'text-green-600' : stats.marginTrend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats.todayMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Jours analysés</p>
                <p className="text-2xl font-bold text-gray-900">{financialData.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Résumés hebdomadaires */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Résumés Hebdomadaires</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {weeklySummaries.map((summary, index) => (
              <div key={summary.week} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    Semaine {index + 1}
                  </h4>
                  {summary.marginTrend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : summary.marginTrend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    CA: {summary.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                  <p className="text-gray-600">
                    Coûts: {summary.totalCosts.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                  <p className={`font-medium ${summary.marginTrend === 'up' ? 'text-green-600' : summary.marginTrend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                    Marge: {summary.averageMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Données quotidiennes récentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Données Quotidiennes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chiffre d'affaires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coûts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {financialData.slice(0, 10).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.costs.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.margin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.margin_percentage >= 20 
                        ? 'bg-green-100 text-green-800'
                        : item.margin_percentage >= 15
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.margin_percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration des rapports par email */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Mail className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Rapports par Email</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <input
              type="email"
              value={emailSettings.email}
              onChange={(e) => setEmailSettings({...emailSettings, email: e.target.value})}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="votre@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.dailyReports}
                onChange={(e) => setEmailSettings({...emailSettings, dailyReports: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Rapports quotidiens</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={emailSettings.weeklyReports}
                onChange={(e) => setEmailSettings({...emailSettings, weeklyReports: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Synthèses hebdomadaires</span>
            </label>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Sauvegarder les paramètres
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-800 mb-2">Format du fichier CSV</h3>
            <div className="text-blue-700 space-y-1 text-sm">
              <p>Votre fichier CSV doit contenir les colonnes suivantes :</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>date</strong> : Date au format YYYY-MM-DD</li>
                <li><strong>revenue</strong> : Chiffre d'affaires du jour</li>
                <li><strong>costs</strong> : Coûts du jour</li>
              </ul>
              <p className="mt-2">La marge et le pourcentage de marge seront calculés automatiquement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;