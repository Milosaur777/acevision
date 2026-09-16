import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

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

  // Try n8n webhook first
  if (N8N_BASE) {
    try {
      const res = await fetch(`${N8N_BASE}/tennis-analysis`, {
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
        // Map predicted winner name to player ID
        const winnerName = data.predicted_winner || data.predicted_winner_name || "";
        const predicted_winner_id = winnerName.toLowerCase().includes(player2.name.toLowerCase()) 
          ? player2_id 
          : player1_id;
        
        const predictionData = {
          player1_id,
          player2_id,
          predicted_winner_id,
          confidence: data.confidence,
          reasoning: data.reasoning,
          tactics_player1: data.tactics_player1,
          tactics_player2: data.tactics_player2,
          surface,
          match_id: body.match_id || null,
          ai_model: "n8n-gemini-flash",
        };
        
        await supabase.from("predictions").insert(predictionData);
        return NextResponse.json({ ...data, predicted_winner_id });
      }
    } catch {
      // n8n unavailable, fall through to direct OpenRouter
    }
  }

  // Fallback: call OpenRouter directly
  if (OPENROUTER_KEY) {
    try {
      const matchCountRes = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true });

      const prompt = `You are a professional tennis analyst AI. Analyze this match and return ONLY valid JSON (no markdown, no code fences).

MATCH: ${player1.name} (${player1.country_code}, ${player1.hand === "L" ? "Left" : "Right"}-handed${player1.height_cm ? `, ${player1.height_cm}cm` : ""}) vs ${player2.name} (${player2.country_code}, ${player2.hand === "L" ? "Left" : "Right"}-handed${player2.height_cm ? `, ${player2.height_cm}cm` : ""})
SURFACE: ${surface ?? "Hard"}
DATABASE: ${matchCountRes.count ?? 0} matches tracked

${player1.play_style ? `PLAYER 1 STYLE: ${player1.play_style}` : ""}
${player1.strengths?.length ? `PLAYER 1 STRENGTHS: ${player1.strengths.join(", ")}` : ""}
${player1.weaknesses?.length ? `PLAYER 1 WEAKNESSES: ${player1.weaknesses.join(", ")}` : ""}
${player1.best_surfaces?.length ? `PLAYER 1 BEST SURFACES: ${player1.best_surfaces.join(", ")}` : ""}

${player2.play_style ? `PLAYER 2 STYLE: ${player2.play_style}` : ""}
${player2.strengths?.length ? `PLAYER 2 STRENGTHS: ${player2.strengths.join(", ")}` : ""}
${player2.weaknesses?.length ? `PLAYER 2 WEAKNESSES: ${player2.weaknesses.join(", ")}` : ""}
${player2.best_surfaces?.length ? `PLAYER 2 BEST SURFACES: ${player2.best_surfaces.join(", ")}` : ""}

${notes1.length ? `PLAYER 1 NOTES:\n${notes1.map((n: { content: string; category: string }) => `- [${n.category}] ${n.content}`).join("\n")}` : ""}
${notes2.length ? `PLAYER 2 NOTES:\n${notes2.map((n: { content: string; category: string }) => `- [${n.category}] ${n.content}`).join("\n")}` : ""}

Return JSON exactly like this:
{
  "predicted_winner_id": "${player1_id}" or "${player2_id}",
  "confidence": 0.0 to 1.0,
  "reasoning": "2-3 sentence analysis",
  "tactics_player1": "2-3 sentences on tactical approach for ${player1.name}",
  "tactics_player2": "2-3 sentences on tactical approach for ${player2.name}"
}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://acevision-prod.vercel.app",
          "X-Title": "AceVision Tennis AI",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Map predicted winner name to player ID
          const winnerName = parsed.predicted_winner || parsed.predicted_winner_name || "";
          const predicted_winner_id = winnerName.toLowerCase().includes(player2.name.toLowerCase()) 
            ? player2_id 
            : player1_id;
          
          const predictionData = {
            player1_id,
            player2_id,
            predicted_winner_id,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            tactics_player1: parsed.tactics_player1,
            tactics_player2: parsed.tactics_player2,
            surface,
            match_id: body.match_id || null,
            ai_model: "gemini-2.0-flash-direct",
          };
          
          await supabase.from("predictions").insert(predictionData);
          return NextResponse.json({ ...parsed, predicted_winner_id });
        }
      }
    } catch {
      // direct call failed
    }
  }

  // Final fallback
  return NextResponse.json({
    predicted_winner_id: player1_id,
    confidence: 0.5,
    reasoning: `${player1.name} vs ${player2.name} on ${surface ?? "Hard"}. AI analysis unavailable.`,
    tactics_player1: "—",
    tactics_player2: "—",
  });
}
