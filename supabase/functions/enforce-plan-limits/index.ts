// Edge Function para enforcement automatico de limites de plano
// Busca subscriptions com grace period expirado e aplica limites do plano free
//
// Deploy: npx supabase functions deploy enforce-plan-limits --no-verify-jwt --project-ref jyjkeqnmofzjnzpvkugl
//
// Pode ser chamada via:
// 1. Cron job (pg_cron ou servico externo) - recomendado: diario
// 2. Manualmente via curl com service_role key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[enforce-plan-limits] Starting enforcement check');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar subscriptions com grace period expirado e ainda nao downgradadas
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, company_id, plan_id, grace_period_ends_at')
      .eq('status', 'overdue')
      .is('downgraded_at', null)
      .not('grace_period_ends_at', 'is', null)
      .lt('grace_period_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('[enforce-plan-limits] Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      console.log('[enforce-plan-limits] No subscriptions to enforce');
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions to enforce', enforced: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enforce-plan-limits] Found ${expiredSubscriptions.length} subscription(s) to enforce`);

    const results = [];

    for (const sub of expiredSubscriptions) {
      try {
        // Chamar a funcao SQL de enforcement
        const { data, error } = await supabase.rpc('enforce_free_plan_limits', {
          target_company_id: sub.company_id,
        });

        if (error) {
          console.error(`[enforce-plan-limits] Error enforcing for company ${sub.company_id}:`, error);
          results.push({ company_id: sub.company_id, error: error.message });
        } else {
          console.log(`[enforce-plan-limits] Enforced for company ${sub.company_id}:`, data);
          results.push(data);
        }
      } catch (err) {
        console.error(`[enforce-plan-limits] Exception for company ${sub.company_id}:`, err);
        results.push({ company_id: sub.company_id, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, enforced: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[enforce-plan-limits] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
