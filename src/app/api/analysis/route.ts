import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST(request: Request) {
  const body = await request.json();
  const { player1_id, player2_id, surface } = body;

  if (!player1_id || !player2_id) {
    return NextResponse.json(
      { error: "Both player1_id and player2_id are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServer();

  // Fetch player data
  const [p1Res, p2Res, notes1Res, notes2Res] = await Promise.all([
    supabase.from("players").select("*").eq("id", player1_id).single(),
    supabase.from("players").select("*").eq("id", player2_id).single(),
    supabase.from("player_notes").select("*").eq("player_id", player1_id),
    supabase.from("player_notes").select("*").eq("player_id", player2_id),
  ]);

  const player1 = p1Res.data;
  const player2 = p2Res.data;
  const notes1 = notes1Res.data ?? [];
  const notes2 = notes2Res.data ?? [];

  if (!player1 || !player2) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Try n8n webhook
  if (N8N_BASE) {
    try {
      const res = await fetch(`${N8N_BASE}/tennis-predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1: { ...player1, notes: notes1 },
          player2: { ...player2, notes: notes2 },
          surface,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Save prediction to DB
        await supabase.from("predictions").insert({
          player1_id,
          player2_id,
          predicted_winner_id: data.predicted_winner_id,
          confidence: data.confidence,
          reasoning: data.reasoning,
          tactics_player1: data.tactics_player1,
          tactics_player2: data.tactics_player2,
          surface,
          ai_model: "gemini-flash",
        });

        return NextResponse.json(data);
      }
    } catch {
      // n8n unavailable, fall through to mock
    }
  }

  // Mock response when n8n is not available
  return NextResponse.json({
    predicted_winner_id: player1_id,
    confidence: 0.5,
    reasoning: `${player1.name} vs ${player2.name} on ${surface ?? "Hard"}. Connect n8n to enable AI-powered predictions.`,
    tactics_player1: "Enable n8n integration for tactical analysis.",
    tactics_player2: "Enable n8n integration for tactical analysis.",
  });
}
