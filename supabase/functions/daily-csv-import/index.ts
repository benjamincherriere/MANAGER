import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CSVRow {
  channel: string;
  order_number: string;
  order_date: string;
  product_ref: string;
  product_name: string;
  brand_name: string;
  quantity: number;
  unit_selling_price: number;
  unit_purchase_price: number;
  discount: number;
  reward_credit: number;
  total_sales: number;
  total_cost: number;
  total_margin: number;
  margin_rate: number;
}

interface DailyData {
  date: string;
  revenue: number;
  costs: number;
  orders: Set<string>;
}

interface ChannelData {
  revenue: number;
  costs: number;
  orders: Set<string>;
  margin: number;
  margin_rate: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { csv_content } = await req.json();

    if (!csv_content) {
      return new Response(
        JSON.stringify({ error: 'Contenu CSV manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Début de l\'import CSV...');

    // Parser le CSV
    const lines = csv_content.split('\n').filter((line: string) => line.trim());
    
    if (lines.length <= 1) {
      throw new Error('Le fichier CSV doit contenir au moins une ligne de données');
    }

    // Vérifier l'en-tête
    const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
    const expectedHeaders = [
      'channel', 'order_number', 'order_date', 'product_ref', 'product_name', 
      'brand_name', 'quantity', 'unit_selling_price', 'unit_purchase_price', 
      'discount', 'reward_credit', 'total_sales', 'total_cost', 'total_margin', 'margin_rate'
    ];

    console.log('En-têtes détectés:', headers);
    console.log('En-têtes attendus:', expectedHeaders);

    // Vérifier que toutes les colonnes essentielles sont présentes
    const essentialColumns = ['channel', 'order_number', 'order_date', 'total_sales', 'total_cost'];
    const missingColumns = essentialColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}. Colonnes requises: ${essentialColumns.join(', ')}`);
    }

    // Traitement des données
    const dailyDataMap = new Map<string, DailyData>();
    const channelDataMap = new Map<string, Map<string, ChannelData>>();
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Traiter chaque ligne
    for (let i = 1; i < lines.length; i++) {
      try {
        const columns = lines[i].split(',').map((c: string) => c.trim());
        
        if (columns.length !== headers.length) {
          console.warn(`Ligne ${i + 1}: Nombre de colonnes incorrect (${columns.length} vs ${headers.length})`);
          errorCount++;
          continue;
        }

        // Extraire les données de la ligne
        const channel = columns[0] || '';
        const orderNumber = columns[1] || '';
        const orderDate = columns[2] || '';
        const totalSales = parseFloat(columns[11]) || 0;
        const totalCost = parseFloat(columns[12]) || 0;
        const totalMargin = parseFloat(columns[13]) || 0;
        const marginRate = parseFloat(columns[14]) || 0;

        // Ignorer les lignes avec des données vides ou nulles
        if (!channel || !orderDate || (totalSales === 0 && totalCost === 0)) {
          console.log(`Ligne ${i + 1}: Ligne vide ou sans données financières, ignorée`);
          skippedCount++;
          continue;
        }

        // Valider la date
        const parsedDate = new Date(orderDate);
        if (isNaN(parsedDate.getTime())) {
          console.warn(`Ligne ${i + 1}: Date invalide "${orderDate}"`);
          errorCount++;
          continue;
        }

        const dateKey = parsedDate.toISOString().split('T')[0];

        // Agrégation par date pour financial_data
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, {
            date: dateKey,
            revenue: 0,
            costs: 0,
            orders: new Set()
          });
        }

        const dailyData = dailyDataMap.get(dateKey)!;
        dailyData.revenue += totalSales;
        dailyData.costs += totalCost;
        if (orderNumber) {
          dailyData.orders.add(orderNumber);
        }

        // Agrégation par canal et date pour les statistiques
        if (!channelDataMap.has(dateKey)) {
          channelDataMap.set(dateKey, new Map());
        }

        const dateChannels = channelDataMap.get(dateKey)!;
        if (!dateChannels.has(channel)) {
          dateChannels.set(channel, {
            revenue: 0,
            costs: 0,
            orders: new Set(),
            margin: 0,
            margin_rate: 0
          });
        }

        const channelData = dateChannels.get(channel)!;
        channelData.revenue += totalSales;
        channelData.costs += totalCost;
        channelData.margin += totalMargin;
        if (orderNumber) {
          channelData.orders.add(orderNumber);
        }

        // Recalculer le taux de marge pour le canal
        if (channelData.revenue > 0) {
          channelData.margin_rate = channelData.margin / channelData.revenue;
        }

        successCount++;
      } catch (error) {
        console.warn(`Erreur ligne ${i + 1}:`, error);
        errorCount++;
      }
    }

    if (dailyDataMap.size === 0) {
      throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
    }

    // Préparer les données pour insertion dans financial_data
    const financialDataToInsert = Array.from(dailyDataMap.values()).map(data => ({
      date: data.date,
      revenue: Math.round(data.revenue * 100) / 100,
      costs: Math.round(data.costs * 100) / 100
    }));

    console.log('Données financières à insérer:', financialDataToInsert);

    // Insérer les données financières
    const { error: insertError } = await supabase
      .from('financial_data')
      .upsert(financialDataToInsert, { 
        onConflict: 'date',
        ignoreDuplicates: false 
      });

    if (insertError) {
      throw new Error(`Erreur insertion financial_data: ${insertError.message}`);
    }

    // Préparer les statistiques par canal
    const channelStats: Record<string, any> = {};
    const allChannels = new Set<string>();

    channelDataMap.forEach((channels, date) => {
      channels.forEach((data, channel) => {
        allChannels.add(channel);
        
        if (!channelStats[channel]) {
          channelStats[channel] = {
            revenue: 0,
            costs: 0,
            margin: 0,
            orders: new Set(),
            dates: [],
            margin_rate: 0
          };
        }

        channelStats[channel].revenue += data.revenue;
        channelStats[channel].costs += data.costs;
        channelStats[channel].margin += data.margin;
        data.orders.forEach(order => channelStats[channel].orders.add(order));
        channelStats[channel].dates.push(date);
      });
    });

    // Convertir les Sets en nombres et calculer les taux de marge finaux
    Object.keys(channelStats).forEach(channel => {
      const stats = channelStats[channel];
      stats.order_count = stats.orders.size;
      stats.avg_order_value = stats.order_count > 0 ? stats.revenue / stats.order_count : 0;
      stats.margin_rate = stats.revenue > 0 ? stats.margin / stats.revenue : 0;
      delete stats.orders; // Supprimer le Set pour la sérialisation JSON
    });

    console.log('Statistiques par canal:', channelStats);

    // Sauvegarder les statistiques par canal
    const { error: statsError } = await supabase
      .from('user_settings')
      .upsert({
        setting_key: 'channel_statistics',
        setting_value: {
          channels: channelStats,
          last_update: new Date().toISOString(),
          total_channels: allChannels.size,
          import_summary: {
            total_lines: lines.length - 1,
            success_count: successCount,
            error_count: errorCount,
            skipped_count: skippedCount,
            dates_processed: dailyDataMap.size
          }
        }
      }, {
        onConflict: 'user_id,setting_key'
      });

    if (statsError) {
      console.warn('Erreur sauvegarde statistiques:', statsError);
    }

    const result = {
      success: true,
      message: `Import réussi: ${successCount} lignes traitées, ${allChannels.size} canaux détectés`,
      stats: {
        total_lines: lines.length - 1,
        processed: successCount,
        errors: errorCount,
        skipped: skippedCount,
        dates_created: dailyDataMap.size,
        channels: Array.from(allChannels),
        channel_breakdown: channelStats,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Import terminé:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur import CSV:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});