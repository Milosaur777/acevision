import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const CSV_URLS = [
  { year: 2026, url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2026.csv" },
  { year: 2025, url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2025.csv" },
  { year: 2024, url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2024.csv" },
  { year: 2023, url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2023.csv" },
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST() {
  const supabase = getSupabaseServer();

  let totalUpdated = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const details: { match: string; status: string }[] = [];

  for (const csvSource of CSV_URLS) {
    try {
      const res = await fetch(csvSource.url);
      if (!res.ok) continue;

      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) continue;

      const headers = parseCsvLine(lines[0]);
      const headerMap = new Map<string, number>();
      headers.forEach((h, i) => headerMap.set(h.toLowerCase(), i));

      // Get existing players for ID mapping
      const { data: players } = await supabase
        .from("players")
        .select("id, name");
      const playerNameMap = new Map<string, string>();
      players?.forEach((p) => {
        playerNameMap.set(p.name.toLowerCase(), p.id);
      });

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 10) continue;

        const winnerName = cols[headerMap.get("winner_name") ?? -1] || "";
        const loserName = cols[headerMap.get("loser_name") ?? -1] || "";
        const tourneyName = cols[headerMap.get("tourney_name") ?? -1] || "";
        const tourneyDate = cols[headerMap.get("tourney_date") ?? -1] || "";
        const round = cols[headerMap.get("round") ?? -1] || "";
        const surface = cols[headerMap.get("surface") ?? -1] || "Hard";

        if (!winnerName || !loserName) {
          totalSkipped++;
          continue;
        }

        // Map winner/loser to player IDs
        const winnerId = playerNameMap.get(winnerName.toLowerCase()) || null;
        const loserId = playerNameMap.get(loserName.toLowerCase()) || null;

        if (!winnerId || !loserId) {
          totalSkipped++;
          continue;
        }

        // Determine player1/player2 (winner is p1 for convention)
        const p1Id = winnerId;
        const p2Id = loserId;

        // Check if match already exists with full stats
        const { data: existing } = await supabase
          .from("matches")
          .select("id, p1_svpt")
          .eq("tourney_name", tourneyName)
          .eq("tourney_date", tourneyDate)
          .eq("round", round)
          .or(`player1_id.eq.${p1Id},player1_id.eq.${p2Id}`)
          .or(`player2_id.eq.${p1Id},player2_id.eq.${p2Id}`)
          .limit(1);

        if (existing && existing.length > 0 && existing[0].p1_svpt > 0) {
          totalSkipped++;
          continue;
        }

        // Parse stats
        const parseIntOr = (val: string) => parseInt(val) || 0;
        const parseFloatOr = (val: string) => parseFloat(val) || 0;

        const score = cols[headerMap.get("score") ?? -1] || "";
        const minutes = parseIntOr(cols[headerMap.get("minutes") ?? -1]);

        // Winner stats (mapped to player1 position)
        const w_ace = parseIntOr(cols[headerMap.get("w_ace") ?? -1]);
        const w_df = parseIntOr(cols[headerMap.get("w_df") ?? -1]);
        const w_svpt = parseIntOr(cols[headerMap.get("w_svpt") ?? -1]);
        const w_1stIn = parseIntOr(cols[headerMap.get("w_1stIn") ?? -1]);
        const w_1stWon = parseIntOr(cols[headerMap.get("w_1stWon") ?? -1]);
        const w_2ndWon = parseIntOr(cols[headerMap.get("w_2ndWon") ?? -1]);
        const w_SvGms = parseIntOr(cols[headerMap.get("w_SvGms") ?? -1]);
        const w_bpSaved = parseIntOr(cols[headerMap.get("w_bpSaved") ?? -1]);
        const w_bpFaced = parseIntOr(cols[headerMap.get("w_bpFaced") ?? -1]);

        // Loser stats (mapped to player2 position)
        const l_ace = parseIntOr(cols[headerMap.get("l_ace") ?? -1]);
        const l_df = parseIntOr(cols[headerMap.get("l_df") ?? -1]);
        const l_svpt = parseIntOr(cols[headerMap.get("l_svpt") ?? -1]);
        const l_1stIn = parseIntOr(cols[headerMap.get("l_1stIn") ?? -1]);
        const l_1stWon = parseIntOr(cols[headerMap.get("l_1stWon") ?? -1]);
        const l_2ndWon = parseIntOr(cols[headerMap.get("l_2ndWon") ?? -1]);
        const l_SvGms = parseIntOr(cols[headerMap.get("l_SvGms") ?? -1]);
        const l_bpSaved = parseIntOr(cols[headerMap.get("l_bpSaved") ?? -1]);
        const l_bpFaced = parseIntOr(cols[headerMap.get("l_bpFaced") ?? -1]);

        // Update existing or insert new
        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("matches")
            .update({
              winner_id: winnerId,
              score,
              minutes,
              p1_ace: w_ace,
              p1_df: w_df,
              p1_svpt: w_svpt,
              p1_1stIn: w_1stIn,
              p1_1stWon: w_1stWon,
              p1_2ndWon: w_2ndWon,
              p1_SvGms: w_SvGms,
              p1_bpSaved: w_bpSaved,
              p1_bpFaced: w_bpFaced,
              p2_ace: l_ace,
              p2_df: l_df,
              p2_svpt: l_svpt,
              p2_1stIn: l_1stIn,
              p2_1stWon: l_1stWon,
              p2_2ndWon: l_2ndWon,
              p2_SvGms: l_SvGms,
              p2_bpSaved: l_bpSaved,
              p2_bpFaced: l_bpFaced,
            })
            .eq("id", existing[0].id);

          if (!error) {
            totalUpdated++;
            details.push({
              match: `${winnerName} d. ${loserName}`,
              status: "Updated stats",
            });
          }
        } else {
          const matchId = `sackmann-${csvSource.year}-${i}-${Date.now()}`;
          const { error } = await supabase.from("matches").insert({
            id: matchId,
            tourney_name: tourneyName,
            surface,
            tourney_date: tourneyDate,
            round,
            player1_id: p1Id,
            player2_id: p2Id,
            winner_id: winnerId,
            score,
            minutes,
            p1_ace: w_ace,
            p1_df: w_df,
            p1_svpt: w_svpt,
            p1_1stIn: w_1stIn,
            p1_1stWon: w_1stWon,
            p1_2ndWon: w_2ndWon,
            p1_SvGms: w_SvGms,
            p1_bpSaved: w_bpSaved,
            p1_bpFaced: w_bpFaced,
            p2_ace: l_ace,
            p2_df: l_df,
            p2_svpt: l_svpt,
            p2_1stIn: l_1stIn,
            p2_1stWon: l_1stWon,
            p2_2ndWon: l_2ndWon,
            p2_SvGms: l_SvGms,
            p2_bpSaved: l_bpSaved,
            p2_bpFaced: l_bpFaced,
          });

          if (!error) {
            totalInserted++;
            details.push({
              match: `${winnerName} d. ${loserName}`,
              status: "Inserted",
            });
          }
        }
      }
    } catch {
      // CSV fetch failed for this year, continue with others
    }
  }

  return NextResponse.json({
    message: `Refresh complete: ${totalUpdated} updated, ${totalInserted} inserted, ${totalSkipped} skipped`,
    updated: totalUpdated,
    inserted: totalInserted,
    skipped: totalSkipped,
    details: details.slice(0, 50),
  });
}
