"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Player, PlayerNote } from "@/types/tennis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STRENGTH_WEAKNESS_OPTIONS, SURFACE_OPTIONS } from "@/types/tennis";
import { Save, Plus, Trash2 } from "lucide-react";

export default function AdminPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [playStyle, setPlayStyle] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [bestSurfaces, setBestSurfaces] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<"strength" | "weakness" | "tactic">("tactic");
  const [newNoteConfidence, setNewNoteConfidence] = useState(3);

  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase.from("players").select("*").order("name");
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

      const { data } = await supabase
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

    await supabase
      .from("players")
      .update({
        play_style: playStyle,
        strengths,
        weaknesses,
        best_surfaces: bestSurfaces,
      })
      .eq("id", selectedPlayerId);

    setSaving(false);
  }

  async function addNote() {
    if (!selectedPlayerId || !newNote.trim()) return;

    const { data } = await supabase
      .from("player_notes")
      .insert({
        player_id: selectedPlayerId,
        category: newNoteCategory,
        content: newNote.trim(),
        confidence: newNoteConfidence,
        tags: [],
      })
      .select()
      .single();

    if (data) {
      setNotes([data, ...notes]);
      setNewNote("");
    }
  }

  async function deleteNote(noteId: string) {
    await supabase.from("player_notes").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Manage player profiles and add your personal notes
        </p>
      </div>

      {/* Player selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select Player</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Choose a player...</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.country_code})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedPlayerId && (
        <>
          {/* Player Attributes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Player Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Play Style */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Play Style</label>
                <select
                  value={playStyle}
                  onChange={(e) => setPlayStyle(e.target.value)}
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select style...</option>
                  <option value="baseline">Baseline</option>
                  <option value="serve-volley">Serve & Volley</option>
                  <option value="all-court">All-Court</option>
                  <option value="counter-puncher">Counter-Puncher</option>
                  <option value="aggressive-baseliner">Aggressive Baseliner</option>
                </select>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Strengths</label>
                <div className="flex flex-wrap gap-1.5">
                  {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={strengths.includes(opt) ? "default" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem(strengths, opt, setStrengths)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Weaknesses</label>
                <div className="flex flex-wrap gap-1.5">
                  {STRENGTH_WEAKNESS_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={weaknesses.includes(opt) ? "destructive" : "outline"}
                      className="cursor-pointer text-xs capitalize"
                      onClick={() => toggleArrayItem(weaknesses, opt, setWeaknesses)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Best Surfaces */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Best Surfaces</label>
                <div className="flex flex-wrap gap-1.5">
                  {SURFACE_OPTIONS.map((s) => (
                    <Badge
                      key={s}
                      variant={bestSurfaces.includes(s) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayItem(bestSurfaces, s, setBestSurfaces)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={savePlayer} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Attributes"}
              </Button>
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Add Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value as typeof newNoteCategory)}
                  className="bg-input border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="strength">Strength</option>
                  <option value="weakness">Weakness</option>
                  <option value="tactic">Tactic</option>
                </select>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewNoteConfidence(c)}
                      className={`w-6 h-6 rounded-full text-xs ${
                        c <= newNoteConfidence
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                placeholder="Write a note about this player..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
              />
              <Button onClick={addNote} variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Existing Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes ({notes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No notes yet.
                </p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Badge
                      variant={
                        note.category === "strength"
                          ? "default"
                          : note.category === "weakness"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs shrink-0 capitalize"
                    >
                      {note.category}
                    </Badge>
                    <p className="text-sm flex-1">{note.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
