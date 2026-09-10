"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Match, PlayerNote } from "@/types/tennis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Ruler, Hand } from "lucide-react";

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [playerRes, matchesRes, notesRes] = await Promise.all([
        db.from("players").select("*").eq("id", playerId).single(),
        db
          .from("matches")
          .select("*")
          .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
          .order("tourney_date", { ascending: false })
          .limit(20),
        getSupabase()
          .from("player_notes")
          .select("*")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false }),
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
        <div className="animate-pulse text-muted-foreground">Loading player...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">Player not found.</p>
        <Link href="/players" className="text-primary hover:underline mt-2 inline-block">
          Back to players
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link
        href="/players"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to players
      </Link>

      {/* Player Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
          {player.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {player.country_code}
            </span>
            <span className="flex items-center gap-1">
              <Hand className="h-3 w-3" />{" "}
              {player.hand === "L" ? "Left-handed" : "Right-handed"}
            </span>
            {player.height_cm && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> {player.height_cm}cm
              </span>
            )}
          </div>
          {player.best_surfaces?.length > 0 && (
            <div className="flex gap-1 mt-1">
              {player.best_surfaces.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="profile">AI Profile</TabsTrigger>
        </TabsList>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-2">
          {matches.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No matches found for this player.
            </p>
          ) : (
            matches.map((match) => {
              const isPlayer1 = match.player1_id === playerId;
              const won = match.winner_id === playerId;
              return (
                <Card key={match.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={won ? "default" : "destructive"} className="text-xs shrink-0">
                        {won ? "W" : "L"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {match.tourney_name} — {match.round}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {match.surface} · {match.tourney_date}
                        </p>
                      </div>
                      <p className="text-sm font-mono shrink-0">{match.score}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No notes added yet. Go to{" "}
              <Link href="/admin" className="text-primary hover:underline">
                Admin
              </Link>{" "}
              to add notes.
            </p>
          ) : (
            notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < note.confidence ? "bg-primary" : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Confidence {note.confidence}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* AI Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-sm">
                AI profile generation coming soon. This will use Gemini Flash to create
                a comprehensive player analysis based on match data and your notes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
