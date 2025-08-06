import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ImportConfig {
  csv_url: string;
  enabled: boolean;
  last_import?: string;
  import_count?: number;
}

interface ChannelData {
  revenue: number;
  costs: number;
  orders: number;
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

    // Récupérer la configuration d'import depuis les métadonnées utilisateur
    const { data: configs, error: configError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('setting_key', 'daily_csv_import')
      .limit(1);

    if (configError && !configError.message.includes('does not exist')) {
      throw new Error(`Erreur configuration: ${configError.message}`);
    }

    // Si pas de configuration ou table n'existe pas, créer la table et une config par défaut
    if (!configs || configs.length === 0) {
      // Créer la table si elle n'existe pas
      await supabase.rpc('create_user_settings_table');
      
      console.log('Aucune configuration d\'import trouvée, arrêt du processus');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Aucune configuration d\'import configurée' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: ImportConfig = configs[0].setting_value;

    if (!config.enabled || !config.csv_url) {
      console.log('Import quotidien désactivé ou URL manquante');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Import quotidien désactivé ou URL non configurée' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Début de l'import quotidien depuis: ${config.csv_url}`);

    // Télécharger le CSV depuis l'URL
    const response = await fetch(config.csv_url, {
      headers: {
        'Accept': 'text/csv, text/plain, application/csv',
        'User-Agent': 'Plus-de-Bulles-Daily-Import/1.0'
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
      throw new Error('Le fichier CSV doit contenir au moins une ligne de données');
    }

    const headers = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim().replace(/"/g, ''));
    
    // Détecter les colonnes selon votre format
    const channelIndex = headers.findIndex(h => h.includes('chanel') || h.includes('channel') || h === 'chanel');
    const orderNumberIndex = headers.findIndex(h => h.includes('numero') || h.includes('commande') || h.includes('numero de commande'));
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const productRefIndex = headers.findIndex(h => h.includes('ref produit') || (h.includes('ref') && h.includes('produit')));
    const productNameIndex = headers.findIndex(h => h.includes('nom produit') || (h.includes('nom') && h.includes('produit')));
    const brandIndex = headers.findIndex(h => h.includes('marque prod') || h.includes('marque'));
    const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('quantit'));
    const salePriceIndex = headers.findIndex(h => h.includes('prix de vente') || (h.includes('prix') && h.includes('vente')));
    const purchasePriceIndex = headers.findIndex(h => h.includes('prix achat') || (h.includes('prix') && h.includes('achat')));
    const discountIndex = headers.findIndex(h => h.includes('remise'));
    const cashbackIndex = headers.findIndex(h => h.includes('cagnotte'));
    
    const dataToInsert = [];
    const channelDataByDate = new Map(); // Map<date, Map<channel, ChannelData>>
    let successCount = 0;
    let errorCount = 0;

    // Vérifier les colonnes obligatoires
    if (dateIndex === -1) {
      throw new Error('Colonne Date manquante');
    }
    if (quantityIndex === -1) {
      throw new Error('Colonne quantity manquante');
    }
    if (salePriceIndex === -1) {
      throw new Error('Colonne prix de vente manquante');
    }
    if (purchasePriceIndex === -1) {
      throw new Error('Colonne prix achat manquante');
    }

    console.log('Colonnes détectées:', {
      channel: channelIndex,
      orderNumber: orderNumberIndex,
      date: dateIndex,
      quantity: quantityIndex,
      salePrice: salePriceIndex,
      purchasePrice: purchasePriceIndex,
      discount: discountIndex,
      cashback: cashbackIndex
    });

    // Traiter chaque ligne de commande
    const ordersByDate = new Map();
    const processedOrders = new Set(); // Pour éviter les doublons de commandes

    for (let i = 1; i < lines.length; i++) {
      try {
        const columns = lines[i].split(/\t|,|;/).map(c => c.trim().replace(/"/g, ''));
        
        if (columns.length < Math.max(dateIndex, quantityIndex, salePriceIndex, purchasePriceIndex) + 1) {
          console.warn(`Ligne ${i + 1}: Pas assez de colonnes (${columns.length} vs ${headers.length} attendues)`);
          errorCount++;
          continue;
        }

        // Extraire les données de la ligne
        const channel = channelIndex !== -1 ? columns[channelIndex] : 'Non spécifié';
        const orderNumber = orderNumberIndex !== -1 ? columns[orderNumberIndex] : '';
        const dateStr = columns[dateIndex];
        
        // Parser les nombres en gérant les valeurs vides
        const quantity = columns[quantityIndex] ? parseFloat(columns[quantityIndex].replace(/[^\d.-]/g, '')) : 0;
        const salePrice = columns[salePriceIndex] ? parseFloat(columns[salePriceIndex].replace(/[^\d.-]/g, '')) : 0;
        const purchasePrice = columns[purchasePriceIndex] ? parseFloat(columns[purchasePriceIndex].replace(/[^\d.-]/g, '')) : 0;
        
        // Traiter les remises et cagnottes
        let discount = 0;
        let cashback = 0;
        
        if (discountIndex !== -1 && columns[discountIndex]) {
          discount = parseFloat(columns[discountIndex].replace(/[^\d.-]/g, '')) || 0;
        }
        
        if (cashbackIndex !== -1 && columns[cashbackIndex]) {
          cashback = parseFloat(columns[cashbackIndex].replace(/[^\d.-]/g, '')) || 0;
        }

        // Valider les données
        if (quantity <= 0 || salePrice <= 0 || purchasePrice < 0) {
          errorCount++;
          continue;
        }

        // Valider et parser la date
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          // Essayer de parser différents formats de date
          const altFormats = [
            dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'), // DD/MM/YYYY -> YYYY-MM-DD
            dateStr.replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3')   // YYYY/MM/DD -> YYYY-MM-DD
          ];
          
          const altDate = new Date(altFormats.find(f => !isNaN(new Date(f).getTime())) || dateStr);
          if (isNaN(altDate.getTime())) {
            console.warn(`Ligne ${i + 1}: Date invalide "${dateStr}"`);
            errorCount++;
          continue;
          }
          parsedDate = altDate;
        }
        const dateToUse = parsedDate.toISOString().split('T')[0];

        // Calculer le chiffre d'affaires et les coûts pour cette ligne
        const lineRevenue = (quantity * salePrice) - discount;
        const lineCosts = (quantity * purchasePrice) + cashback;

        // Agrégation par date (pour financial_data)
        if (!ordersByDate.has(dateToUse)) {
          ordersByDate.set(dateToUse, { revenue: 0, costs: 0, orders: new Set() });
        }
        
        const dayData = ordersByDate.get(dateToUse);
        dayData.revenue += lineRevenue;
        dayData.costs += lineCosts;
        if (orderNumber) {
          dayData.orders.add(orderNumber);
        }

        // Agrégation par canal et date (pour les statistiques)
        if (!channelDataByDate.has(dateToUse)) {
          channelDataByDate.set(dateToUse, new Map());
        }
        
        const dateChannels = channelDataByDate.get(dateToUse);
        if (!dateChannels.has(channel)) {
          dateChannels.set(channel, { revenue: 0, costs: 0, orders: new Set() });
        }
        
        const channelData = dateChannels.get(channel);
        channelData.revenue += lineRevenue;
        channelData.costs += lineCosts;
        if (orderNumber) {
          channelData.orders.add(orderNumber);
        }
        
        successCount++;
      } catch (error) {
        console.warn(`Erreur ligne ${i + 1}:`, error);
        errorCount++;
      }
    }

    // Convertir les données agrégées pour insertion dans financial_data
    ordersByDate.forEach((data, date) => {
      dataToInsert.push({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        costs: Math.round(data.costs * 100) / 100
      });
    });

    if (dataToInsert.length === 0) {
      throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
    }

    // Insérer les données financières globales
    const { error: insertError } = await supabase
      .from('financial_data')
      .upsert(dataToInsert, { 
        onConflict: 'date',
        ignoreDuplicates: false 
      });

    if (insertError) {
      throw new Error(`Erreur insertion financial_data: ${insertError.message}`);
    }

    // Sauvegarder les données par canal dans user_settings pour les statistiques
    const channelStats = {};
    channelDataByDate.forEach((channels, date) => {
      channels.forEach((data, channel) => {
        if (!channelStats[channel]) {
          channelStats[channel] = { revenue: 0, costs: 0, orders: 0, dates: [] };
        }
        channelStats[channel].revenue += data.revenue;
        channelStats[channel].costs += data.costs;
        channelStats[channel].orders += data.orders.size;
        channelStats[channel].dates.push(date);
      });
    });

    // Sauvegarder les statistiques par canal
    await supabase
      .from('user_settings')
      .upsert({
        setting_key: 'channel_statistics',
        setting_value: {
          channels: channelStats,
          last_update: new Date().toISOString(),
          total_channels: Object.keys(channelStats).length
        }
      }, {
        onConflict: 'user_id,setting_key'
      });

    // Mettre à jour la configuration avec la dernière date d'import
    const updatedConfig = {
      ...config,
      last_import: new Date().toISOString(),
      import_count: (config.import_count || 0) + 1
    };

    await supabase
      .from('user_settings')
      .update({ setting_value: updatedConfig })
      .eq('setting_key', 'daily_csv_import');

    const result = {
      success: true,
      message: `Import réussi: ${successCount} lignes traitées, ${Object.keys(channelStats).length} canaux détectés`,
      stats: {
        imported: successCount,
        errors: errorCount,
        total: lines.length - 1,
        channels: Object.keys(channelStats),
        channel_breakdown: channelStats,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Import quotidien terminé:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur import quotidien:', error);
    
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