"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Calendar } from "lucide-react";

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [playersRes, predictionsRes, matchesRes] = await Promise.all([
        db.from("players").select("*").order("ranking").limit(10),
        db.from("predictions").select("*").order("created_at", { ascending: false }).limit(5),
        db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(5),
      ]);

      setPlayers(playersRes.data ?? []);
      setPredictions(predictionsRes.data ?? []);
      setRecentMatches(matchesRes.data ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading AceVision...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <span className="text-3xl">🎾</span> AceVision
        </h1>
        <p className="text-muted-foreground text-sm">
          AI-powered tennis analysis dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.length}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{predictions.length}</p>
                <p className="text-xs text-muted-foreground">Predictions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentMatches.length}</p>
                <p className="text-xs text-muted-foreground">Recent Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Players */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No players imported yet. Go to{" "}
              <Link href="/import" className="text-primary hover:underline">
                Import
              </Link>{" "}
              to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {players.map((player, i) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-mono text-muted-foreground w-6">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.country_code} · {player.hand === "L" ? "Left" : "Right"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    #{i + 1}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Predictions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No predictions yet. Go to{" "}
              <Link href="/analysis" className="text-primary hover:underline">
                Analysis
              </Link>{" "}
              to generate your first prediction.
            </p>
          ) : (
            <div className="space-y-2">
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pred.reasoning}</p>
                    <p className="text-xs text-muted-foreground">
                      {pred.tournament ?? "Match"} · {pred.surface ?? "—"}
                    </p>
                  </div>
                  <Badge
                    variant={pred.confidence > 0.7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(pred.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
