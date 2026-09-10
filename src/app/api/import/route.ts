import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseServer();

  // Trigger n8n sync
  if (body.trigger === "n8n-sync") {
    if (!N8N_BASE) {
      return NextResponse.json(
        { error: "n8n webhook URL not configured" },
        { status: 500 }
      );
    }

    try {
      const res = await fetch(`${N8N_BASE}/tennis-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ success: true, message: data.message ?? "Import triggered" });
      }
      return NextResponse.json({ error: "n8n import failed" }, { status: 500 });
    } catch {
      return NextResponse.json(
        { error: "Failed to reach n8n. Check webhook URL." },
        { status: 500 }
      );
    }
  }

  // Manual CSV import
  const { filename, content } = body;
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "CSV content required" }, { status: 400 });
  }

  try {
    const lines = content.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h: string) => h.trim());
    const rows = lines.slice(1).map((line: string) => {
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
        row[h] = values[i]?.trim() ?? "";
      });
      return row;
    });

    // Extract unique players
    const playerMap = new Map<string, { name: string; country: string; hand: string }>();

    for (const row of rows) {
      const winnerName = row.winner_name || row.w_1stWon;
      const loserName = row.loser_name || row.l_1stWon;
      const winnerCountry = row.winner_ioc || row.winner_country || "";
      const loserCountry = row.loser_ioc || row.loser_country || "";
      const winnerHand = row.winner_hand || "R";
      const loserHand = row.loser_hand || "R";
      const winnerId = row.winner_id || "";
      const loserId = row.loser_id || "";

      if (winnerId && winnerName) {
        playerMap.set(winnerId, {
          name: winnerName,
          country: winnerCountry,
          hand: winnerHand,
        });
      }
      if (loserId && loserName) {
        playerMap.set(loserId, {
          name: loserName,
          country: loserCountry,
          hand: loserHand,
        });
      }
    }

    // Upsert players
    let playerCount = 0;
    for (const [id, player] of playerMap) {
      const { error } = await supabase.from("players").upsert(
        {
          id,
          name: player.name,
          country_code: player.country,
          hand: player.hand === "L" ? "L" : "R",
        },
        { onConflict: "id" }
      );
      if (!error) playerCount++;
    }

    // Upsert matches
    let matchCount = 0;
    for (const row of rows) {
      if (!row.winner_id || !row.loser_id) continue;

      const matchData = {
        id: row.match_num ?? `${row.tourney_id}-${row.match_num ?? Math.random().toString(36).slice(2)}`,
        tourney_name: row.tourney_name || "",
        surface: row.surface || "",
        tourney_date: row.tourney_date || "",
        round: row.round || "",
        player1_id: row.winner_id,
        player2_id: row.loser_id,
        winner_id: row.winner_id,
        score: row.score || "",
        minutes: parseInt(row.minutes) || null,

        p1_ace: parseInt(row.w_ace) || 0,
        p1_df: parseInt(row.w_df) || 0,
        p1_svpt: parseInt(row.w_svpt) || 0,
        p1_1stIn: parseInt(row.w_1stIn) || 0,
        p1_1stWon: parseInt(row.w_1stWon) || 0,
        p1_2ndWon: parseInt(row.w_2ndWon) || 0,
        p1_SvGms: parseInt(row.w_SvGms) || 0,
        p1_bpSaved: parseInt(row.w_bpSaved) || 0,
        p1_bpFaced: parseInt(row.w_bpFaced) || 0,

        p2_ace: parseInt(row.l_ace) || 0,
        p2_df: parseInt(row.l_df) || 0,
        p2_svpt: parseInt(row.l_svpt) || 0,
        p2_1stIn: parseInt(row.l_1stIn) || 0,
        p2_1stWon: parseInt(row.l_1stWon) || 0,
        p2_2ndWon: parseInt(row.l_2ndWon) || 0,
        p2_SvGms: parseInt(row.l_SvGms) || 0,
        p2_bpSaved: parseInt(row.l_bpSaved) || 0,
        p2_bpFaced: parseInt(row.l_bpFaced) || 0,
      };

      const { error } = await supabase.from("matches").upsert(matchData, {
        onConflict: "id",
      });
      if (!error) matchCount++;
    }

    return NextResponse.json({
      success: true,
      count: `${playerCount} players, ${matchCount} matches`,
      message: `Imported ${playerCount} players and ${matchCount} matches from ${filename}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse CSV: ${err}` },
      { status: 500 }
    );
  }
}
