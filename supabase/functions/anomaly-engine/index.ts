import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-id',
};

// EWMA (Exponentially Weighted Moving Average)
const ALPHA = 0.3;

// Z-Score threshold for anomaly detection
const Z_THRESHOLD = 3;

// Rate-based threshold multiplier
const RATE_MULTIPLIER = 3;

interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;
  anomaly_type: string;
  details: Record<string, any>;
}

function computeEWMA(newValue: number, oldEWMA: number): number {
  return ALPHA * newValue + (1 - ALPHA) * oldEWMA;
}

function computeZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

function updateRunningStats(
  oldMean: number,
  oldStd: number,
  newValue: number,
  sampleCount: number
): { mean: number; std: number } {
  // Welford's algorithm for running mean and variance
  const n = sampleCount + 1;
  const delta = newValue - oldMean;
  const newMean = oldMean + delta / n;
  
  // Update variance using Welford's method
  const delta2 = newValue - newMean;
  const M2 = oldStd * oldStd * sampleCount + delta * delta2;
  const newVariance = n > 1 ? M2 / (n - 1) : 0;
  
  return { mean: newMean, std: Math.sqrt(newVariance) };
}

async function detectAnomalies(
  supabase: any,
  agentId: string,
  metricName: string,
  value: number
): Promise<AnomalyResult> {
  // Get or create baseline
  const { data: baseline } = await supabase
    .from('anomaly_baselines')
    .select('*')
    .eq('agent_id', agentId)
    .eq('metric_name', metricName)
    .maybeSingle();

  let isAnomaly = false;
  let anomalyScore = 0;
  let anomalyType = 'none';
  const details: Record<string, any> = {};

  if (baseline) {
    // Compute Z-Score
    const zScore = computeZScore(value, baseline.mean_value, baseline.std_value);
    details.z_score = zScore;
    details.ewma = baseline.ewma_value;
    details.mean = baseline.mean_value;
    details.std = baseline.std_value;

    // Check for Z-Score anomaly
    if (Math.abs(zScore) > Z_THRESHOLD) {
      isAnomaly = true;
      anomalyType = 'z_score_violation';
      anomalyScore = Math.min(100, Math.abs(zScore) * 20);
    }

    // Check for rate-based anomaly
    if (value > baseline.mean_value * RATE_MULTIPLIER && baseline.sample_count > 10) {
      isAnomaly = true;
      anomalyType = 'rate_spike';
      anomalyScore = Math.max(anomalyScore, Math.min(100, (value / baseline.mean_value) * 25));
    }

    // Update baseline with new data
    const newEWMA = computeEWMA(value, baseline.ewma_value);
    const { mean: newMean, std: newStd } = updateRunningStats(
      baseline.mean_value,
      baseline.std_value,
      value,
      baseline.sample_count
    );

    await supabase
      .from('anomaly_baselines')
      .update({
        ewma_value: newEWMA,
        mean_value: newMean,
        std_value: newStd,
        sample_count: baseline.sample_count + 1,
        last_updated: new Date().toISOString(),
      })
      .eq('id', baseline.id);
  } else {
    // Create new baseline
    await supabase
      .from('anomaly_baselines')
      .insert({
        agent_id: agentId,
        metric_name: metricName,
        ewma_value: value,
        mean_value: value,
        std_value: 1,
        sample_count: 1,
      });
    
    details.baseline_created = true;
  }

  return { is_anomaly: isAnomaly, anomaly_score: anomalyScore, anomaly_type: anomalyType, details };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agent_id, metrics } = await req.json();

    if (!agent_id || !metrics) {
      return new Response(
        JSON.stringify({ error: 'agent_id and metrics required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SNSM] Anomaly detection for agent: ${agent_id}`);

    const results: Record<string, AnomalyResult> = {};
    let totalAnomalyScore = 0;
    let anomalyCount = 0;

    // Analyze each metric
    for (const [metricName, value] of Object.entries(metrics)) {
      if (typeof value === 'number') {
        const result = await detectAnomalies(supabase, agent_id, metricName, value);
        results[metricName] = result;
        
        if (result.is_anomaly) {
          anomalyCount++;
          totalAnomalyScore += result.anomaly_score;
        }
      }
    }

    // If anomalies detected, update threat scores
    if (anomalyCount > 0) {
      const avgAnomalyScore = totalAnomalyScore / anomalyCount;
      
      // Create an alert for significant anomalies
      if (avgAnomalyScore >= 50) {
        await supabase
          .from('alerts')
          .insert({
            agent_id,
            src_ip: metrics.ip || '0.0.0.0',
            dst_ip: '0.0.0.0',
            severity: avgAnomalyScore >= 70 ? 'high' : 'medium',
            category: 'Statistical Anomaly',
            signature_name: `Anomaly detected: ${Object.keys(results).filter(k => results[k].is_anomaly).join(', ')}`,
            threat_score: avgAnomalyScore,
            event_type: 'anomaly',
            raw_data: results,
          });
      }

      console.log(`[SNSM] Detected ${anomalyCount} anomalies with avg score ${avgAnomalyScore.toFixed(1)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        agent_id,
        anomaly_count: anomalyCount,
        total_score: totalAnomalyScore,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[SNSM] Anomaly engine exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
