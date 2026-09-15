"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, PlayerNote } from "@/types/tennis";
import { STRENGTH_WEAKNESS_OPTIONS, SURFACE_OPTIONS } from "@/types/tennis";
import { Save, Plus, Trash2, UserPlus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "notes" | "add-player" | "add-match";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("notes");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [playStyle, setPlayStyle] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [bestSurfaces, setBestSurfaces] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"strength" | "weakness" | "tactic">("tactic");
  const [newNoteConfidence, setNewNoteConfidence] = useState(3);

  const [pName, setPName] = useState("");
  const [pCountry, setPCountry] = useState("");
  const [pHand, setPHand] = useState<"L" | "R">("R");
  const [pHeight, setPHeight] = useState("");
  const [pBirth, setPBirth] = useState("");
  const [playerMsg, setPlayerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [mP1, setMP1] = useState("");
  const [mP2, setMP2] = useState("");
  const [mWinner, setMWinner] = useState("");
  const [mScore, setMScore] = useState("");
  const [mSurface, setMSurface] = useState("");
  const [mTourney, setMTourney] = useState("");
  const [mDate, setMDate] = useState("");
  const [mRound, setMRound] = useState("");
  const [mMinutes, setMMinutes] = useState("");
  const [mMsg, setMMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      const db = getSupabase();
      const { data } = await db.from("players").select("*").order("name");
      setPlayers(data ?? []);
      setLoading(false);
    }
    loadPlayers();
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) {
      setNotes([]); setStrengths([]); setWeaknesses([]); setBestSurfaces([]); setPlayStyle(""); return;
    }
    async function loadPlayerData() {
      const player = players.find((p) => p.id === selectedPlayerId);
      if (player) {
        setStrengths(player.strengths ?? []);
        setWeaknesses(player.weaknesses ?? []);
        setBestSurfaces(player.best_surfaces ?? []);
        setPlayStyle(player.play_style ?? "");
      }
      const db = getSupabase();
      const { data } = await db.from("player_notes").select("*").eq("player_id", selectedPlayerId).order("created_at", { ascending: false });
      setNotes(data ?? []);
    }
    loadPlayerData();
  }, [selectedPlayerId, players]);

  function toggleArrayItem(arr: string[], item: string, set: (v: string[]) => void) {
    set(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  }

  async function savePlayer() {
    if (!selectedPlayerId) return;
    setSaving(true);
    await getSupabase().from("players").update({ play_style: playStyle, strengths, weaknesses, best_surfaces: bestSurfaces }).eq("id", selectedPlayerId);
    setSaving(false);
  }

  async function addNote() {
    if (!selectedPlayerId || !newNote.trim()) return;
    const { data } = await getSupabase().from("player_notes").insert({ player_id: selectedPlayerId, category: newNoteCategory, content: newNote.trim(), confidence: newNoteConfidence, tags: [] }).select().single();
    if (data) { setNotes([data, ...notes]); setNewNote(""); }
  }

  async function deleteNote(noteId: string) {
    await getSupabase().from("player_notes").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  async function handleAddPlayer() {
    if (!pName.trim()) return;
    const id = pName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await getSupabase().from("players").upsert({
      id, name: pName.trim(), country_code: pCountry.trim().toUpperCase(), hand: pHand,
      height_cm: pHeight ? parseInt(pHeight) : null, birth_date: pBirth || null,
    }, { onConflict: "id" });
    setPlayerMsg(error ? { ok: false, text: error.message } : { ok: true, text: `Added ${pName}` });
    if (!error) {
      setPlayers([...players, { id, name: pName.trim(), country_code: pCountry.trim().toUpperCase(), hand: pHand, height_cm: pHeight ? parseInt(pHeight) : null, birth_date: pBirth || null, play_style: null, strengths: [], weaknesses: [], best_surfaces: [], avatar_url: null, ranking: null, created_at: new Date().toISOString() }]);
      setPName(""); setPCountry(""); setPHeight(""); setPBirth("");
    }
  }

  async function handleAddMatch() {
    if (!mP1 || !mP2 || !mScore.trim()) { setMMsg({ ok: false, text: "Need 2 players and a score" }); return; }
    const id = `manual-${Date.now()}`;
    const { error } = await getSupabase().from("matches").insert({
      id, player1_id: mP1, player2_id: mP2, winner_id: mWinner || mP1,
      score: mScore.trim(), surface: mSurface, tourney_name: mTourney,
      tourney_date: mDate, round: mRound, minutes: mMinutes ? parseInt(mMinutes) : null,
    });
    setMMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Match added" });
    if (!error) { setMScore(""); setMMinutes(""); }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "notes", label: "Notes & Attributes", icon: <Save className="h-4 w-4" /> },
    { key: "add-player", label: "Add Player", icon: <UserPlus className="h-4 w-4" /> },
    { key: "add-match", label: "Add Match", icon: <Trophy className="h-4 w-4" /> },
  ];

  const inputCls = "w-full glass px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage players, matches, and notes</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 glass p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center",
              tab === t.key ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(163,230,53,0.08)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            )}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Notes */}
      {tab === "notes" && (
        <div className="space-y-4">
          <div className="glass p-5">
            <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Select Player</label>
            <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} className={inputCls}>
              <option value="">Choose a player...</option>
              {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
            </select>
          </div>

          {selectedPlayerId && (
            <>
              {/* Attributes */}
              <div className="glass p-5 space-y-4">
                <h2 className="font-semibold">Player Attributes</h2>
                <div>
                  <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Play Style</label>
                  <select value={playStyle} onChange={(e) => setPlayStyle(e.target.value)} className={inputCls}>
                    <option value="">Select style...</option>
                    <option value="baseline">Baseline</option>
                    <option value="serve-volley">Serve & Volley</option>
                    <option value="all-court">All-Court</option>
                    <option value="counter-puncher">Counter-Puncher</option>
                    <option value="aggressive-baseliner">Aggressive Baseliner</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Strengths</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => toggleArrayItem(strengths, opt, setStrengths)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full capitalize transition-all",
                          strengths.includes(opt) ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(163,230,53,0.15)]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                        )}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Weaknesses</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => toggleArrayItem(weaknesses, opt, setWeaknesses)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full capitalize transition-all",
                          weaknesses.includes(opt) ? "bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                        )}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Best Surfaces</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SURFACE_OPTIONS.map((s) => (
                      <button key={s} onClick={() => toggleArrayItem(bestSurfaces, s, setBestSurfaces)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full transition-all",
                          bestSurfaces.includes(s) ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(163,230,53,0.15)]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07]"
                        )}>{s}</button>
                    ))}
                  </div>
                </div>
                <button onClick={savePlayer} disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50 flex items-center gap-2">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Attributes"}
                </button>
              </div>

              {/* Add Note */}
              <div className="glass p-5 space-y-3">
                <h2 className="font-semibold">Add Note</h2>
                <div className="flex gap-2 items-center flex-wrap">
                  <select value={newNoteCategory} onChange={(e) => setNewNoteCategory(e.target.value as typeof newNoteCategory)} className={inputCls + " w-auto"}>
                    <option value="strength">Strength</option>
                    <option value="weakness">Weakness</option>
                    <option value="tactic">Tactic</option>
                  </select>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((c) => (
                      <button key={c} onClick={() => setNewNoteConfidence(c)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-medium transition-all",
                          c <= newNoteConfidence ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground"
                        )}>{c}</button>
                    ))}
                  </div>
                </div>
                <input placeholder="Write a note about this player..." value={newNote}
                  onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()}
                  className={inputCls} />
                <button onClick={addNote}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-foreground text-sm font-medium hover:bg-white/[0.1] transition-all flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Add Note
                </button>
              </div>

              {/* Notes List */}
              <div className="glass p-5">
                <h2 className="font-semibold mb-3">Notes ({notes.length})</h2>
                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No notes yet.</p>
                  ) : notes.map((note) => (
                    <div key={note.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full capitalize shrink-0 font-medium",
                        note.category === "strength" ? "bg-primary/15 text-primary" :
                        note.category === "weakness" ? "bg-red-500/15 text-red-400" :
                        "bg-white/[0.06] text-muted-foreground"
                      )}>{note.category}</span>
                      <p className="text-sm flex-1">{note.content}</p>
                      <button onClick={() => deleteNote(note.id)}
                        className="p-1 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Add Player */}
      {tab === "add-player" && (
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold text-lg">Add Player</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Name *</label>
              <input placeholder="Novak Djokovic" value={pName} onChange={(e) => setPName(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Country Code</label>
              <input placeholder="SRB" value={pCountry} onChange={(e) => setPCountry(e.target.value)} maxLength={3} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Hand</label>
              <select value={pHand} onChange={(e) => setPHand(e.target.value as "L" | "R")} className={inputCls}>
                <option value="R">Right</option><option value="L">Left</option>
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Height (cm)</label>
              <input type="number" placeholder="188" value={pHeight} onChange={(e) => setPHeight(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Birth Date</label>
              <input type="date" value={pBirth} onChange={(e) => setPBirth(e.target.value)} className={inputCls} /></div>
          </div>
          <button onClick={handleAddPlayer} disabled={!pName.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50 flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add Player
          </button>
          {playerMsg && <p className={`text-sm ${playerMsg.ok ? "text-primary" : "text-red-400"}`}>{playerMsg.text}</p>}
        </div>
      )}

      {/* Tab: Add Match */}
      {tab === "add-match" && (
        <div className="glass p-6 space-y-4">
          <h2 className="font-semibold text-lg">Add Match</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Player 1 *</label>
              <select value={mP1} onChange={(e) => { setMP1(e.target.value); if (!mWinner) setMWinner(e.target.value); }} className={inputCls}>
                <option value="">Select...</option>{players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Player 2 *</label>
              <select value={mP2} onChange={(e) => setMP2(e.target.value)} className={inputCls}>
                <option value="">Select...</option>{players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Winner</label>
              <select value={mWinner} onChange={(e) => setMWinner(e.target.value)} className={inputCls}>
                {mP1 && <option value={mP1}>{players.find((p) => p.id === mP1)?.name}</option>}
                {mP2 && <option value={mP2}>{players.find((p) => p.id === mP2)?.name}</option>}
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Score *</label>
              <input placeholder="6-4 6-3" value={mScore} onChange={(e) => setMScore(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Surface</label>
              <select value={mSurface} onChange={(e) => setMSurface(e.target.value)} className={inputCls}>
                <option value="">Select...</option>{SURFACE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Tournament</label>
              <input placeholder="Australian Open" value={mTourney} onChange={(e) => setMTourney(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Date</label>
              <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Round</label>
              <select value={mRound} onChange={(e) => setMRound(e.target.value)} className={inputCls}>
                <option value="">Select...</option>{["F", "SF", "QF", "R16", "R32", "R64", "R128", "RR"].map((r) => (<option key={r} value={r}>{r}</option>))}
              </select></div>
            <div><label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Minutes</label>
              <input type="number" placeholder="120" value={mMinutes} onChange={(e) => setMMinutes(e.target.value)} className={inputCls} /></div>
          </div>
          <button onClick={handleAddMatch} disabled={!mP1 || !mP2 || !mScore.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Add Match
          </button>
          {mMsg && <p className={`text-sm ${mMsg.ok ? "text-primary" : "text-red-400"}`}>{mMsg.text}</p>}
        </div>
      )}
    </div>
  );
}
