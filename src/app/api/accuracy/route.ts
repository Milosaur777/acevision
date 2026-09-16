import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServer();

  // Get total predictions count
  const { count: totalPredictions } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true });

  // Get resolved predictions (match-linked with known winner)
  const { data: predictions, error: predError } = await supabase
    .from("predictions")
    .select("id, predicted_winner_id, match_id, created_at, confidence")
    .not("match_id", "is", null)
    .not("predicted_winner_id", "is", null)
    .order("created_at", { ascending: true });

  if (predError) {
    console.error("Accuracy API error:", predError);
    return NextResponse.json(
      { accuracy: 0, total_resolved: 0, total_predictions: totalPredictions ?? 0, chart_data: [], error: predError.message },
      { status: 500 }
    );
  }

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({
      accuracy: 0,
      total_resolved: 0,
      total_predictions: totalPredictions ?? 0,
      chart_data: [],
      message: "No resolved predictions yet",
    });
  }

  // Get match winners for those predictions
  const matchIds = predictions.map((p) => p.match_id);
  const { data: matches } = await supabase
    .from("matches")
    .select("id, winner_id")
    .in("id", matchIds)
    .not("winner_id", "is", null);

  const matchMap = new Map(matches?.map((m) => [m.id, m.winner_id]) ?? []);

  // Calculate rolling accuracy
  const chart_data: number[] = [];
  let correctCount = 0;

  predictions.forEach((pred, index) => {
    const actualWinner = matchMap.get(pred.match_id);
    if (!actualWinner) return;
    
    const isCorrect = pred.predicted_winner_id === actualWinner;
    if (isCorrect) correctCount++;
    
    // Rolling accuracy up to this point
    const rollingAccuracy = Math.round((correctCount / (index + 1)) * 100);
    chart_data.push(rollingAccuracy);
  });

  // Last 20 points for the chart
  const recentChart = chart_data.slice(-20);
  
  // Overall accuracy
  const accuracy = predictions.length > 0 ? Math.round((correctCount / predictions.length) * 100) : 0;

  return NextResponse.json({
    accuracy,
    total_resolved: predictions.length,
    total_predictions: totalPredictions ?? 0,
    chart_data: recentChart,
    correct_count: correctCount,
  });
}
