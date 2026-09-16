"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Zap, Target, TrendingUp, Swords, Brain, Trash2, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import PageBackground from "@/components/page-background";

interface AnalysisResult {
  predicted_winner_id: string;
  confidence: number;
  reasoning: string;
  tactics_player1: string;
  tactics_player2: string;
}

type FilterType = "all" | "match" | "hypothetical";

export default function AnalysisPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [{ data: playersData }, { data: predictionsData }, { data: matchesData }] = await Promise.all([
        db.from("players").select("*").order("name"),
        db.from("predictions").select("*").order("created_at", { ascending: false }),
        db.from("matches").select("*").not("winner_id", "is", null),
      ]);
      setPlayers(playersData ?? []);
      setPredictions(predictionsData ?? []);
      setMatches(matchesData ?? []);
    }
    loadData();
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
      // Refresh predictions list
      const db = getSupabase();
      const { data: newPredictions } = await db.from("predictions").select("*").order("created_at", { ascending: false });
      setPredictions(newPredictions ?? []);
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

  async function deletePrediction(id: string) {
    try {
      await fetch(`/api/predictions/${id}`, { method: "DELETE" });
      setPredictions(predictions.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete prediction:", error);
    }
  }

  function getPredictionStatus(pred: Prediction): { label: string; color: string; icon: React.ReactNode } {
    if (!pred.match_id) return { label: "Hypothetical", color: "text-muted-foreground/40", icon: <Brain className="h-3 w-3" /> };
    const match = matches.find((m) => m.id === pred.match_id);
    if (!match?.winner_id) return { label: "Pending", color: "text-yellow-400", icon: <Clock className="h-3 w-3" /> };
    if (pred.predicted_winner_id === match.winner_id) return { label: "Correct", color: "text-primary", icon: <CheckCircle2 className="h-3 w-3" /> };
    return { label: "Wrong", color: "text-red-400", icon: <XCircle className="h-3 w-3" /> };
  }

  const filteredPredictions = predictions.filter((p) => {
    if (filter === "match") return p.match_id !== null;
    if (filter === "hypothetical") return p.match_id === null;
    return true;
  });

  const player1 = players.find((p) => p.id === player1Id);
  const player2 = players.find((p) => p.id === player2Id);
  const inputCls = "w-full glass px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/40";

  return (
    <div className="space-y-6 animate-fade-in relative">
      <PageBackground mobileSrc="/analysis-bg-mobile.avif" desktopSrc="/analysis-bg.avif" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Match Analysis</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Compare two players and get AI-powered predictions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "new" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          New Prediction
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "history" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Prediction History ({predictions.length})
        </button>
      </div>

      {activeTab === "new" ? (
        <>
          {/* Player Selection */}
          <div className="glass p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Player 1</label>
                <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className={inputCls}>
                  <option value="">Select player...</option>
                  {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Player 2</label>
                <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className={inputCls}>
                  <option value="">Select player...</option>
                  {players.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.country_code})</option>))}
                </select>
              </div>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Surface</label>
                <select value={surface} onChange={(e) => setSurface(e.target.value)} className={inputCls + " w-auto"}>
                  <option value="Hard">Hard</option>
                  <option value="Clay">Clay</option>
                  <option value="Grass">Grass</option>
                  <option value="Indoor">Indoor</option>
                </select>
              </div>
              <button onClick={runAnalysis}
                disabled={!player1Id || !player2Id || player1Id === player2Id || loading}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
            <div className="space-y-4 animate-slide-up">
              <div className="glass p-6">
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
                <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all shadow-[0_0_12px_rgba(163,230,53,0.3)]" style={{ width: `${result.confidence * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">{player1.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.tactics_player1}</p>
                </div>
                <div className="glass p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-medium text-sm">{player2.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.tactics_player2}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Prediction History */
        <div className="glass">
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary/60" />
              <h2 className="font-semibold text-sm">Prediction History</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/40" />
              {(["all", "match", "hypothetical"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-medium transition-all ${
                    filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 space-y-1">
            {filteredPredictions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No predictions yet</p>
                <button onClick={() => setActiveTab("new")} className="text-primary text-sm hover:underline mt-1">Make your first prediction</button>
              </div>
            ) : (
              filteredPredictions.map((pred) => {
                const p1 = players.find((p) => p.id === pred.player1_id);
                const p2 = players.find((p) => p.id === pred.player2_id);
                const winner = players.find((p) => p.id === pred.predicted_winner_id);
                const status = getPredictionStatus(pred);
                const isDeleting = deleteConfirm === pred.id;

                return (
                  <div key={pred.id} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p1?.name || "?"} vs {p2?.name || "?"}</span>
                        <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${status.color} bg-white/[0.04]`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/50 mt-1">
                        Predicted: {winner?.name || "Unknown"} · {Math.round((pred.confidence || 0) * 100)}% confidence · {new Date(pred.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Delete?</span>
                          <button onClick={() => deletePrediction(pred.id)} className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-2 py-1 rounded bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] transition-colors">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(pred.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
