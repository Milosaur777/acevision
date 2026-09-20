import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = "tennis-api-atp-wta-itf.p.rapidapi.com";

export const dynamic = "force-dynamic";

async function fetchFixtures(tour: string, date: string) {
  const url = `https://${API_HOST}/tennis/v2/${tour}/fixtures/${date}/${date}`;
  const res = await fetch(url, {
    headers: { "X-RapidAPI-Key": RAPIDAPI_KEY!, "X-RapidAPI-Host": API_HOST },
  });
  if (!res.ok) return [];
  const d = await res.json();
  return d.data || d.results || d || [];
}

export async function GET() {
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });
  }

  const supabase = getSupabaseServer();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0];

  try {
    const { data: pending, error } = await supabase
      .from("matches").select("*")
      .is("winner_id", null)
      .in("tourney_date", [today, yesterday])
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!pending?.length) {
      return NextResponse.json({ message: "No pending matches for today or yesterday", checked: 0, updated: 0, details: [] });
    }

    const { data: players } = await supabase.from("players").select("id, name");
    const pMap = new Map<string, { id: string; name: string }>();
    players?.forEach((p) => {
      pMap.set(p.name.toLowerCase(), { id: p.id, name: p.name });
      const last = p.name.split(" ").pop()?.toLowerCase();
      if (last) pMap.set(last, { id: p.id, name: p.name });
    });

    // Fetch today + yesterday, ATP + WTA (4 calls max)
    const fixtures: any[] = [];
    for (const d of [today, yesterday]) {
      for (const t of ["atp", "wta"]) {
        try { fixtures.push(...await fetchFixtures(t, d)); } catch {}
      }
    }

    let updated = 0;
    const details: { match: string; status: string }[] = [];

    for (const f of fixtures) {
      const fP1 = f.player1?.name || "";
      const fP2 = f.player2?.name || "";
      const score = f.live || f.score || "";
      const fDate = f.date ? f.date.split("T")[0] : "";
      if (!fP1 || !fP2 || !score) continue;

      const fP1Last = fP1.split(" ").pop()?.toLowerCase() || "";
      const fP2Last = fP2.split(" ").pop()?.toLowerCase() || "";

      const match = pending.find((pm) => {
        const pmP1Last = (pMap.get(pm.player1_id)?.name || "").split(" ").pop()?.toLowerCase() || "";
        const pmP2Last = (pMap.get(pm.player2_id)?.name || "").split(" ").pop()?.toLowerCase() || "";
        if (pm.tourney_date !== fDate) return false;
        return (fP1Last === pmP1Last && fP2Last === pmP2Last) ||
               (fP1Last === pmP2Last && fP2Last === pmP1Last);
      });

      if (!match) continue;

      const winnerName = f.player1?.name?.toLowerCase() || "";
      const winner = pMap.get(winnerName) || pMap.get(winnerName.split(" ").pop() || "");
      if (!winner) continue;

      const { error: updErr } = await supabase
        .from("matches").update({ winner_id: winner.id, score }).eq("id", match.id);

      if (!updErr) {
        updated++;
        const n1 = pMap.get(match.player1_id)?.name || "?";
        const n2 = pMap.get(match.player2_id)?.name || "?";
        details.push({ match: `${n1} vs ${n2}`, status: `Winner: ${winner.name} (${score})` });
      }
    }

    return NextResponse.json({
      message: updated > 0 ? `${updated} match${updated > 1 ? "es" : ""} updated` : "No new results found",
      checked: pending.length, updated, details,
    });
  } catch (e) {
    return NextResponse.json({ error: `${e}` }, { status: 500 });
  }
}
