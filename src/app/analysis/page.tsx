"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Zap, Target, TrendingUp, Swords, Brain, Trash2, CheckCircle2, XCircle, Clock, Filter, Calendar } from "lucide-react";
import PageBackground from "@/components/page-background";

interface AnalysisResult {
  predicted_winner_id: string;
  confidence: number;
  reasoning: string;
  tactics_player1: string;
  tactics_player2: string;
}

type FilterType = "all" | "match" | "hypothetical";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const matchParam = searchParams.get("match");

  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [surface, setSurface] = useState("Hard");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [isMatch, setIsMatch] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [matchTourney, setMatchTourney] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const today = new Date().toISOString().split("T")[0];
      const [{ data: playersData }, { data: predictionsData }, { data: matchesData }, { data: upcomingData }] = await Promise.all([
        db.from("players").select("*").order("name"),
        db.from("predictions").select("*").order("created_at", { ascending: false }),
        db.from("matches").select("*").not("winner_id", "is", null),
        db.from("matches").select("*").is("winner_id", null).gte("tourney_date", today).order("tourney_date", { ascending: true }).limit(20),
      ]);
      setPlayers(playersData ?? []);
      setPredictions(predictionsData ?? []);
      setMatches(matchesData ?? []);
      setUpcomingMatches(upcomingData ?? []);

      // If match param present, fetch that match and pre-fill
      if (matchParam) {
        const { data: matchData } = await db.from("matches").select("*").eq("id", matchParam).single();
        if (matchData) {
          setPlayer1Id(matchData.player1_id || "");
          setPlayer2Id(matchData.player2_id || "");
          setSurface(matchData.surface || "Hard");
          setSelectedMatchId(matchData.id);
          setIsMatch(true);
          setActiveTab("new");
        }
      }
    }
    loadData();
  }, [matchParam]);

  async function runAnalysis() {
    if (!player1Id || !player2Id || player1Id === player2Id) return;
    setLoading(true);
    setResult(null);
    try {
      // If "real match" is checked and no existing match selected, create one first
      let matchId = selectedMatchId;
      if (isMatch && !matchId && matchDate) {
        const db = getSupabase();
        const { data: newMatch, error: matchError } = await db.from("matches").insert({
          id: `manual-${Date.now()}`,
          player1_id: player1Id,
          player2_id: player2Id,
          surface,
          tourney_date: matchDate,
          tourney_name: matchTourney || "Manual Prediction",
          round: "Custom",
          score: "",
          winner_id: null,
        }).select().single();
        if (!matchError && newMatch) {
          matchId = newMatch.id;
          // Add to local matches state
          setMatches((prev) => [newMatch, ...prev]);
        }
      }

      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1_id: player1Id, player2_id: player2Id, surface, match_id: matchId }),
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
          aria-selected={activeTab === "new"}
          className="nav-item flex-1 justify-center"
        >
          New Prediction
        </button>
        <button
          onClick={() => setActiveTab("history")}
          aria-selected={activeTab === "history"}
          className="nav-item flex-1 justify-center"
        >
          Prediction History ({predictions.length})
        </button>
      </div>

      {activeTab === "new" ? (
        <>
          {/* Selected Match Banner */}
          {selectedMatchId && (() => {
            const selMatch = matches.find((m) => m.id === selectedMatchId);
            const p1 = players.find((p) => p.id === selMatch?.player1_id);
            const p2 = players.find((p) => p.id === selMatch?.player2_id);
            return selMatch ? (
              <div className="ace-glass p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{p1?.name} vs {p2?.name}</p>
                    <p className="text-xs text-muted-foreground/50">{selMatch.tourney_name} · {selMatch.surface} · {selMatch.tourney_date}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedMatchId(null); setPlayer1Id(""); setPlayer2Id(""); setSurface("Hard"); }} className="text-xs text-muted-foreground/50 hover:text-primary transition-colors">Clear</button>
              </div>
            ) : null;
          })()}

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
              {!selectedMatchId && (
                <>
                  <div className="flex items-center gap-2 mb-0.5">
                    <input
                      type="checkbox"
                      id="isMatch"
                      checked={isMatch}
                      onChange={(e) => setIsMatch(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-primary focus:ring-primary/30"
                    />
                    <label htmlFor="isMatch" className="text-xs text-muted-foreground/60 cursor-pointer">Real match</label>
                  </div>
                  {isMatch && (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Match date</label>
                        <input
                          type="date"
                          value={matchDate}
                          onChange={(e) => setMatchDate(e.target.value)}
                          className={inputCls + " w-auto"}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground/60 mb-1.5 block uppercase tracking-wider">Tournament</label>
                        <input
                          type="text"
                          value={matchTourney}
                          onChange={(e) => setMatchTourney(e.target.value)}
                          placeholder="e.g. Australian Open"
                          className={inputCls + " w-auto"}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              <button onClick={runAnalysis}
                disabled={!player1Id || !player2Id || player1Id === player2Id || loading}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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

          {/* Upcoming Matches */}
          {upcomingMatches.length > 0 && (
            <div className="glass">
              <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary/60" />
                  <h2 className="font-semibold text-sm">Upcoming Matches</h2>
                </div>
                <Link href="/import" className="text-[10px] text-primary/60 font-medium uppercase tracking-wider hover:text-primary transition-colors">Scan more →</Link>
              </div>
              <div className="px-4 py-2 space-y-1">
                {upcomingMatches.slice(0, 10).map((match) => {
                  const p1 = players.find((p) => p.id === match.player1_id);
                  const p2 = players.find((p) => p.id === match.player2_id);
                  return (
                    <button
                      key={match.id}
                      onClick={() => {
                        setPlayer1Id(match.player1_id || "");
                        setPlayer2Id(match.player2_id || "");
                        setSurface(match.surface || "Hard");
                        setSelectedMatchId(match.id);
                        setIsMatch(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary/80 transition-colors">
                          {p1?.name || match.player1_id} vs {p2?.name || match.player2_id}
                        </p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          {match.tourney_name || "Unknown"} · {match.surface || "—"}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground/40 shrink-0 ml-3 font-mono">
                        {match.tourney_date?.slice(5) || "—"}
                      </span>
                    </button>
                  );
                })}
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

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 rounded-2xl border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
      <AnalysisContent />
    </Suspense>
  );
}
