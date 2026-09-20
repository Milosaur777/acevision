import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "tennis-api-atp-wta-itf.p.rapidapi.com";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY not configured" },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServer();
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Find all pending matches (winner_id IS NULL, date <= today)
    const { data: pendingMatches, error: fetchError } = await supabase
      .from("matches")
      .select("*")
      .is("winner_id", null)
      .lte("tourney_date", today)
      .order("tourney_date", { ascending: true })
      .limit(200);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingMatches || pendingMatches.length === 0) {
      return NextResponse.json({
        message: "No pending matches to check",
        checked: 0,
        updated: 0,
        details: [],
      });
    }

    // 2. Get all players for name matching
    const { data: players } = await supabase
      .from("players")
      .select("id, name");

    const playerMap = new Map<string, { id: string; name: string }>();
    players?.forEach((p) => {
      playerMap.set(p.name.toLowerCase(), { id: p.id, name: p.name });
      const lastName = p.name.split(" ").pop()?.toLowerCase();
      if (lastName) playerMap.set(lastName, { id: p.id, name: p.name });
    });

    // 3. Group pending matches by date to minimize API calls
    const dateGroups = new Map<string, typeof pendingMatches>();
    pendingMatches.forEach((m) => {
      const date = m.tourney_date;
      if (!dateGroups.has(date)) dateGroups.set(date, []);
      dateGroups.get(date)!.push(m);
    });

    let updatedCount = 0;
    const details: { match: string; status: string }[] = [];
    const apiCalls: string[] = [];

    // 4. For each date, fetch fixtures and match
    for (const [date, matches] of dateGroups) {
      try {
        // Fetch fixtures for this date (past or today)
        const apiUrl = `https://${API_HOST}/tennis/v2/atp/fixtures/${date}/${date}`;
        apiCalls.push(date);

        const res = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": API_HOST,
          },
        });

        if (!res.ok) {
          details.push({ match: `Date ${date}`, status: `API error ${res.status}` });
          continue;
        }

        const apiData = await res.json();
        const fixtures = apiData.data || apiData.results || apiData || [];

        // 5. For each fixture, try to match against pending matches
        for (const fixture of fixtures) {
          const apiP1Name = fixture.player1?.name?.toLowerCase() || "";
          const apiP2Name = fixture.player2?.name?.toLowerCase() || "";
          const score = fixture.live || fixture.score || "";
          const fixtureDate = fixture.date ? fixture.date.split("T")[0] : date;

          if (!apiP1Name || !apiP2Name) continue;

          // Find matching pending match
          const matchedMatch = matches.find((pm) => {
            const pmP1 = playerMap.get(pm.player1_id)?.name?.toLowerCase() || "";
            const pmP2 = playerMap.get(pm.player2_id)?.name?.toLowerCase() || "";

            // Check if player names match (either order)
            const namesMatch =
              (apiP1Name.includes(pmP1.split(" ").pop() || "") && apiP2Name.includes(pmP2.split(" ").pop() || "")) ||
              (apiP1Name.includes(pmP2.split(" ").pop() || "") && apiP2Name.includes(pmP1.split(" ").pop() || ""));

            return namesMatch && pm.tourney_date === fixtureDate;
          });

          if (matchedMatch && score) {
            // Determine winner from API — player1 is winner in results
            const apiWinnerName = fixture.player1?.name?.toLowerCase() || "";
            const winnerPlayer = playerMap.get(apiWinnerName) ||
              playerMap.get(apiWinnerName.split(" ").pop() || "");

            if (winnerPlayer) {
              // Update the match
              const { error: updateError } = await supabase
                .from("matches")
                .update({
                  winner_id: winnerPlayer.id,
                  score: score,
                })
                .eq("id", matchedMatch.id);

              if (!updateError) {
                updatedCount++;
                const p1Name = playerMap.get(matchedMatch.player1_id)?.name || "?";
                const p2Name = playerMap.get(matchedMatch.player2_id)?.name || "?";
                details.push({
                  match: `${p1Name} vs ${p2Name}`,
                  status: `Updated — Winner: ${winnerPlayer.name} (${score})`,
                });
              } else {
                details.push({
                  match: `Match ${matchedMatch.id}`,
                  status: `Update error: ${updateError.message}`,
                });
              }
            }
          }
        }
      } catch (e) {
        details.push({ match: `Date ${date}`, status: `Fetch error: ${e}` });
      }
    }

    return NextResponse.json({
      message: updatedCount > 0
        ? `${updatedCount} match${updatedCount > 1 ? "es" : ""} updated with results`
        : "No new results found",
      checked: pendingMatches.length,
      updated: updatedCount,
      api_calls: apiCalls.length,
      details,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Unexpected error: ${e}` },
      { status: 500 }
    );
  }
}
