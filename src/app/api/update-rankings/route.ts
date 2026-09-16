import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const CSV_URL = "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2026.csv";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

export async function POST() {
  const supabase = getSupabaseServer();

  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch CSV" }, { status: 500 });

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "CSV empty" }, { status: 500 });

    const headers = parseCsvLine(lines[0]);
    const headerMap = new Map<string, number>();
    headers.forEach((h, i) => headerMap.set(h.toLowerCase(), i));

    // Extract LATEST ranking for each player from CSV (iterate in reverse)
    const playerRankings = new Map<string, number>();

    for (let i = lines.length - 1; i >= 1; i--) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 10) continue;

      const winnerName = cols[headerMap.get("winner_name") ?? -1] || "";
      const loserName = cols[headerMap.get("loser_name") ?? -1] || "";
      const winnerRank = parseInt(cols[headerMap.get("winner_rank") ?? -1]) || 0;
      const loserRank = parseInt(cols[headerMap.get("loser_rank") ?? -1]) || 0;

      if (winnerName && winnerRank > 0 && !playerRankings.has(winnerName.toLowerCase())) {
        playerRankings.set(winnerName.toLowerCase(), winnerRank);
      }
      if (loserName && loserRank > 0 && !playerRankings.has(loserName.toLowerCase())) {
        playerRankings.set(loserName.toLowerCase(), loserRank);
      }
    }

    // Get all players for matching
    const { data: players } = await supabase.from("players").select("id, name");
    let updatedCount = 0;

    for (const [name, ranking] of playerRankings) {
      const match = players?.find((p) => p.name.toLowerCase() === name);
      if (match) {
        await supabase.from("players").update({ ranking }).eq("id", match.id);
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Rankings updated: ${updatedCount} players from Sackmann CSV`,
      updated: updatedCount,
      total_rankings: playerRankings.size,
    });
  } catch (error) {
    return NextResponse.json({ error: "Update failed", details: (error as Error).message }, { status: 500 });
  }
}
