"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Player } from "@/types/tennis";
import { Zap, Target, TrendingUp, Swords } from "lucide-react";

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
      const { data } = await db.from("players").select("*").order("name");
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
        body: JSON.stringify({ player1_id: player1Id, player2_id: player2Id, surface }),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Match Analysis</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Compare two players and get AI-powered predictions</p>
      </div>

      {/* Player Selection */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Player 1</label>
            <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)}
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
              <option value="">Select player...</option>
              {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Player 2</label>
            <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)}
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
              <option value="">Select player...</option>
              {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
            </select>
          </div>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Surface</label>
            <select value={surface} onChange={(e) => setSurface(e.target.value)}
              className="bg-input border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
              <option value="Hard">Hard</option>
              <option value="Clay">Clay</option>
              <option value="Grass">Grass</option>
              <option value="Indoor">Indoor</option>
            </select>
          </div>
          <button onClick={runAnalysis}
            disabled={!player1Id || !player2Id || player1Id === player2Id || loading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Analyzing...</>
            ) : (
              <><Swords className="h-4 w-4" /> Run Analysis</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && player1 && player2 && (
        <div className="space-y-4">
          {/* Winner Prediction */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Prediction</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {players.find((p) => p.id === result.predicted_winner_id)?.name ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{result.reasoning}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{Math.round(result.confidence * 100)}%</p>
                <p className="text-[11px] text-muted-foreground">confidence</p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${result.confidence * 100}%` }} />
            </div>
          </div>

          {/* Tactics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">{player1.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.tactics_player1}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-cyan-400" />
                <h3 className="font-medium text-sm">{player2.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.tactics_player2}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
