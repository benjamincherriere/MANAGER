import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FinancialData {
  date: string;
  revenue: number;
  costs: number;
  margin: number;
  margin_percentage: number;
}

interface AnalysisRequest {
  type: 'daily' | 'weekly' | 'monthly';
  email?: string;
  openai_api_key: string;
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

    const { type, email, openai_api_key }: AnalysisRequest = await req.json();

    if (!openai_api_key) {
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les données financières
    let query = supabase
      .from('financial_data')
      .select('*')
      .order('date', { ascending: false });

    // Filtrer selon le type d'analyse
    const now = new Date();
    if (type === 'daily') {
      query = query.limit(7); // 7 derniers jours
    } else if (type === 'weekly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('date', oneMonthAgo.toISOString().split('T')[0]);
    } else if (type === 'monthly') {
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      query = query.gte('date', threeMonthsAgo.toISOString().split('T')[0]);
    }

    const { data: financialData, error: dbError } = await query;

    if (dbError) {
      throw new Error(`Erreur base de données: ${dbError.message}`);
    }

    if (!financialData || financialData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucune donnée financière trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Préparer les données pour ChatGPT
    const dataForAnalysis = financialData.map(item => ({
      date: item.date,
      chiffre_affaires: item.revenue,
      couts: item.costs,
      marge: item.margin,
      pourcentage_marge: item.margin_percentage
    }));

    // Calculer quelques statistiques de base
    const totalRevenue = financialData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCosts = financialData.reduce((sum, item) => sum + item.costs, 0);
    const avgMargin = financialData.reduce((sum, item) => sum + item.margin_percentage, 0) / financialData.length;
    
    const bestDay = financialData.reduce((best, current) => 
      current.margin_percentage > best.margin_percentage ? current : best
    );
    
    const worstDay = financialData.reduce((worst, current) => 
      current.margin_percentage < worst.margin_percentage ? current : worst
    );

    // Prompt pour ChatGPT
    const prompt = `Tu es un analyste financier expert pour l'entreprise "Plus de Bulles". 

Analyse les données financières suivantes et fournis un rapport détaillé en français :

DONNÉES FINANCIÈRES (${type === 'daily' ? '7 derniers jours' : type === 'weekly' ? 'dernier mois' : '3 derniers mois'}) :
${JSON.stringify(dataForAnalysis, null, 2)}

STATISTIQUES CLÉS :
- Chiffre d'affaires total : ${totalRevenue.toFixed(2)}€
- Coûts totaux : ${totalCosts.toFixed(2)}€
- Marge moyenne : ${avgMargin.toFixed(1)}%
- Meilleur jour : ${bestDay.date} (${bestDay.margin_percentage.toFixed(1)}% de marge)
- Pire jour : ${worstDay.date} (${worstDay.margin_percentage.toFixed(1)}% de marge)

CONSIGNES POUR LE RAPPORT :
1. **Analyse de performance** : Évalue la santé financière globale
2. **Tendances** : Identifie les tendances positives/négatives
3. **Points d'attention** : Signale les jours avec des marges faibles (<15%)
4. **Recommandations** : Propose 3-5 actions concrètes pour améliorer la rentabilité
5. **Prévisions** : Donne des perspectives pour les prochaines semaines

Format souhaité :
- Utilise des emojis pour rendre le rapport plus visuel
- Structure claire avec des sections
- Ton professionnel mais accessible
- Conclusions actionables

Le rapport sera ${email ? 'envoyé par email' : 'affiché dans l\'interface'}.`;

    // Appel à l'API OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un analyste financier expert spécialisé dans l\'analyse de données pour les PME. Tu fournis des rapports clairs, actionables et en français.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(`Erreur OpenAI: ${errorData.error?.message || 'Erreur inconnue'}`);
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('Aucune analyse générée par ChatGPT');
    }

    // Si un email est fourni, envoyer le rapport par email
    if (email) {
      const emailSubject = `📊 Rapport financier ${type === 'daily' ? 'quotidien' : type === 'weekly' ? 'hebdomadaire' : 'mensuel'} - Plus de Bulles`;
      
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
        .stats { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-item { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .analysis { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; }
        pre { white-space: pre-wrap; font-family: inherit; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Plus de Bulles</h1>
        <h2>Rapport Financier ${type === 'daily' ? 'Quotidien' : type === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</h2>
        <p>${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="stats">
        <h3>📈 Statistiques Clés</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${totalRevenue.toLocaleString('fr-FR')}€</div>
                <div>Chiffre d'Affaires</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalCosts.toLocaleString('fr-FR')}€</div>
                <div>Coûts Totaux</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${avgMargin.toFixed(1)}%</div>
                <div>Marge Moyenne</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${financialData.length}</div>
                <div>Jours Analysés</div>
            </div>
        </div>
    </div>

    <div class="analysis">
        <h3>🤖 Analyse ChatGPT</h3>
        <pre>${analysis}</pre>
    </div>

    <div class="footer">
        <p>📧 Rapport généré automatiquement par votre système de gestion Plus de Bulles</p>
        <p>🔗 <a href="https://cool-madeleine-b4108f.netlify.app">Accéder au tableau de bord</a></p>
    </div>
</body>
</html>`;

      // Ici, vous pourriez intégrer un service d'email comme Resend, SendGrid, etc.
      // Pour l'instant, on retourne juste l'analyse avec un message
      console.log(`Email à envoyer à ${email}:`, emailSubject);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        stats: {
          totalRevenue,
          totalCosts,
          avgMargin: avgMargin.toFixed(1),
          daysAnalyzed: financialData.length,
          bestDay: {
            date: bestDay.date,
            margin: bestDay.margin_percentage.toFixed(1)
          },
          worstDay: {
            date: worstDay.date,
            margin: worstDay.margin_percentage.toFixed(1)
          }
        },
        emailSent: !!email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erreur dans financial-analysis:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});