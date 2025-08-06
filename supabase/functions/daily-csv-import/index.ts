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
    
    // Détecter le format du CSV
    const isOrderFormat = headers.some(h => 
      h.includes('commande') || h.includes('quantit') || h.includes('prix de vente') || h.includes('prix d\'achat')
    );
    
    // Détecter les colonnes de remises et cagnottes
    const discountIndex = headers.findIndex(h => 
      h.includes('remise') || h.includes('reduction') || h.includes('discount')
    );
    const cashbackIndex = headers.findIndex(h => 
      h.includes('cagnotte') || h.includes('cashback') || h.includes('fidelite')
    );
    
    const dataToInsert = [];
    let successCount = 0;
    let errorCount = 0;

    if (isOrderFormat) {
      // Format commandes : calculer les totaux par jour
      const ordersByDate = new Map();
      
      const dateIndex = headers.findIndex(h => h.includes('date'));
      const quantityIndex = headers.findIndex(h => h.includes('quantit'));
      const salePriceIndex = headers.findIndex(h => h.includes('prix de vente'));
      const purchasePriceIndex = headers.findIndex(h => h.includes('prix d\'achat') || h.includes('prix d\'achat'));
      
      if (quantityIndex === -1 || salePriceIndex === -1 || purchasePriceIndex === -1) {
        throw new Error('Colonnes manquantes pour le format commandes. Colonnes requises: quantité, prix de vente, prix d\'achat');
      }

      for (let i = 1; i < lines.length; i++) {
        try {
          const columns = lines[i].split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
          
          if (columns.length < headers.length) continue;

          const quantity = parseFloat(columns[quantityIndex]) || 0;
          const salePrice = parseFloat(columns[salePriceIndex]) || 0;
          const purchasePrice = parseFloat(columns[purchasePriceIndex]) || 0;
          
          // Traiter les remises et cagnottes
          let discount = 0;
          let cashback = 0;
          
          if (discountIndex !== -1 && columns[discountIndex]) {
            discount = parseFloat(columns[discountIndex].replace(/[^\d.-]/g, '')) || 0;
          }
          
          if (cashbackIndex !== -1 && columns[cashbackIndex]) {
            cashback = parseFloat(columns[cashbackIndex].replace(/[^\d.-]/g, '')) || 0;
          }

          if (quantity <= 0 || salePrice <= 0 || purchasePrice <= 0) {
            errorCount++;
            continue;
          }

          // Calculer le chiffre d'affaires en déduisant les remises
          const lineRevenue = (quantity * salePrice) - discount;
          const lineCosts = quantity * purchasePrice;
          
          // Ajouter les cagnottes aux coûts (car c'est un coût pour l'entreprise)
          const totalLineCosts = lineCosts + cashback;

          // Utiliser la date de la colonne ou la date du jour
          let dateToUse;
          if (dateIndex !== -1 && columns[dateIndex]) {
            const parsedDate = new Date(columns[dateIndex]);
            if (!isNaN(parsedDate.getTime())) {
              dateToUse = parsedDate.toISOString().split('T')[0];
            } else {
              console.warn(`Ligne ${i + 1}: Date invalide "${columns[dateIndex]}", utilisation de la date du jour`);
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
          dayData.costs += totalLineCosts;
          
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
      const dateIndex = headers.findIndex(h => h.includes('date'));
      const revenueIndex = headers.findIndex(h => 
        h.includes('revenue') || h.includes('chiffre') || h.includes('ca')
      );
      const costsIndex = headers.findIndex(h => 
        h.includes('costs') || h.includes('cout') || h.includes('charge')
      );
      
      // Colonnes optionnelles pour remises et cagnottes
      const discountIndex = headers.findIndex(h => 
        h.includes('remise') || h.includes('reduction') || h.includes('discount')
      );
      const cashbackIndex = headers.findIndex(h => 
        h.includes('cagnotte') || h.includes('cashback') || h.includes('fidelite')
      );

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
          
          // Traiter les remises et cagnottes si présentes
          let discount = 0;
          let cashback = 0;
          
          if (discountIndex !== -1 && columns[discountIndex]) {
            discount = parseFloat(columns[discountIndex].replace(/[^\d.-]/g, '')) || 0;
          }
          
          if (cashbackIndex !== -1 && columns[cashbackIndex]) {
            cashback = parseFloat(columns[cashbackIndex].replace(/[^\d.-]/g, '')) || 0;
          }

          if (isNaN(revenue) || isNaN(costs) || revenue < 0 || costs < 0) {
            console.warn(`Ligne ${i + 1}: Montants invalides`);
            errorCount++;
            continue;
          }
          
          // Ajuster les montants avec remises et cagnottes
          const adjustedRevenue = revenue - discount;
          const adjustedCosts = costs + cashback;

          dataToInsert.push({
            date: date.toISOString().split('T')[0],
            revenue: Math.max(0, adjustedRevenue), // S'assurer que le CA ne soit pas négatif
            costs: adjustedCosts
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
    const { error: insertError } = await supabase
      .from('financial_data')
      .upsert(dataToInsert, { 
        onConflict: 'date',
        ignoreDuplicates: false 
      });

    if (insertError) {
      throw new Error(`Erreur insertion: ${insertError.message}`);
    }

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
      message: `Import quotidien réussi: ${successCount} lignes importées`,
      stats: {
        imported: successCount,
        errors: errorCount,
        total: lines.length - 1,
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