import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL;

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseServer();

  // Trigger n8n sync
  if (body.trigger === "n8n-sync") {
    if (!N8N_BASE) {
      return NextResponse.json({ error: "n8n webhook URL not configured" }, { status: 500 });
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
      return NextResponse.json({ error: "Failed to reach n8n. Check webhook URL." }, { status: 500 });
    }
  }

  // Get CSV content — either inline or from URL
  let content: string;
  if (body.url) {
    try {
      const res = await fetch(body.url);
      if (!res.ok) return NextResponse.json({ error: `Failed to fetch CSV: HTTP ${res.status}` }, { status: 500 });
      content = await res.text();
    } catch (err) {
      return NextResponse.json({ error: `Failed to fetch URL: ${err}` }, { status: 500 });
    }
  } else if (body.content && typeof body.content === "string") {
    content = body.content;
  } else {
    return NextResponse.json({ error: "CSV content or URL required" }, { status: 400 });
  }

  const filename = body.filename ?? "unknown.csv";

  try {
    const lines = content.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have header + at least 1 row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line: string) => {
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
        row[h] = values[i]?.trim().replace(/"/g, "") ?? "";
      });
      return row;
    });

    // Extract unique players
    const playerMap = new Map<string, { name: string; country: string; hand: string }>();

    for (const row of rows) {
      const winnerName = row.winner_name;
      const loserName = row.loser_name;
      const winnerCountry = row.winner_ioc || "";
      const loserCountry = row.loser_ioc || "";
      const winnerHand = row.winner_hand || "R";
      const loserHand = row.loser_hand || "R";
      const winnerId = row.winner_id || "";
      const loserId = row.loser_id || "";

      if (winnerId && winnerName) playerMap.set(winnerId, { name: winnerName, country: winnerCountry, hand: winnerHand });
      if (loserId && loserName) playerMap.set(loserId, { name: loserName, country: loserCountry, hand: loserHand });
    }

    // Upsert players in batches
    let playerCount = 0;
    const playerEntries = Array.from(playerMap.entries());
    for (let i = 0; i < playerEntries.length; i += 50) {
      const batch = playerEntries.slice(i, i + 50).map(([id, p]) => ({
        id, name: p.name, country_code: p.country, hand: p.hand === "L" ? "L" : "R",
      }));
      const { error } = await supabase.from("players").upsert(batch, { onConflict: "id" });
      if (!error) playerCount += batch.length;
    }

    // Upsert matches in batches
    let matchCount = 0;
    const matchBatch: Record<string, unknown>[] = [];
    let skippedRows = 0;
    for (const row of rows) {
      if (!row.winner_id || !row.loser_id) { skippedRows++; continue; }
      matchBatch.push({
        id: row.match_num && row.tourney_id ? `${row.tourney_id}-${row.match_num}` : `csv-${matchCount}-${Math.random().toString(36).slice(2, 8)}`,
        tourney_name: row.tourney_name || "",
        surface: row.surface || "",
        tourney_date: row.tourney_date || "",
        round: row.round || "",
        player1_id: row.winner_id,
        player2_id: row.loser_id,
        winner_id: row.winner_id,
        score: row.score || "",
        minutes: parseInt(row.minutes) || null,
        p1_ace: parseInt(row.w_ace) || 0, p1_df: parseInt(row.w_df) || 0,
        p1_svpt: parseInt(row.w_svpt) || 0, p1_1stIn: parseInt(row.w_1stIn) || 0,
        p1_1stWon: parseInt(row.w_1stWon) || 0, p1_2ndWon: parseInt(row.w_2ndWon) || 0,
        p1_SvGms: parseInt(row.w_SvGms) || 0, p1_bpSaved: parseInt(row.w_bpSaved) || 0,
        p1_bpFaced: parseInt(row.w_bpFaced) || 0,
        p2_ace: parseInt(row.l_ace) || 0, p2_df: parseInt(row.l_df) || 0,
        p2_svpt: parseInt(row.l_svpt) || 0, p2_1stIn: parseInt(row.l_1stIn) || 0,
        p2_1stWon: parseInt(row.l_1stWon) || 0, p2_2ndWon: parseInt(row.l_2ndWon) || 0,
        p2_SvGms: parseInt(row.l_SvGms) || 0, p2_bpSaved: parseInt(row.l_bpSaved) || 0,
        p2_bpFaced: parseInt(row.l_bpFaced) || 0,
      });
      if (matchBatch.length >= 50) {
        const { error } = await supabase.from("matches").upsert(matchBatch, { onConflict: "id" });
        if (!error) matchCount += matchBatch.length;
        matchBatch.length = 0;
      }
    }
    if (matchBatch.length > 0) {
      const { error } = await supabase.from("matches").upsert(matchBatch, { onConflict: "id" });
      if (error) console.error("Match upsert error:", error.message, error.details);
      if (!error) matchCount += matchBatch.length;
    }

    return NextResponse.json({
      success: true,
      count: `${playerCount} players, ${matchCount} matches`,
      message: `Imported ${playerCount} players and ${matchCount} matches from ${filename}`,
      debug: { totalRows: rows.length, skippedRows, matchCount },
    });
  } catch (err) {
    return NextResponse.json({ error: `Failed to parse CSV: ${err}` }, { status: 500 });
  }
}
