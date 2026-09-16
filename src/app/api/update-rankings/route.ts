import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "tennis-api-atp-wta-itf.p.rapidapi.com";

export async function POST() {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json(
      { error: "RAPIDAPI_KEY not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServer();

  try {
    // Fetch ATP rankings from Tennis-API
    const res = await fetch(
      `https://${API_HOST}/tennis/v2/atp/ranking`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": API_HOST,
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Tennis-API error: ${res.status}`, details: errorText },
        { status: res.status }
      );
    }

    const apiData = await res.json();
    const rankings = apiData.data || apiData.results || apiData || [];

    if (!Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json(
        { error: "No ranking data returned from API" },
        { status: 500 }
      );
    }

    // Get all players for matching
    const { data: players } = await supabase
      .from("players")
      .select("id, name, ranking");

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const rankEntry of rankings.slice(0, 500)) {
      const playerName = rankEntry.player?.name || rankEntry.name || "";
      const newRanking = rankEntry.rank || rankEntry.ranking || rankEntry.position;

      if (!playerName || !newRanking) continue;

      // Find matching player by name
      const match = players?.find(
        (p) =>
          p.name.toLowerCase() === playerName.toLowerCase() ||
          p.name.toLowerCase().includes(playerName.toLowerCase()) ||
          playerName.toLowerCase().includes(p.name.toLowerCase())
      );

      if (match) {
        await supabase
          .from("players")
          .update({ ranking: newRanking })
          .eq("id", match.id);
        updatedCount++;
      } else {
        notFoundCount++;
      }
    }

    return NextResponse.json({
      message: `Rankings updated: ${updatedCount} players updated`,
      updated: updatedCount,
      not_found: notFoundCount,
      total_from_api: rankings.length,
    });
  } catch (error) {
    console.error("Rankings update error:", error);
    return NextResponse.json(
      { error: "Update failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
