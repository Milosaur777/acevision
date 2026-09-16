import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  // 1. Delete predictions linked to player's matches
  const { data: playerMatches } = await supabase
    .from("matches")
    .select("id")
    .or(`player1_id.eq.${id},player2_id.eq.${id}`);

  if (playerMatches && playerMatches.length > 0) {
    const matchIds = playerMatches.map((m) => m.id);
    await supabase.from("predictions").delete().in("match_id", matchIds);
  }

  // 2. Delete player's matches
  await supabase
    .from("matches")
    .delete()
    .or(`player1_id.eq.${id},player2_id.eq.${id}`);

  // 3. Delete player
  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
