"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Player } from "@/types/tennis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, Shield, TrendingUp } from "lucide-react";

interface AnalysisResult {
  predicted_winner_id: string;
  confidence: number;
  reasoning: string;
  tactics_player1: string;
  tactics_player2: string;
}

export default function AnalysisPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      const db = getSupabase();
      const { data } = await db
        .from("players")
        .select("*")
        .order("name");
      setPlayers(data ?? []);
    }
    loadPlayers();
  }, []);

  async function runAnalysis() {
    if (!player1Id || !player2Id || player1Id === player2Id) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1_id: player1Id,
          player2_id: player2Id,
          surface,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        predicted_winner_id: player1Id,
        confidence: 0.5,
        reasoning: "Analysis unavailable. Connect n8n to enable AI predictions.",
        tactics_player1: "—",
        tactics_player2: "—",
      });
    } finally {
      setLoading(false);
    }
  }

  const player1 = players.find((p) => p.id === player1Id);
  const player2 = players.find((p) => p.id === player2Id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Match Analysis</h1>
        <p className="text-muted-foreground text-sm">
          Compare two players and get AI-powered predictions
        </p>
      </div>

      {/* Player Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Player 1</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country_code})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Player 2</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country_code})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Surface & Analyze */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Surface</label>
          <select
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="Hard">Hard</option>
            <option value="Clay">Clay</option>
            <option value="Grass">Grass</option>
            <option value="Indoor">Indoor</option>
          </select>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={!player1Id || !player2Id || player1Id === player2Id || loading}
        >
          {loading ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Results */}
      {result && player1 && player2 && (
        <div className="space-y-4">
          {/* Winner Prediction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {players.find((p) => p.id === result.predicted_winner_id)?.name ?? "—"}
                </span>
                <Badge className="text-lg px-3 py-1">
                  {Math.round(result.confidence * 100)}%
                </Badge>
              </div>
              <Progress value={result.confidence * 100} className="h-2" />
              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
            </CardContent>
          </Card>

          {/* Tactics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {player1.name} — Tactics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.tactics_player1}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {player2.name} — Tactics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.tactics_player2}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
