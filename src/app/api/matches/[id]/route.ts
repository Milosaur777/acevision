import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  // 1. Delete predictions linked to this match
  await supabase.from("predictions").delete().eq("match_id", id);

  // 2. Delete match
  const { error } = await supabase.from("matches").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
