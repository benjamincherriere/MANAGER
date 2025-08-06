import React, { useState, useEffect } from 'react';
import { Calendar, FileText, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Eye, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface DashboardStats {
  suppliers: {
    total: number;
    overdue: number;
    meetingsThisYear: number;
  };
  products: {
    total: number;
    toCreate: number;
    completionRate: number;
  };
  finance: {
    todayRevenue: number;
    todayMargin: number;
    marginTrend: 'up' | 'down' | 'stable';
    daysAnalyzed: number;
  };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    suppliers: { total: 0, overdue: 0, meetingsThisYear: 0 },
    products: { total: 82, toCreate: 82, completionRate: 0 },
    finance: { todayRevenue: 0, todayMargin: 0, marginTrend: 'stable', daysAnalyzed: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSupplierStats(),
        loadProductStats(),
        loadFinanceStats()
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierStats = async () => {
    try {
      // Vérifier si Supabase est configuré
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase non configuré, utilisation des données par défaut');
        setStats(prev => ({
          ...prev,
          suppliers: {
            total: 0,
            overdue: 0,
            meetingsThisYear: 0
          }
        }));
        return;
      }

      // Charger les fournisseurs
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*');

      if (suppliersError) throw suppliersError;

      // Charger les meetings
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*');

      if (meetingsError) throw meetingsError;

      const currentYear = new Date().getFullYear();
      const meetingsThisYear = meetings?.filter(m => 
        new Date(m.meeting_date).getFullYear() === currentYear
      ).length || 0;

      // Calculer les fournisseurs en retard
      let overdueCount = 0;
      suppliers?.forEach(supplier => {
        const supplierMeetings = meetings?.filter(m => m.supplier_id === supplier.id) || [];
        if (supplierMeetings.length === 0) {
          overdueCount++;
        } else {
          const lastMeeting = supplierMeetings.reduce((latest, current) => 
            new Date(current.meeting_date) > new Date(latest.meeting_date) ? current : latest
          );
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          if (new Date(lastMeeting.meeting_date) < twoYearsAgo) {
            overdueCount++;
          }
        }
      });

      setStats(prev => ({
        ...prev,
        suppliers: {
          total: suppliers?.length || 0,
          overdue: overdueCount,
          meetingsThisYear
        }
      }));
    } catch (error) {
      console.warn('Impossible de charger les données fournisseurs, utilisation des données par défaut:', error);
      // Fallback sur les données par défaut
      setStats(prev => ({
        ...prev,
        suppliers: {
          total: 0,
          overdue: 0,
          meetingsThisYear: 0
        }
      }));
    }
  };

  const loadProductStats = async () => {
    try {
      // Essayer de charger depuis Google Sheets
      const SHEET_ID = '1omv1n5kHaESPbqBMx4zNhFreRk-fuJns3tgECanO2Jc';
      const SHEET_GID = '690830060';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
      
      const response = await fetch(csvUrl, { 
        mode: 'cors',
        headers: {
          'Accept': 'text/csv, text/plain, application/csv'
        }
      });
      
      if (response.ok) {
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const dataLines = lines.slice(1);
          let totalProducts = 0;
          let productsToCreate = 0;
          
          dataLines.forEach(line => {
            const columns = line.split(',');
            if (columns.length >= 6) {
              totalProducts++;
              const status = columns[5]?.trim().replace(/"/g, '');
              if (status === 'À créer' || status === 'A créer' || !status) {
                productsToCreate++;
              }
            }
          });
          
          const completionRate = totalProducts > 0 ? Math.round(((totalProducts - productsToCreate) / totalProducts) * 100) : 0;
          
          setStats(prev => ({
            ...prev,
            products: {
              total: totalProducts,
              toCreate: productsToCreate,
              completionRate
            }
          }));
          return;
        }
      }
      
      // Fallback sur les données par défaut
      setStats(prev => ({
        ...prev,
        products: {
          total: 82,
          toCreate: 82,
          completionRate: 0
        }
      }));
    } catch (error) {
      console.warn('Impossible de charger les données produits depuis Google Sheets, utilisation des données par défaut:', error);
      // Fallback sur les données par défaut en cas d'erreur réseau
      setStats(prev => ({
        ...prev,
        products: {
          total: 82,
          toCreate: 82,
          completionRate: 0
        }
      }));
    }
  };

  const loadFinanceStats = async () => {
    try {
      // Vérifier si Supabase est configuré
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.warn('Supabase non configuré, utilisation des données par défaut');
        setStats(prev => ({
          ...prev,
          finance: {
            todayRevenue: 0,
            todayMargin: 0,
            marginTrend: 'stable',
            daysAnalyzed: 0
          }
        }));
        return;
      }

      const { data: financialData, error } = await supabase
        .from('financial_data')
        .select('*')
        .order('date', { ascending: false })
        .limit(2);

      if (error) throw error;

      if (financialData && financialData.length > 0) {
        const today = financialData[0];
        const yesterday = financialData[1];
        
        const marginTrend = yesterday ? 
          (today.margin_percentage > yesterday.margin_percentage ? 'up' : 
           today.margin_percentage < yesterday.margin_percentage ? 'down' : 'stable') : 'stable';

        // Compter le total de jours analysés
        const { count } = await supabase
          .from('financial_data')
          .select('*', { count: 'exact', head: true });

        setStats(prev => ({
          ...prev,
          finance: {
            todayRevenue: today.revenue,
            todayMargin: today.margin_percentage,
            marginTrend,
            daysAnalyzed: count || 0
          }
        }));
      } else {
        // Aucune donnée financière trouvée
        setStats(prev => ({
          ...prev,
          finance: {
            todayRevenue: 0,
            todayMargin: 0,
            marginTrend: 'stable',
            daysAnalyzed: 0
          }
        }));
      }
    } catch (error) {
      console.warn('Impossible de charger les données financières, utilisation des données par défaut:', error);
      // Fallback sur les données par défaut
      setStats(prev => ({
        ...prev,
        finance: {
          todayRevenue: 0,
          todayMargin: 0,
          marginTrend: 'stable',
          daysAnalyzed: 0
        }
      }));
    }
  };

  const refreshData = () => {
    loadDashboardData();
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-1">
            Vue d'ensemble de Plus de Bulles
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Fournisseurs Total */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fournisseurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.suppliers.total}</p>
            </div>
          </div>
        </div>

        {/* Produits à créer */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stats.products.toCreate > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {stats.products.toCreate > 0 ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produits à créer</p>
              <p className={`text-2xl font-bold ${stats.products.toCreate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.products.toCreate}
              </p>
            </div>
          </div>
        </div>

        {/* CA Aujourd'hui */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CA Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.finance.todayRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        {/* Marge Aujourd'hui */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stats.finance.marginTrend === 'up' ? 'bg-green-100' : stats.finance.marginTrend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
              <TrendingUp className={`h-6 w-6 ${stats.finance.marginTrend === 'up' ? 'text-green-600' : stats.finance.marginTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marge Aujourd'hui</p>
              <p className={`text-2xl font-bold ${stats.finance.marginTrend === 'up' ? 'text-green-600' : stats.finance.marginTrend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.finance.todayMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Fournisseurs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Suivi Fournisseurs</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total fournisseurs</span>
              <span className="font-medium text-gray-900">{stats.suppliers.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">RDV cette année</span>
              <span className="font-medium text-green-600">{stats.suppliers.meetingsThisYear}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">En retard (&gt;2 ans)</span>
              <span className={`font-medium ${stats.suppliers.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.suppliers.overdue}
              </span>
            </div>
            {stats.suppliers.overdue > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-800">
                    {stats.suppliers.overdue} fournisseur{stats.suppliers.overdue > 1 ? 's' : ''} à recontacter
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Module Produits */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Fiches Produits</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total produits</span>
              <span className="font-medium text-gray-900">{stats.products.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">À créer</span>
              <span className={`font-medium ${stats.products.toCreate > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.products.toCreate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Progression</span>
              <span className="font-medium text-blue-600">{stats.products.completionRate}%</span>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.products.completionRate}%` }}
              ></div>
            </div>
            
            {stats.products.toCreate === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">Objectif atteint !</span>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    Objectif : arriver à 0
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Module Finance */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Analyse Financière</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">CA aujourd'hui</span>
              <span className="font-medium text-gray-900">
                {stats.finance.todayRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Marge aujourd'hui</span>
              <span className={`font-medium ${stats.finance.marginTrend === 'up' ? 'text-green-600' : stats.finance.marginTrend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.finance.todayMargin.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Jours analysés</span>
              <span className="font-medium text-blue-600">{stats.finance.daysAnalyzed}</span>
            </div>
            
            {stats.finance.daysAnalyzed === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    Importez vos premiers CSV
                  </span>
                </div>
              </div>
            ) : (
              <div className={`border rounded p-3 ${stats.finance.marginTrend === 'up' ? 'bg-green-50 border-green-200' : stats.finance.marginTrend === 'down' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  <TrendingUp className={`h-4 w-4 mr-2 ${stats.finance.marginTrend === 'up' ? 'text-green-600' : stats.finance.marginTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`} />
                  <span className={`text-sm ${stats.finance.marginTrend === 'up' ? 'text-green-800' : stats.finance.marginTrend === 'down' ? 'text-red-800' : 'text-gray-800'}`}>
                    Tendance {stats.finance.marginTrend === 'up' ? 'positive' : stats.finance.marginTrend === 'down' ? 'négative' : 'stable'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dernière mise à jour */}
      <div className="text-center text-sm text-gray-500">
        Dernière mise à jour: {lastUpdate.toLocaleString('fr-FR')}
      </div>
    </div>
  );
};

export default Dashboard;