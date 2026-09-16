import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "tennis-api-atp-wta-itf.p.rapidapi.com";

export async function POST(request: Request) {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const tour = body.tour || "atp";
  const days = body.days || 14;

  const supabase = getSupabaseServer();

  try {
    // Calculate date range
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = future.toISOString().split("T")[0];

    // Fetch fixtures from Tennis-API
    const apiUrl = `https://${API_HOST}/tennis/v2/${tour}/fixtures/${dateFrom}/${dateTo}`;
    
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": API_HOST,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Tennis-API error: ${res.status}`, details: errorText },
        { status: res.status }
      );
    }

    const apiData = await res.json();
    const fixtures = apiData.data || apiData.results || apiData || [];

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return NextResponse.json({
        message: "No matches found in date range",
        scanned: 0,
        new: 0,
        skipped: 0,
        created_players: 0,
        details: [],
      });
    }

    // Get all existing players for matching
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("id, name, country_code");

    const playerMap = new Map<string, { id: string; name: string }>();
    existingPlayers?.forEach((p) => {
      playerMap.set(p.name.toLowerCase(), { id: p.id, name: p.name });
      // Also index by last name
      const lastName = p.name.split(" ").pop()?.toLowerCase();
      if (lastName) playerMap.set(lastName, { id: p.id, name: p.name });
    });

    // Get existing matches for deduplication
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("id, tourney_name, round, player1_id, player2_id, tourney_date");

    const existingMatchSet = new Set(
      existingMatches?.map(
        (m) =>
          `${m.tourney_name}|${m.round}|${m.player1_id}|${m.player2_id}|${m.tourney_date}`
      ) || []
    );

    let newCount = 0;
    let skipCount = 0;
    let createdPlayers = 0;
    const details: { match: string; status: string }[] = [];

    for (const fixture of fixtures.slice(0, 50)) {
      // Parse fixture data from Tennis-API format
      const homePlayer = fixture.player1?.name || "";
      const awayPlayer = fixture.player2?.name || "";
      const tournament = `Tournament ${fixture.tournamentId || "Unknown"}`;
      const round = fixture.roundId ? `Round ${fixture.roundId}` : "R128";
      const date = fixture.date ? fixture.date.split("T")[0] : dateFrom;
      const surface = "Hard"; // Default, API doesn't provide surface in fixture endpoint

      if (!homePlayer || !awayPlayer) continue;

      // Find or create players
      let p1 = playerMap.get(homePlayer.toLowerCase());
      let p2 = playerMap.get(awayPlayer.toLowerCase());

      // Try matching by last name if full name fails
      if (!p1) {
        const lastName = homePlayer.split(" ").pop()?.toLowerCase() || "";
        p1 = playerMap.get(lastName);
      }
      if (!p2) {
        const lastName = awayPlayer.split(" ").pop()?.toLowerCase() || "";
        p2 = playerMap.get(lastName);
      }

      // Create missing players
      if (!p1) {
        const country = fixture.player1?.countryAcr || "UNK";
        try {
          const { data: newPlayer, error: createError } = await supabase
            .from("players")
            .insert({
              name: homePlayer,
              country_code: country,
              hand: "R",
              strengths: [],
              weaknesses: [],
              best_surfaces: [],
            })
            .select()
            .single();

          if (createError) {
            console.error("Player creation error:", createError);
            details.push({ match: homePlayer, status: `Create error: ${createError.message}` });
            continue;
          }

          if (newPlayer) {
            p1 = { id: newPlayer.id, name: newPlayer.name };
            playerMap.set(homePlayer.toLowerCase(), p1);
            createdPlayers++;
          }
        } catch (e) {
          console.error("Player creation exception:", e);
          details.push({ match: homePlayer, status: "Create exception" });
          continue;
        }
      }

      if (!p2) {
        const country = fixture.player2?.countryAcr || "UNK";
        try {
          const { data: newPlayer, error: createError } = await supabase
            .from("players")
            .insert({
              name: awayPlayer,
              country_code: country,
              hand: "R",
              strengths: [],
              weaknesses: [],
              best_surfaces: [],
            })
            .select()
            .single();

          if (createError) {
            console.error("Player creation error:", createError);
            details.push({ match: awayPlayer, status: `Create error: ${createError.message}` });
            continue;
          }

          if (newPlayer) {
            p2 = { id: newPlayer.id, name: newPlayer.name };
            playerMap.set(awayPlayer.toLowerCase(), p2);
            createdPlayers++;
          }
        } catch (e) {
          console.error("Player creation exception:", e);
          details.push({ match: awayPlayer, status: "Create exception" });
          continue;
        }
      }

      if (!p1 || !p2) {
        details.push({
          match: `${homePlayer} vs ${awayPlayer}`,
          status: "Failed to resolve players",
        });
        continue;
      }

      // Check for duplicates
      const matchKey = `${tournament}|${round}|${p1.id}|${p2.id}|${date}`;
      if (existingMatchSet.has(matchKey)) {
        skipCount++;
        details.push({
          match: `${p1.name} vs ${p2.name}`,
          status: "Already exists",
        });
        continue;
      }

      // Insert match (fixtures don't have stats yet)
      const { error: insertError } = await supabase.from("matches").insert({
        id: `api-${fixture.id || Date.now()}-${newCount}`,
        tourney_name: tournament,
        surface,
        tourney_date: date,
        round: round || "R128",
        player1_id: p1.id,
        player2_id: p2.id,
        winner_id: null,
        score: "",
        minutes: null,
      });

      if (insertError) {
        details.push({
          match: `${p1.name} vs ${p2.name}`,
          status: `Error: ${insertError.message}`,
        });
      } else {
        newCount++;
        existingMatchSet.add(matchKey);
        details.push({
          match: `${p1.name} vs ${p2.name}`,
          status: "Imported",
        });
      }
    }

    return NextResponse.json({
      message: `Scan complete: ${newCount} new, ${skipCount} skipped`,
      scanned: fixtures.length,
      new: newCount,
      skipped: skipCount,
      created_players: createdPlayers,
      details,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Scan failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
