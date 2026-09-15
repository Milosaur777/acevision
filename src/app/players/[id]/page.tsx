"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Match, PlayerNote } from "@/types/tennis";
import { ArrowLeft, MapPin, Ruler, Hand } from "lucide-react";

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches" | "notes" | "profile">("matches");

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [playerRes, matchesRes, notesRes] = await Promise.all([
        db.from("players").select("*").eq("id", playerId).single(),
        db.from("matches").select("*").or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`).order("tourney_date", { ascending: false }).limit(20),
        db.from("player_notes").select("*").eq("player_id", playerId).order("created_at", { ascending: false }),
      ]);
      setPlayer(playerRes.data);
      setMatches(matchesRes.data ?? []);
      setNotes(notesRes.data ?? []);
      setLoading(false);
    }
    loadData();
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Player not found.</p>
        <Link href="/players" className="text-primary text-sm hover:underline mt-2 inline-block">Back to players</Link>
      </div>
    );
  }

  const wins = matches.filter((m) => m.winner_id === playerId).length;
  const losses = matches.length - wins;

  return (
    <div className="space-y-6">
      <Link href="/players" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Players
      </Link>

      {/* Player Header Card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {player.country_code}</span>
              <span className="flex items-center gap-1"><Hand className="h-3.5 w-3.5" /> {player.hand === "L" ? "Left" : "Right"}-handed</span>
              {player.height_cm && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {player.height_cm}cm</span>}
            </div>
            {player.best_surfaces?.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {player.best_surfaces.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">{s}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{wins}</p>
              <p className="text-[11px] text-muted-foreground">Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{losses}</p>
              <p className="text-[11px] text-muted-foreground">Losses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border p-1">
        {(["matches", "notes", "profile"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Matches */}
      {tab === "matches" && (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <p className="text-muted-foreground text-sm">No matches found</p>
            </div>
          ) : matches.map((match) => {
            const won = match.winner_id === playerId;
            return (
              <div key={match.id} className="bg-card rounded-xl border border-border px-5 py-3.5 flex items-center gap-4 hover:border-primary/20 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${won ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"}`}>
                  {won ? "W" : "L"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{match.tourney_name} — {match.round}</p>
                  <p className="text-xs text-muted-foreground">{match.surface} · {match.tourney_date}</p>
                </div>
                <p className="text-sm font-mono shrink-0 text-muted-foreground">{match.score}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {tab === "notes" && (
        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center">
              <p className="text-muted-foreground text-sm">No notes yet</p>
              <Link href="/admin" className="text-primary text-sm hover:underline mt-1 inline-block">Add notes in Admin</Link>
            </div>
          ) : notes.map((note) => (
            <div key={note.id} className="bg-card rounded-xl border border-border px-5 py-3.5 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-3">
                <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize shrink-0 font-medium ${
                  note.category === "strength" ? "bg-primary/15 text-primary" :
                  note.category === "weakness" ? "bg-red-500/15 text-red-400" :
                  "bg-secondary text-secondary-foreground"
                }`}>
                  {note.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{note.content}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < note.confidence ? "bg-primary" : "bg-muted"}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">{note.confidence}/5</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Profile */}
      {tab === "profile" && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">AI profile generation coming soon.</p>
        </div>
      )}
    </div>
  );
}
