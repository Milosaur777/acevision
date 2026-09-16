"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Match, PlayerNote } from "@/types/tennis";
import { ArrowLeft, MapPin, Ruler, Hand, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountryFlag, HandEmoji } from "@/components/country-flag";

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"matches" | "notes" | "profile">("matches");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", country_code: "", hand: "R" as "L" | "R", ranking: "" });
  const [saving, setSaving] = useState(false);

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading player...</p>
        </div>
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

  // Aggregate stats
  let totalAces = 0, totalDfs = 0, totalSvPt = 0, total1stIn = 0, total1stWon = 0, total2ndWon = 0;
  let totalBpSaved = 0, totalBpFaced = 0;
  for (const m of matches) {
    const isP1 = m.player1_id === playerId;
    totalAces += isP1 ? (m.p1_ace ?? 0) : (m.p2_ace ?? 0);
    totalDfs += isP1 ? (m.p1_df ?? 0) : (m.p2_df ?? 0);
    totalSvPt += isP1 ? (m.p1_svpt ?? 0) : (m.p2_svpt ?? 0);
    total1stIn += isP1 ? (m.p1_1stIn ?? 0) : (m.p2_1stIn ?? 0);
    total1stWon += isP1 ? (m.p1_1stWon ?? 0) : (m.p2_1stWon ?? 0);
    total2ndWon += isP1 ? (m.p1_2ndWon ?? 0) : (m.p2_2ndWon ?? 0);
    totalBpSaved += isP1 ? (m.p1_bpSaved ?? 0) : (m.p2_bpSaved ?? 0);
    totalBpFaced += isP1 ? (m.p1_bpFaced ?? 0) : (m.p2_bpFaced ?? 0);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/players" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Players
      </Link>

      {/* Player Header Card */}
      <div className="glass p-6">
        <div className="flex items-start gap-5">
          {"avatar_url" in player && (player as any).avatar_url ? (
            <img
              src={(player as any).avatar_url}
              alt={player.name}
              className="w-16 h-16 rounded-2xl object-cover border border-primary/15 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )}
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
      <div className="flex gap-1 glass p-1">
        {(["matches", "notes", "profile"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize",
              tab === t ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(163,230,53,0.08)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Matches */}
      {tab === "matches" && (
        <div className="space-y-2 stagger-children">
          {matches.length === 0 ? (
            <div className="glass p-10 text-center">
              <p className="text-muted-foreground text-sm">No matches found</p>
            </div>
          ) : matches.map((match) => {
            const won = match.winner_id === playerId;
            const isP1 = match.player1_id === playerId;
            const myAces = isP1 ? match.p1_ace : match.p2_ace;
            const my1stIn = isP1 ? match.p1_1stIn : match.p2_1stIn;
            const my1stWon = isP1 ? match.p1_1stWon : match.p2_1stWon;
            const my2ndWon = isP1 ? match.p1_2ndWon : match.p2_2ndWon;
            const mySvPt = isP1 ? match.p1_svpt : match.p2_svpt;
            const myBpSaved = isP1 ? match.p1_bpSaved : match.p2_bpSaved;
            const myBpFaced = isP1 ? match.p1_bpFaced : match.p2_bpFaced;
            const hasStats = mySvPt > 0;
            return (
              <div key={match.id} className="glass stat-card px-5 py-3.5 flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                  won ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"
                )}>
                  {won ? "W" : "L"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{match.tourney_name} — {match.round}</p>
                  <p className="text-xs text-muted-foreground">{match.surface} · {match.tourney_date}</p>
                  {hasStats && (
                    <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground/70">
                      <span>Aces: {myAces}</span>
                      <span>1st: {mySvPt > 0 ? Math.round((my1stWon / my1stIn) * 100) : 0}%</span>
                      <span>BP: {myBpSaved}/{myBpFaced}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-mono shrink-0 text-muted-foreground">{match.score}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {tab === "notes" && (
        <div className="space-y-2 stagger-children">
          {notes.length === 0 ? (
            <div className="glass p-10 text-center">
              <p className="text-muted-foreground text-sm">No notes yet</p>
              <Link href="/admin" className="text-primary text-sm hover:underline mt-1 inline-block">Add notes in Admin</Link>
            </div>
          ) : notes.map((note) => (
            <div key={note.id} className="glass stat-card px-5 py-3.5">
              <div className="flex items-start gap-3">
                <span className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full capitalize shrink-0 font-medium",
                  note.category === "strength" ? "bg-primary/15 text-primary" :
                  note.category === "weakness" ? "bg-red-500/15 text-red-400" :
                  "bg-white/[0.06] text-muted-foreground"
                )}>
                  {note.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{note.content}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        i < note.confidence ? "bg-primary" : "bg-white/[0.06]"
                      )} />
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
        <div className="space-y-4">
          <div className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Player Info</h3>
              {!editing ? (
                <button
                  onClick={() => {
                    setEditForm({
                      name: player.name,
                      country_code: player.country_code,
                      hand: player.hand,
                      ranking: (player as any).ranking?.toString() || "",
                    });
                    setEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await fetch(`/api/players/${playerId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: editForm.name,
                            country_code: editForm.country_code,
                            hand: editForm.hand,
                            ranking: editForm.ranking ? parseInt(editForm.ranking) : null,
                          }),
                        });
                        setPlayer({ ...player, ...editForm, ranking: editForm.ranking ? parseInt(editForm.ranking) : null });
                        setEditing(false);
                      } catch (e) {
                        console.error("Save failed:", e);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Name</p>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full glass px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Country Code</p>
                  <input
                    type="text"
                    value={editForm.country_code}
                    onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value })}
                    className="w-full glass px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    maxLength={3}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Handedness</p>
                  <select
                    value={editForm.hand}
                    onChange={(e) => setEditForm({ ...editForm, hand: e.target.value as "L" | "R" })}
                    className="w-full glass px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="R">Right</option>
                    <option value="L">Left</option>
                  </select>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Ranking</p>
                  <input
                    type="number"
                    value={editForm.ranking}
                    onChange={(e) => setEditForm({ ...editForm, ranking: e.target.value })}
                    className="w-full glass px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="#"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Country</p>
                  <div className="flex items-center gap-2">
                    <CountryFlag code={player.country_code} />
                    <span>{player.country_code}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Handedness</p>
                  <p className="flex items-center gap-1.5"><HandEmoji hand={player.hand} /> {player.hand === "L" ? "Left" : "Right"}-handed</p>
                </div>
                {player.height_cm && (
                  <div>
                    <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Height</p>
                    <p>{player.height_cm} cm</p>
                  </div>
                )}
                {player.birth_date && (
                  <div>
                    <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Age</p>
                    <p>{Math.floor((Date.now() - new Date(player.birth_date).getTime()) / 31557600000)} years</p>
                  </div>
                )}
                {player.play_style && (
                  <div>
                    <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Play Style</p>
                    <p className="capitalize">{player.play_style.replace("-", " ")}</p>
                  </div>
                )}
                {"ranking" in player && (player as any).ranking && (
                  <div>
                    <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Ranking</p>
                    <p className="text-primary font-bold">#{(player as any).ranking}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {player.strengths?.length > 0 && (
            <div className="glass p-5">
              <h3 className="font-semibold text-sm mb-3">Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {player.strengths.map((s) => (
                  <span key={s} className="text-sm px-3 py-1 rounded-full bg-primary/15 text-primary capitalize">{s}</span>
                ))}
              </div>
            </div>
          )}

          {player.weaknesses?.length > 0 && (
            <div className="glass p-5">
              <h3 className="font-semibold text-sm mb-3">Weaknesses</h3>
              <div className="flex flex-wrap gap-2">
                {player.weaknesses.map((w) => (
                  <span key={w} className="text-sm px-3 py-1 rounded-full bg-red-500/15 text-red-400 capitalize">{w}</span>
                ))}
              </div>
            </div>
          )}

          {player.best_surfaces?.length > 0 && (
            <div className="glass p-5">
              <h3 className="font-semibold text-sm mb-3">Best Surfaces</h3>
              <div className="flex flex-wrap gap-2">
                {player.best_surfaces.map((s) => (
                  <span key={s} className="text-sm px-3 py-1 rounded-full bg-white/[0.06] text-foreground capitalize">{s}</span>
                ))}
              </div>
            </div>
          )}

          {totalSvPt > 0 && (
            <div className="glass p-5">
              <h3 className="font-semibold text-sm mb-3">Career Stats ({matches.length} matches)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Aces</p>
                  <p className="text-primary font-bold text-lg">{totalAces}</p>
                  <p className="text-[11px] text-muted-foreground">{(totalAces / matches.length).toFixed(1)}/match</p>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">1st Serve %</p>
                  <p className="text-primary font-bold text-lg">{totalSvPt > 0 ? Math.round((total1stIn / totalSvPt) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">1st Serve Won</p>
                  <p className="text-primary font-bold text-lg">{total1stIn > 0 ? Math.round((total1stWon / total1stIn) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">2nd Serve Won</p>
                  <p className="text-primary font-bold text-lg">{(totalSvPt - total1stIn) > 0 ? Math.round((total2ndWon / (totalSvPt - total1stIn)) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Double Faults</p>
                  <p className="font-bold text-lg">{totalDfs}</p>
                  <p className="text-[11px] text-muted-foreground">{(totalDfs / matches.length).toFixed(1)}/match</p>
                </div>
                <div>
                  <p className="text-muted-foreground/50 text-xs uppercase tracking-wider mb-1">Break Points Saved</p>
                  <p className="font-bold text-lg">{totalBpSaved}/{totalBpFaced}</p>
                  <p className="text-[11px] text-muted-foreground">{totalBpFaced > 0 ? Math.round((totalBpSaved / totalBpFaced) * 100) : 0}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
