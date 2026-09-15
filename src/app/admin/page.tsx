"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, PlayerNote, Match } from "@/types/tennis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STRENGTH_WEAKNESS_OPTIONS, SURFACE_OPTIONS } from "@/types/tennis";
import { Save, Plus, Trash2, UserPlus, Trophy } from "lucide-react";

type Tab = "notes" | "add-player" | "add-match";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("notes");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notes form
  const [playStyle, setPlayStyle] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [bestSurfaces, setBestSurfaces] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"strength" | "weakness" | "tactic">("tactic");
  const [newNoteConfidence, setNewNoteConfidence] = useState(3);

  // Add Player form
  const [pName, setPName] = useState("");
  const [pCountry, setPCountry] = useState("");
  const [pHand, setPHand] = useState<"L" | "R">("R");
  const [pHeight, setPHeight] = useState("");
  const [pBirth, setPBirth] = useState("");
  const [playerMsg, setPlayerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Add Match form
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
      setNotes([]);
      setStrengths([]);
      setWeaknesses([]);
      setBestSurfaces([]);
      setPlayStyle("");
      return;
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
      const { data } = await db
        .from("player_notes")
        .select("*")
        .eq("player_id", selectedPlayerId)
        .order("created_at", { ascending: false });
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
    await getSupabase()
      .from("players")
      .update({ play_style: playStyle, strengths, weaknesses, best_surfaces: bestSurfaces })
      .eq("id", selectedPlayerId);
    setSaving(false);
  }

  async function addNote() {
    if (!selectedPlayerId || !newNote.trim()) return;
    const { data } = await getSupabase()
      .from("player_notes")
      .insert({ player_id: selectedPlayerId, category: newNoteCategory, content: newNote.trim(), confidence: newNoteConfidence, tags: [] })
      .select()
      .single();
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
      id,
      name: pName.trim(),
      country_code: pCountry.trim().toUpperCase(),
      hand: pHand,
      height_cm: pHeight ? parseInt(pHeight) : null,
      birth_date: pBirth || null,
    }, { onConflict: "id" });
    setPlayerMsg(error ? { ok: false, text: error.message } : { ok: true, text: `Added ${pName}` });
    if (!error) {
      setPlayers([...players, { id, name: pName.trim(), country_code: pCountry.trim().toUpperCase(), hand: pHand, height_cm: pHeight ? parseInt(pHeight) : null, birth_date: pBirth || null, play_style: null, strengths: [], weaknesses: [], best_surfaces: [], created_at: new Date().toISOString() }]);
      setPName(""); setPCountry(""); setPHeight(""); setPBirth("");
    }
  }

  async function handleAddMatch() {
    if (!mP1 || !mP2 || !mScore.trim()) { setMMsg({ ok: false, text: "Need 2 players and a score" }); return; }
    const id = `manual-${Date.now()}`;
    const { error } = await getSupabase().from("matches").insert({
      id,
      player1_id: mP1,
      player2_id: mP2,
      winner_id: mWinner || mP1,
      score: mScore.trim(),
      surface: mSurface,
      tourney_name: mTourney,
      tourney_date: mDate,
      round: mRound,
      minutes: mMinutes ? parseInt(mMinutes) : null,
    });
    setMMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Match added" });
    if (!error) { setMScore(""); setMMinutes(""); }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "notes", label: "Notes & Attributes", icon: <Save className="h-4 w-4" /> },
    { key: "add-player", label: "Add Player", icon: <UserPlus className="h-4 w-4" /> },
    { key: "add-match", label: "Add Match", icon: <Trophy className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">Manage players, matches, and notes</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              tab === t.key
                ? "bg-muted border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Notes */}
      {tab === "notes" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Select Player</CardTitle></CardHeader>
            <CardContent>
              <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                <option value="">Choose a player...</option>
                {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
              </select>
            </CardContent>
          </Card>

          {selectedPlayerId && (
            <>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Player Attributes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Play Style</label>
                    <select value={playStyle} onChange={(e) => setPlayStyle(e.target.value)}
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                      <option value="">Select style...</option>
                      <option value="baseline">Baseline</option>
                      <option value="serve-volley">Serve & Volley</option>
                      <option value="all-court">All-Court</option>
                      <option value="counter-puncher">Counter-Puncher</option>
                      <option value="aggressive-baseliner">Aggressive Baseliner</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Strengths</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                        <Badge key={opt} variant={strengths.includes(opt) ? "default" : "outline"}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => toggleArrayItem(strengths, opt, setStrengths)}>{opt}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Weaknesses</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                        <Badge key={opt} variant={weaknesses.includes(opt) ? "destructive" : "outline"}
                          className="cursor-pointer text-xs capitalize"
                          onClick={() => toggleArrayItem(weaknesses, opt, setWeaknesses)}>{opt}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Best Surfaces</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SURFACE_OPTIONS.map((s) => (
                        <Badge key={s} variant={bestSurfaces.includes(s) ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleArrayItem(bestSurfaces, s, setBestSurfaces)}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={savePlayer} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Attributes"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Add Note</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <select value={newNoteCategory} onChange={(e) => setNewNoteCategory(e.target.value as typeof newNoteCategory)}
                      className="bg-input border border-border rounded-md px-3 py-2 text-sm">
                      <option value="strength">Strength</option>
                      <option value="weakness">Weakness</option>
                      <option value="tactic">Tactic</option>
                    </select>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((c) => (
                        <button key={c} onClick={() => setNewNoteConfidence(c)}
                          className={`w-6 h-6 rounded-full text-xs ${c <= newNoteConfidence ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input placeholder="Write a note about this player..." value={newNote}
                    onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
                  <Button onClick={addNote} variant="secondary" size="sm">
                    <Plus className="h-4 w-4 mr-1" />Add Note
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">Notes ({notes.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No notes yet.</p>
                  ) : notes.map((note) => (
                    <div key={note.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      <Badge variant={note.category === "strength" ? "default" : note.category === "weakness" ? "destructive" : "secondary"}
                        className="text-xs shrink-0 capitalize">{note.category}</Badge>
                      <p className="text-sm flex-1">{note.content}</p>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => deleteNote(note.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Tab: Add Player */}
      {tab === "add-player" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Add Player</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input placeholder="Novak Djokovic" value={pName} onChange={(e) => setPName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Country Code</label>
                <Input placeholder="SRB" value={pCountry} onChange={(e) => setPCountry(e.target.value)} maxLength={3} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hand</label>
                <select value={pHand} onChange={(e) => setPHand(e.target.value as "L" | "R")}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  <option value="R">Right</option>
                  <option value="L">Left</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Height (cm)</label>
                <Input type="number" placeholder="188" value={pHeight} onChange={(e) => setPHeight(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Birth Date</label>
                <Input type="date" value={pBirth} onChange={(e) => setPBirth(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddPlayer} disabled={!pName.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />Add Player
            </Button>
            {playerMsg && (
              <p className={`text-sm ${playerMsg.ok ? "text-primary" : "text-destructive"}`}>{playerMsg.text}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Add Match */}
      {tab === "add-match" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Add Match</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Player 1 *</label>
                <select value={mP1} onChange={(e) => { setMP1(e.target.value); if (!mWinner) setMWinner(e.target.value); }}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Player 2 *</label>
                <select value={mP2} onChange={(e) => setMP2(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Winner</label>
                <select value={mWinner} onChange={(e) => setMWinner(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  {mP1 && <option value={mP1}>{players.find((p) => p.id === mP1)?.name}</option>}
                  {mP2 && <option value={mP2}>{players.find((p) => p.id === mP2)?.name}</option>}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Score *</label>
                <Input placeholder="6-4 6-3" value={mScore} onChange={(e) => setMScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Surface</label>
                <select value={mSurface} onChange={(e) => setMSurface(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {SURFACE_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tournament</label>
                <Input placeholder="Australian Open" value={mTourney} onChange={(e) => setMTourney(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Round</label>
                <select value={mRound} onChange={(e) => setMRound(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {["F", "SF", "QF", "R16", "R32", "R64", "R128", "RR"].map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Minutes</label>
                <Input type="number" placeholder="120" value={mMinutes} onChange={(e) => setMMinutes(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddMatch} disabled={!mP1 || !mP2 || !mScore.trim()}>
              <Trophy className="h-4 w-4 mr-2" />Add Match
            </Button>
            {mMsg && (
              <p className={`text-sm ${mMsg.ok ? "text-primary" : "text-destructive"}`}>{mMsg.text}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
