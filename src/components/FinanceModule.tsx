import React, { useState, useEffect } from 'react';
import { Upload, Download, TrendingUp, DollarSign, Calendar, AlertCircle, FileText, Settings, RefreshCw, Brain, Mail, Gift, TrendingDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
  discounts?: number;
  cashback?: number;
  created_at: string;
}

interface WeeklySummary {
  week: string;
  totalRevenue: number;
  totalCosts: number;
  averageMargin: number;
  marginTrend: 'up' | 'down' | 'stable';
}

interface OrderData {
  orderNumber: string;
  channel: string;
  date: string;
  totalRevenue: number;
  totalCosts: number;
  discount: number;
  loyaltyUsed: number;
  finalRevenue: number;
  margin: number;
  marginPercentage: number;
  items: number;
}

interface ChannelData {
  name: string;
  value: number;
  color: string;
}

const FinanceModule: React.FC = () => {
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importingFromUrl, setImportingFromUrl] = useState(false);
  const [csvUrl, setCsvUrl] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    email: '',
    dailyReports: true,
    weeklyReports: true,
    openaiApiKey: localStorage.getItem('openai_api_key') || ''
  });
  const [analysis, setAnalysis] = useState<{
    content: string;
    stats: any;
    timestamp: Date;
  } | null>(null);
  const [analyzingData, setAnalyzingData] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [dailyImportConfig, setDailyImportConfig] = useState({
    enabled: false,
    csv_url: '',
    last_import: null as string | null,
    import_count: 0
  });
  const [showDailyImportModal, setShowDailyImportModal] = useState(false);
  const [savingDailyConfig, setSavingDailyConfig] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'channels'>('overview');
  const [totals, setTotals] = useState({
    totalDiscounts: 0,
    totalCashback: 0,
    totalRevenue: 0,
    totalCosts: 0,
    totalMargin: 0
  });
  const [channelStats, setChannelStats] = useState<any>({});

  const CHANNEL_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  useEffect(() => {
    loadFinancialData();
    loadDailyImportConfig();
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
      
      // Calculer les totaux
      if (data && data.length > 0) {
        const calculatedTotals = data.reduce((acc, item) => ({
          totalDiscounts: acc.totalDiscounts + (item.discounts || 0),
          totalCashback: acc.totalCashback + (item.cashback || 0),
          totalRevenue: acc.totalRevenue + item.revenue,
          totalCosts: acc.totalCosts + item.costs,
          totalMargin: acc.totalMargin + item.margin
        }), {
          totalDiscounts: 0,
          totalCashback: 0,
          totalRevenue: 0,
          totalCosts: 0,
          totalMargin: 0
        });
        
        setTotals(calculatedTotals);
      }
      
      // Calculer les résumés hebdomadaires
      calculateWeeklySummaries(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
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
        .maybeSingle();

      if (error && !error.message.includes('No rows')) {
        console.warn('Erreur chargement stats canaux:', error);
        console.warn('Erreur lors du chargement des statistiques par canal:', error);
        // Utiliser les données simulées si pas de données réelles
        // Aucune donnée trouvée, utiliser les données simulées
        setChannelData(getSimulatedChannelData());
        return;
      }

      if (data?.setting_value?.channels) {
        setChannelStats(data.setting_value.channels);
      }
    } catch (error) {
      console.warn('Erreur chargement channel stats:', error);
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

    // Vérifier le type de fichier
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/csv') {
      alert('❌ Veuillez sélectionner un fichier CSV (.csv)');
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      
      if (!text || text.trim() === '') {
        throw new Error('Le fichier CSV semble vide');
      }

      // Parser le CSV
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        throw new Error('Le fichier CSV doit contenir au moins une ligne de données en plus de l\'en-tête');
      }

      // Détecter le séparateur (virgule ou point-virgule)
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      
      const headers = firstLine.toLowerCase().split(separator).map(h => h.trim().replace(/"/g, ''));
      
      // Détecter le format du CSV
      const isOrderFormat = headers.some(h => 
        h.includes('commande') || h.includes('quantity') || h.includes('quantit') || h.includes('prix de vente') || h.includes('prix achat')
      );
      
      let dataToInsert = [];
      let successCount = 0;
      let errorCount = 0;

      if (isOrderFormat) {
        // Format commandes : calculer les totaux par jour
        const ordersByDate = new Map();
        const orderMap = new Map<string, OrderData>();
        const channelMap = new Map<string, number>();
        
        // Trouver les index des colonnes pour le format commandes
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const channelIndex = headers.findIndex(h => h.includes('chanel') || h.includes('channel'));
        const orderIndex = headers.findIndex(h => h.includes('numero') && h.includes('commande'));
        const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('quantit'));
        const salePriceIndex = headers.findIndex(h => h.includes('prix de vente'));
        const purchasePriceIndex = headers.findIndex(h => h.includes('prix achat') || h.includes('prix d\'achat'));
        const discountIndex = headers.findIndex(h => h.includes('remise') || h.includes('discount'));
        const loyaltyIndex = headers.findIndex(h => h.includes('cagnotte') || h.includes('loyalty'));
        
        console.log('🔍 Colonnes détectées:');
        console.log(`Date: ${dateIndex} (${headers[dateIndex] || 'non trouvée'})`);
        console.log(`Channel: ${channelIndex} (${headers[channelIndex] || 'non trouvée'})`);
        console.log(`Numéro commande: ${orderIndex} (${headers[orderIndex] || 'non trouvée'})`);
        console.log(`Quantité: ${quantityIndex} (${headers[quantityIndex] || 'non trouvée'})`);
        console.log(`Prix vente: ${salePriceIndex} (${headers[salePriceIndex] || 'non trouvée'})`);
        console.log(`Prix achat: ${purchasePriceIndex} (${headers[purchasePriceIndex] || 'non trouvée'})`);
        console.log(`Remise: ${discountIndex} (${headers[discountIndex] || 'non trouvée'})`);
        console.log(`Cagnotte: ${loyaltyIndex} (${headers[loyaltyIndex] || 'non trouvée'})`);
        
        if (quantityIndex === -1 || salePriceIndex === -1 || purchasePriceIndex === -1) {
          throw new Error('Colonnes manquantes pour le format commandes. Colonnes requises: quantité, prix de vente, prix d\'achat');
        }

        for (let i = 1; i < lines.length; i++) {
          try {
            const columns = lines[i].split(separator).map(c => c.trim().replace(/"/g, ''));
            
            if (columns.length < headers.length) continue;

            const quantity = parseFloat(columns[quantityIndex]?.replace(/[^\d.-]/g, '')) || 0;
            const salePrice = parseFloat(columns[salePriceIndex]?.replace(/[^\d.-]/g, '')) || 0;
            const purchasePrice = parseFloat(columns[purchasePriceIndex]?.replace(/[^\d.-]/g, '')) || 0;
            const discount = discountIndex !== -1 ? parseFloat(columns[discountIndex]) || 0 : 0;
            const loyaltyUsed = loyaltyIndex !== -1 ? parseFloat(columns[loyaltyIndex]) || 0 : 0;
            const channel = channelIndex !== -1 ? columns[channelIndex]?.trim() || 'Non spécifié' : 'Non spécifié';
            const orderNumber = orderIndex !== -1 ? columns[orderIndex]?.trim() || `Order-${i}` : `Order-${i}`;

            if (quantity <= 0 || salePrice <= 0 || purchasePrice <= 0) {
              errorCount++;
              continue;
            }

            const lineRevenue = quantity * salePrice;
            const lineCosts = quantity * purchasePrice;

            // Utiliser la date de la colonne ou la date du jour
            let dateToUse;
            if (dateIndex !== -1 && columns[dateIndex]) {
              // Gérer le format DD/MM/YYYY
              const dateStr = columns[dateIndex];
              let parsedDate;
              
              if (dateStr.includes('/')) {
                // Format DD/MM/YYYY
                const [day, month, year] = dateStr.split('/');
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else {
                parsedDate = new Date(dateStr);
              }
              
              if (!isNaN(parsedDate.getTime())) {
                dateToUse = parsedDate.toISOString().split('T')[0];
              } else {
                console.warn(`Ligne ${i + 1}: Date invalide "${dateStr}", utilisation de la date du jour`);
                dateToUse = new Date().toISOString().split('T')[0];
              }
            } else {
              dateToUse = new Date().toISOString().split('T')[0];
            }
            
            // Traitement des commandes
            const orderKey = `${orderNumber}-${dateToUse}`;
            if (!orderMap.has(orderKey)) {
              orderMap.set(orderKey, {
                orderNumber,
                channel,
                date: dateToUse,
                totalRevenue: 0,
                totalCosts: 0,
                discount: 0,
                loyaltyUsed: 0,
                finalRevenue: 0,
                margin: 0,
                marginPercentage: 0,
                items: 0
              });
            }
            
            const order = orderMap.get(orderKey)!;
            order.totalRevenue += lineRevenue;
            order.totalCosts += lineCosts;
            order.discount = Math.max(order.discount, discount); // Prendre la remise max de la commande
            order.loyaltyUsed = Math.max(order.loyaltyUsed, loyaltyUsed); // Prendre la cagnotte max
            order.items += quantity;
            
            // Traitement des channels
            channelMap.set(channel, (channelMap.get(channel) || 0) + lineRevenue);
            
            if (!ordersByDate.has(dateToUse)) {
              ordersByDate.set(dateToUse, { revenue: 0, costs: 0 });
            }
            
            const dayData = ordersByDate.get(dateToUse);
            dayData.revenue += lineRevenue;
            dayData.costs += lineCosts;
            
            successCount++;
          } catch (error) {
            console.warn(`Erreur ligne ${i + 1}:`, error);
            errorCount++;
          }
        }
        
        // Finaliser les calculs des commandes
        const ordersArray: OrderData[] = [];
        orderMap.forEach(order => {
          order.finalRevenue = order.totalRevenue - order.discount - order.loyaltyUsed;
          order.margin = order.finalRevenue - order.totalCosts;
          order.marginPercentage = order.finalRevenue > 0 ? (order.margin / order.finalRevenue) * 100 : 0;
          ordersArray.push(order);
        });
        
        setOrders(ordersArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        // Créer les données pour la visualisation par canal
        const channelDataArray: ChannelData[] = [];
        let colorIndex = 0;
        channelMap.forEach((revenue, name) => {
          channelDataArray.push({
            name,
            value: revenue,
            color: CHANNEL_COLORS[colorIndex % CHANNEL_COLORS.length]
          });
          colorIndex++;
        });
        
        setChannelData(channelDataArray.sort((a, b) => b.value - a.value));
        
        // Convertir en format pour insertion
        ordersByDate.forEach((data, date) => {
          dataToInsert.push({
            date,
            revenue: Math.round(data.revenue * 100) / 100,
            costs: Math.round(data.costs * 100) / 100
          });
        });
        
      } else {
        // Format standard : date, revenue, costs
        // Trouver les index des colonnes
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const revenueIndex = headers.findIndex(h => h.includes('revenue') || h.includes('chiffre') || h.includes('ca'));
        const costsIndex = headers.findIndex(h => h.includes('costs') || h.includes('cout') || h.includes('charge'));

        if (dateIndex === -1 || revenueIndex === -1 || costsIndex === -1) {
          throw new Error('Colonnes manquantes dans le CSV. Format attendu: date, revenue, costs');
        }

        for (let i = 1; i < lines.length; i++) {
          try {
            const columns = lines[i].split(separator).map(c => c.trim().replace(/"/g, ''));
            
            if (columns.length < 3) continue;

            const dateStr = columns[dateIndex];
            const revenueStr = columns[revenueIndex];
            const costsStr = columns[costsIndex];

            // Valider et parser la date
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              console.warn(`Ligne ${i + 1}: Date invalide "${dateStr}"`);
              errorCount++;
              continue;
            }

            // Valider et parser les montants
            const revenue = parseFloat(revenueStr.replace(/[^\d.-]/g, ''));
            const costs = parseFloat(costsStr.replace(/[^\d.-]/g, ''));

            if (isNaN(revenue) || isNaN(costs)) {
              console.warn(`Ligne ${i + 1}: Montants invalides (revenue: "${revenueStr}", costs: "${costsStr}")`);
              errorCount++;
              continue;
            }

            if (revenue < 0 || costs < 0) {
              console.warn(`Ligne ${i + 1}: Montants négatifs non autorisés`);
              errorCount++;
              continue;
            }

            dataToInsert.push({
              date: date.toISOString().split('T')[0],
              revenue,
              costs
            });
            successCount++;
          } catch (error) {
            console.warn(`Erreur ligne ${i + 1}:`, error);
            errorCount++;
          }
        }
      }

      if (dataToInsert.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
      }

      // Insérer en base de données
      const { data, error } = await supabase
        .from('financial_data')
        .upsert(dataToInsert, { 
          onConflict: 'date',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Recharger les données
      await loadFinancialData();
      await loadChannelStats();
      
      const formatType = isOrderFormat ? 'commandes' : 'standard';
      alert(`✅ Import réussi !\n\n📊 Format détecté: ${formatType}\n📈 ${dataToInsert.length} jour(s) de données créé(s) ou mis(es) à jour\n📦 ${successCount} lignes traitées avec succès\n${errorCount > 0 ? `⚠️ ${errorCount} lignes ignorées (erreurs de format)` : ''}\n\n💡 Les marges ont été calculées automatiquement.`);

      // Réinitialiser l'input
      event.target.value = '';

    } catch (error) {
      console.error('Erreur import:', error);
      alert(`❌ Erreur lors de l'import :\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}\n\n💡 Conseils :\n• Vérifiez le format de votre fichier CSV\n• Colonnes requises pour commandes: quantité, prix de vente, prix d'achat\n• Colonnes requises pour format standard: date, revenue, costs\n• Les dates doivent être au format YYYY-MM-DD ou DD/MM/YYYY`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload2 = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // AUSSI, AJOUTEZ CETTE FONCTION HELPER SI ELLE N'EXISTE PAS DÉJÀ
  // (Cherchez si getSimulatedChannelData existe déjà dans le fichier)
  const getSimulatedChannelData = (): ChannelData[] => {
    return [
      { name: 'Site Web', value: 15420.50, color: CHANNEL_COLORS[0] },
      { name: 'Magasin Physical', value: 12350.75, color: CHANNEL_COLORS[1] },
      { name: 'Marketplace', value: 8750.25, color: CHANNEL_COLORS[2] },
      { name: 'B2B Direct', value: 6200.00, color: CHANNEL_COLORS[3] }
    ];
  };

  const handleUrlImport = async () => {
    if (!csvUrl.trim()) {
      alert('Veuillez saisir une URL valide');
      return;
    }

    setImportingFromUrl(true);
    try {
      // Télécharger le CSV depuis l'URL
      const response = await fetch(csvUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'text/csv, text/plain, application/csv'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: Impossible d'accéder à l'URL`);
      }

      const csvText = await response.text();
      
      if (!csvText || csvText.trim() === '') {
        throw new Error('Le fichier CSV semble vide');
      }

      // Parser le CSV
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        throw new Error('Le fichier CSV doit contenir au moins une ligne de données en plus de l\'en-tête');
      }

      const headers = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
      
      // Détecter le format du CSV
      const isOrderFormat = headers.some(h => 
        h.includes('commande') || h.includes('quantity') || h.includes('prix de vente') || h.includes('prix achat')
      );
      
      let dataToInsert = [];
      let successCount = 0;
      let errorCount = 0;

      if (isOrderFormat) {
        // Format commandes : calculer les totaux par jour
        const ordersByDate = new Map();
        
        // Trouver les index des colonnes pour le format commandes
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('quantit'));
        const salePriceIndex = headers.findIndex(h => h.includes('prix de vente'));
        const purchasePriceIndex = headers.findIndex(h => h.includes('prix achat'));
        
        if (quantityIndex === -1 || salePriceIndex === -1 || purchasePriceIndex === -1) {
          throw new Error('Colonnes manquantes pour le format commandes. Colonnes requises: quantity, prix de vente, prix achat');
        }

        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i].trim();
            if (!line) {
              console.log(`Ligne ${i + 1}: Ligne vide ignorée`);
              continue;
            }
            
            const columns = line.split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
            
            if (columns.length < headers.length) {
              console.warn(`Ligne ${i + 1}: Nombre de colonnes insuffisant (${columns.length}/${headers.length}) - Ligne: "${line}"`);
              errorCount++;
              continue;
            }

            const quantity = parseFloat(columns[quantityIndex]?.replace(/[^\d.-]/g, '')) || 0;
            const salePrice = parseFloat(columns[salePriceIndex]?.replace(/[^\d.-]/g, '')) || 0;
            const purchasePrice = parseFloat(columns[purchasePriceIndex]?.replace(/[^\d.-]/g, '')) || 0;

            if (quantity <= 0 || salePrice <= 0 || purchasePrice <= 0) {
              errorCount++;
              continue;
            }

            const lineRevenue = quantity * salePrice;
            const lineCosts = quantity * purchasePrice;

            // Utiliser la date de la colonne ou la date du jour
            let dateToUse;
            if (dateIndex !== -1 && columns[dateIndex]) {
              // Gérer le format DD/MM/YYYY
              const dateStr = columns[dateIndex];
              let parsedDate;
              
              if (dateStr.includes('/')) {
                // Format DD/MM/YYYY
                const [day, month, year] = dateStr.split('/');
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else {
                parsedDate = new Date(dateStr);
              }
              
              if (!isNaN(parsedDate.getTime())) {
                dateToUse = parsedDate.toISOString().split('T')[0];
              } else {
                console.warn(`Ligne ${i + 1}: Date invalide "${dateStr}", utilisation de la date du jour`);
                dateToUse = new Date().toISOString().split('T')[0];
              }
            } else {
              dateToUse = new Date().toISOString().split('T')[0];
            }
            
            if (!ordersByDate.has(dateToUse)) {
              ordersByDate.set(dateToUse, { revenue: 0, costs: 0 });
            }
            
            const dayData = ordersByDate.get(dateToUse);
            dayData.revenue += lineRevenue;
            dayData.costs += lineCosts;
            
            successCount++;
          } catch (error) {
            console.warn(`Erreur ligne ${i + 1}:`, error);
            errorCount++;
          }
        }

        // Convertir en format pour insertion
        ordersByDate.forEach((data, date) => {
          dataToInsert.push({
            date,
            revenue: Math.round(data.revenue * 100) / 100,
            costs: Math.round(data.costs * 100) / 100
          });
        });
        
      } else {
        // Format standard : date, revenue, costs
        // Trouver les index des colonnes
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const revenueIndex = headers.findIndex(h => h.includes('revenue') || h.includes('chiffre') || h.includes('ca'));
        const costsIndex = headers.findIndex(h => h.includes('costs') || h.includes('cout') || h.includes('charge'));

        if (dateIndex === -1 || revenueIndex === -1 || costsIndex === -1) {
          throw new Error('Colonnes manquantes dans le CSV. Format attendu: date, revenue, costs');
        }

        for (let i = 1; i < lines.length; i++) {
          try {
            const columns = lines[i].split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
            
            if (columns.length < 3) continue;

            const dateStr = columns[dateIndex];
            const revenueStr = columns[revenueIndex];
            const costsStr = columns[costsIndex];

            // Valider et parser la date
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              console.warn(`Ligne ${i + 1}: Date invalide "${dateStr}"`);
              errorCount++;
              continue;
            }

            // Valider et parser les montants
            const revenue = parseFloat(revenueStr.replace(/[^\d.-]/g, ''));
            const costs = parseFloat(costsStr.replace(/[^\d.-]/g, ''));

            if (isNaN(revenue) || isNaN(costs)) {
              console.warn(`Ligne ${i + 1}: Montants invalides (revenue: "${revenueStr}", costs: "${costsStr}")`);
              errorCount++;
              continue;
            }

            if (revenue < 0 || costs < 0) {
              console.warn(`Ligne ${i + 1}: Montants négatifs non autorisés`);
              errorCount++;
              continue;
            }

            dataToInsert.push({
              date: date.toISOString().split('T')[0],
              revenue,
              costs
            });
            successCount++;
          } catch (error) {
            console.warn(`Erreur ligne ${i + 1}:`, error);
            errorCount++;
          }
        }
      }

      if (dataToInsert.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
      }

      // Insérer en base de données
      const { data, error } = await supabase
        .from('financial_data')
        .upsert(dataToInsert, { 
          onConflict: 'date',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Recharger les données
      await loadFinancialData();
      await loadChannelStats();
      
      // Fermer le modal et afficher le résultat
      setShowUrlModal(false);
      setCsvUrl('');
      
      const formatType = isOrderFormat ? 'commandes' : 'standard';
      alert(`✅ Import réussi !\n\n📊 Format détecté: ${formatType}\n📈 ${dataToInsert.length} jour(s) de données créé(s) ou mis(es) à jour\n📦 ${successCount} lignes traitées avec succès\n${errorCount > 0 ? `⚠️ ${errorCount} lignes ignorées (erreurs de format)` : ''}\n\n💡 Les marges ont été calculées automatiquement.`);

    } catch (error) {
      console.error('Erreur import URL:', error);
      alert(`❌ Erreur lors de l'import :\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}\n\n💡 Conseils :\n• Vérifiez que l'URL est accessible publiquement\n• Le fichier doit être au format CSV avec séparateur ; ou ,\n• Colonnes requises pour commandes: quantité, prix de vente, prix d'achat\n• Colonnes requises pour format standard: date, revenue, costs`);
    } finally {
      setImportingFromUrl(false);
    }
  };

  const loadDailyImportConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('setting_key', 'daily_csv_import')
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        console.error('Erreur chargement config:', error);
        return;
      }

      if (data && data.length > 0) {
        setDailyImportConfig(data[0].setting_value);
      }
    } catch (error) {
      console.error('Erreur chargement config daily import:', error);
    }
  };

  const saveDailyImportConfig = async () => {
    setSavingDailyConfig(true);
    try {
      // Créer la table user_settings si elle n'existe pas
      await supabase.rpc('create_user_settings_table_if_not_exists');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          setting_key: 'daily_csv_import',
          setting_value: dailyImportConfig
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        throw new Error(`Erreur sauvegarde: ${error.message}`);
      }

      setShowDailyImportModal(false);
      alert('✅ Configuration de l\'import quotidien sauvegardée !');
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSavingDailyConfig(false);
    }
  };

  const testDailyImport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-csv-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Test réussi !\n\n${result.message}\n\nImportées: ${result.stats?.imported || 0}\nErreurs: ${result.stats?.errors || 0}`);
        await loadFinancialData();
        await loadDailyImportConfig();
      } else {
        alert(`⚠️ ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Erreur test import:', error);
      alert(`❌ Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const generateAnalysis = async (type: 'daily' | 'weekly' | 'monthly', sendEmail = false) => {
    if (!emailSettings.openaiApiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      setShowApiKeyModal(true);
      return;
    }

    if (sendEmail && !emailSettings.email) {
      alert('Veuillez configurer votre adresse email');
      return;
    }

    setAnalyzingData(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          email: sendEmail ? emailSettings.email : undefined,
          openai_api_key: emailSettings.openaiApiKey
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'analyse');
      }

      setAnalysis({
        content: result.analysis,
        stats: result.stats,
        timestamp: new Date()
      });

      if (sendEmail) {
        alert('✅ Rapport envoyé par email avec succès !');
      }

    } catch (error) {
      console.error('Erreur analyse:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setAnalyzingData(false);
    }
  };

  const saveApiSettings = () => {
    localStorage.setItem('openai_api_key', emailSettings.openaiApiKey);
    setShowApiKeyModal(false);
    alert('✅ Paramètres sauvegardés !');
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
          <button
            onClick={() => setShowUrlModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={importingFromUrl}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importingFromUrl ? 'Import...' : 'Importer depuis URL'}
          </button>
          <button
            onClick={() => setShowDailyImportModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Import Quotidien
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'channels'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PieChart className="h-4 w-4 inline mr-2" />
              Répartition par Channel
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Détail des Commandes
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
      {/* Stats du jour */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Remises</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totals.totalDiscounts.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cagnottes</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totals.totalCashback.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remises</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cagnottes</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                    {(item.discounts || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                    {(item.cashback || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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

      {/* Analyse ChatGPT */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Analyse ChatGPT</h3>
            </div>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ⚙️ Configuration
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Boutons d'analyse */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => generateAnalysis('daily')}
              disabled={analyzingData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {analyzingData ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Analyse 7 jours
            </button>
            <button
              onClick={() => generateAnalysis('weekly')}
              disabled={analyzingData}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {analyzingData ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Analyse mensuelle
            </button>
            <button
              onClick={() => generateAnalysis('monthly')}
              disabled={analyzingData}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {analyzingData ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Analyse 3 mois
            </button>
          </div>

          {/* Boutons d'envoi par email */}
          {emailSettings.email && emailSettings.openaiApiKey && (
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 w-full mb-2">📧 Envoyer par email à {emailSettings.email}</p>
              <button
                onClick={() => generateAnalysis('daily', true)}
                disabled={analyzingData}
                className="flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Mail className="h-3 w-3 mr-1" />
                Rapport quotidien
              </button>
              <button
                onClick={() => generateAnalysis('weekly', true)}
                disabled={analyzingData}
                className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Mail className="h-3 w-3 mr-1" />
                Rapport hebdomadaire
              </button>
            </div>
          )}

          {/* Résultat de l'analyse */}
          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>🤖 Analyse générée le {analysis.timestamp.toLocaleString('fr-FR')}</span>
                <div className="flex space-x-4">
                  <span>📊 {analysis.stats.daysAnalyzed} jours</span>
                  <span>💰 {parseFloat(analysis.stats.totalRevenue).toLocaleString('fr-FR')}€</span>
                  <span>📈 {analysis.stats.avgMargin}% marge</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                  {analysis.content}
                </pre>
              </div>
            </div>
          )}

          {analyzingData && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-gray-600">🤖 ChatGPT analyse vos données financières...</p>
              </div>
            </div>
          )}

          {!analysis && !analyzingData && (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Cliquez sur un bouton d'analyse pour obtenir des insights ChatGPT sur vos données financières</p>
            </div>
          )}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clé API OpenAI
            </label>
            <input
              type="password"
              value={emailSettings.openaiApiKey}
              onChange={(e) => setEmailSettings({...emailSettings, openaiApiKey: e.target.value})}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Nécessaire pour l'analyse ChatGPT. <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">Obtenir une clé API</a>
            </p>
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
          <button 
            onClick={() => {
              localStorage.setItem('openai_api_key', emailSettings.openaiApiKey);
              alert('✅ Paramètres sauvegardés !');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
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
              <p className="text-sm text-gray-600 mb-4">
                <strong>Format de vos données :</strong>
              </p>
              <div className="space-y-4">
                <div>
                  <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                    channel, order_number, order_date, total_sales, total_cost, total_margin<br/>
                    Site Web,CMD001,2024-01-15,REF123,Produit A,Marque X,2,25.00,18.00,5.00,2.50
                  </div>
                  <p className="text-xs mt-2">
                    ✅ <strong>Colonnes obligatoires :</strong> Date, quantity, prix de vente, prix achat<br/>
                    ✅ <strong>Colonnes optionnelles :</strong> Chanel (pour la répartition), remise, cagnotte<br/>
                    ✅ <strong>Calculs automatiques :</strong> CA = (quantity × prix de vente) - remise, Coûts = (quantity × prix achat) + cagnotte
                  </p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Traitement automatique :</strong><br/>
                  • Les remises sont déduites du chiffre d'affaires<br/>
                  • Les cagnottes sont ajoutées aux coûts<br/>
                  • Les colonnes remise/cagnotte sont optionnelles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Répartition du CA par Channel</h3>
            
            {channelData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Graphique en camembert */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [
                          `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
                          'Chiffre d\'affaires'
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Tableau des channels */}
                <div>
                  <div className="space-y-3">
                    {channelData.map((channel, index) => {
                      const percentage = (channel.value / channelData.reduce((sum, c) => sum + c.value, 0)) * 100;
                      return (
                        <div key={channel.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: channel.color }}
                            ></div>
                            <span className="font-medium text-gray-900">{channel.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              {channel.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune donnée de channel disponible</p>
                <p className="text-sm">Importez un fichier CSV avec une colonne "Channel" pour voir la répartition</p>
              </div>
            )}
          </div>

          {/* Note explicative */}
          {Object.keys(channelStats).length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📊 Aucune donnée par canal</h4>
              <p className="text-sm text-blue-700">
                Importez un CSV avec une colonne "Chanel" pour voir la répartition réelle par canal de vente.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">✅ Données réelles par canal</h4>
              <p className="text-sm text-green-700">
                Répartition basée sur vos données importées avec {Object.keys(channelStats).length} canal(aux) détecté(s).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Détail des Commandes</h3>
              <p className="text-sm text-gray-600 mt-1">
                {orders.length} commandes • Marge moyenne: {
                  orders.length > 0 
                    ? (orders.reduce((sum, o) => sum + o.marginPercentage, 0) / orders.length).toFixed(1)
                    : '0'
                }%
              </p>
            </div>
            
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commande
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Articles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CA Brut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remises
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CA Net
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
                    {orders.map((order, index) => (
                      <tr key={`${order.orderNumber}-${order.date}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {order.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.items}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(order.discount + order.loyaltyUsed) > 0 ? (
                            <div className="text-red-600">
                              -{(order.discount + order.loyaltyUsed).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              {order.discount > 0 && order.loyaltyUsed > 0 && (
                                <div className="text-xs text-gray-500">
                                  Remise: {order.discount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}<br/>
                                  Cagnotte: {order.loyaltyUsed.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.finalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.totalCosts.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={order.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {order.margin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`${
                            order.marginPercentage >= 20 ? 'text-green-600' :
                            order.marginPercentage >= 10 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {order.marginPercentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune commande disponible</p>
                <p className="text-sm">Importez un fichier CSV pour voir le détail des commandes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Configuration API */}
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
                  value={emailSettings.openaiApiKey}
                  onChange={(e) => setEmailSettings({...emailSettings, openaiApiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="sk-proj-..."
                />
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Pour obtenir votre clé API :</strong></p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Allez sur <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:underline">platform.openai.com</a></li>
                  <li>Créez un compte ou connectez-vous</li>
                  <li>Cliquez sur "Create new secret key"</li>
                  <li>Copiez la clé et collez-la ici</li>
                </ol>
                <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                  ⚠️ Gardez votre clé secrète ! Elle sera stockée localement dans votre navigateur.
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
                onClick={saveApiSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import URL */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Importer CSV depuis une URL</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL du fichier CSV
                </label>
                <input
                  type="url"
                  value={csvUrl}
                  onChange={(e) => setCsvUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/data.csv"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'URL doit pointer vers un fichier CSV accessible publiquement
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Format CSV attendu :</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>2 formats supportés :</strong></p>
                  <div className="space-y-2">
                    <div>
                      <p><strong>Format 1 - Données de vente :</strong></p>
                      <ul className="list-disc list-inside ml-2 text-xs">
                        <li><code>date</code> : Date de la commande (optionnel)</li>
                        <li><code>quantité</code> : Nombre d'articles</li>
                        <li><code>prix de vente</code> : Prix unitaire de vente</li>
                        <li><code>prix d'achat</code> : Prix unitaire d'achat</li>
                      </ul>
                      <p className="text-xs mt-1">→ Les marges sont calculées automatiquement par date</p>
                    </div>
                    <div>
                      <p><strong>Format 2 - Données agrégées :</strong></p>
                      <ul className="list-disc list-inside ml-2 text-xs">
                        <li><code>date</code> : Format YYYY-MM-DD</li>
                        <li><code>revenue</code> : Chiffre d'affaires total</li>
                        <li><code>costs</code> : Coûts totaux</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-xs text-yellow-700">
                    <p><strong>Conseils :</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>L'URL doit être accessible sans authentification</li>
                      <li>Le serveur doit autoriser les requêtes CORS</li>
                      <li>Les données existantes seront mises à jour</li>
                      <li>Les lignes avec erreurs seront ignorées</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowUrlModal(false);
                  setCsvUrl('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={importingFromUrl}
              >
                Annuler
              </button>
              <button
                onClick={handleUrlImport}
                disabled={importingFromUrl || !csvUrl.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importingFromUrl ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Import en cours...
                  </>
                ) : (
                  'Importer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuration Import Quotidien */}
      {showDailyImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Import Quotidien</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableDailyImport"
                  checked={dailyImportConfig.enabled}
                  onChange={(e) => setDailyImportConfig({
                    ...dailyImportConfig,
                    enabled: e.target.checked
                  })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="enableDailyImport" className="ml-2 text-sm font-medium text-gray-700">
                  Activer l'import quotidien à 5h du matin
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL du fichier CSV
                </label>
                <input
                  type="url"
                  value={dailyImportConfig.csv_url}
                  onChange={(e) => setDailyImportConfig({
                    ...dailyImportConfig,
                    csv_url: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/daily-data.csv"
                  disabled={!dailyImportConfig.enabled}
                />
              </div>

              {dailyImportConfig.last_import && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    <strong>Dernier import :</strong> {new Date(dailyImportConfig.last_import).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Nombre d'imports :</strong> {dailyImportConfig.import_count}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Comment ça marche :</h4>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>L'import se déclenche automatiquement chaque jour à 5h du matin</li>
                  <li>Le système télécharge le CSV depuis l'URL configurée</li>
                  <li>Les données existantes sont mises à jour automatiquement</li>
                  <li>Un log est conservé de chaque import</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Prérequis :</h4>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>L'URL doit être accessible publiquement 24h/24</li>
                  <li>Le fichier doit respecter le format CSV standard</li>
                  <li>Colonnes requises : date, revenue, costs</li>
                  <li>Le serveur doit autoriser les requêtes automatisées</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                onClick={testDailyImport}
                disabled={!dailyImportConfig.enabled || !dailyImportConfig.csv_url}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🧪 Tester maintenant
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDailyImportModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={saveDailyImportConfig}
                  disabled={savingDailyConfig}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingDailyConfig ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;