"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Users, Target, Trophy, Zap, ArrowRight, TrendingUp, Activity, Brain } from "lucide-react";
import { CountryFlag, HandEmoji } from "@/components/country-flag";

function Sparkline({ data, color = "var(--color-primary)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const barW = (w / data.length) * 0.65;
  const gap = (w / data.length) * 0.35;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {data.map((v, i) => {
        const barH = (v / max) * h;
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={1.5}
            fill={color}
            opacity={0.3 + (v / max) * 0.7}
            className="sparkline-bar"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        );
      })}
    </svg>
  );
}

function MiniLineChart({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 220;
  const h = 70;
  const padding = { top: 15, bottom: 0 };
  const chartH = h - padding.top - padding.bottom;
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const getX = (i: number) => (i / (data.length - 1)) * w;
  const getY = (v: number) => padding.top + chartH - ((v - min) / range) * chartH;

  const points = data.map((v, i) => ({ x: getX(i), y: getY(v), value: v }));

  // Build smooth cubic bezier path
  let pathD = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
    pathD += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
  }

  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <svg width={w} height={h + 25} viewBox={`0 0 ${w} ${h + 25}`} className="overflow-visible">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
        <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Vertical dotted lines from each point to bottom */}
      {points.map((p, i) => (
        <line
          key={`vline-${i}`}
          x1={p.x}
          y1={p.y}
          x2={p.x}
          y2={h}
          stroke="var(--color-primary)"
          strokeWidth="0.5"
          strokeDasharray="2,3"
          opacity="0.12"
        />
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#chartGrad)" />

      {/* Smooth line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Dots at each data point */}
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <g key={`dot-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isLast ? 5 : 3}
              fill={isLast ? "var(--color-primary)" : "var(--color-background)"}
              stroke="var(--color-primary)"
              strokeWidth={isLast ? 0 : 1.5}
              filter={isLast ? "url(#dotGlow)" : undefined}
            />
            {isLast && (
              <circle
                cx={p.x}
                cy={p.y}
                r={2.5}
                fill="var(--color-primary-foreground)"
              />
            )}
          </g>
        );
      })}

      {/* Tooltip on last point */}
      <g transform={`translate(${lastPoint.x}, ${lastPoint.y - 14})`}>
        {/* Tooltip background */}
        <rect
          x="-20"
          y="-24"
          width="40"
          height="20"
          rx="6"
          fill="rgba(10, 14, 10, 0.85)"
          stroke="rgba(163, 230, 53, 0.25)"
          strokeWidth="1"
        />
        {/* Tooltip text */}
        <text
          x="0"
          y="-10"
          textAnchor="middle"
          fill="var(--color-primary)"
          fontSize="10"
          fontWeight="600"
        >
          {Math.round(lastPoint.value)}%
        </text>
        {/* Tooltip arrow */}
        <path
          d={`M-3,-4 L0,-1 L3,-4`}
          fill="rgba(10, 14, 10, 0.85)"
          stroke="rgba(163, 230, 53, 0.25)"
          strokeWidth="0"
        />
        <line x1="0" y1="-4" x2="0" y2="-1" stroke="rgba(10, 14, 10, 0.85)" strokeWidth="2" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState({ accuracy: 0, total_resolved: 0, total_predictions: 0, chart_data: [] as number[], correct_count: 0, message: "" });

  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [countRes, predictionsRes, matchesRes, accuracyRes] = await Promise.all([
        db.from("players").select("*", { count: "exact", head: true }),
        db.from("predictions").select("*").order("created_at", { ascending: false }).limit(20),
        db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(10),
        fetch("/api/accuracy").then(r => r.json()).catch(() => ({ accuracy: 0, total_resolved: 0, chart_data: [], message: "Unavailable" })),
      ]);
      // Load all players for name resolution in predictions
      let playersRes = await db.from("players").select("*").order("ranking", { ascending: true, nullsFirst: false }).order("name");
      if (playersRes.error) {
        playersRes = await db.from("players").select("*").order("name");
      }
      setTotalPlayers(countRes.count ?? 0);
      setPlayers(playersRes.data ?? []);
      setPredictions(predictionsRes.data ?? []);
      setRecentMatches(matchesRes.data ?? []);
      setAccuracy(accuracyRes);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const sparkData1 = [3, 5, 4, 7, 6, 8, 5, 9, 7, 10, 8, 11];
  const sparkData2 = [1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0];
  const sparkData3 = [20, 35, 28, 42, 38, 55, 48, 62, 58, 75, 68, 82];
  const confData = [65, 72, 68, 80, 75, 82, 78, 88, 85, 72, 80, 85];

  const stats = [
    { label: "Total Players", value: totalPlayers, sub: "Active in database", icon: Users, spark: sparkData1 },
    { label: "AI Predictions", value: predictions.length, sub: "Predictions generated", icon: Target, spark: sparkData2 },
    { label: "Matches Tracked", value: recentMatches.length, sub: "Total matches analyzed", icon: Trophy, spark: sparkData3 },
    { label: "Win Rate", value: "—%", sub: "Not enough data yet", icon: Zap, spark: null },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back to AceVision{" "}
            <span className="text-primary/70 italic block md:inline">Smarter tennis through data.</span>
          </p>
        </div>
        {/* Logo on mobile, date on desktop */}
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <img src="/logo.avif" alt="AceVision" className="h-10 w-auto rounded-lg object-contain" />
          </div>
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground/90 glass px-4 py-2 rounded-xl">
            <span className="text-xs">📅</span>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass stat-card p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              {stat.spark && (
                <div className="w-full flex justify-end">
                  <Sparkline data={stat.spark} />
                </div>
              )}
              <div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Players Table — 2 cols */}
        <div className="lg:col-span-2 glass">
          <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary/60" />
              <h2 className="font-semibold text-sm">Top Players</h2>
            </div>
            <Link href="/players" className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {players.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">No players yet</p>
              <Link href="/import" className="text-primary text-sm hover:underline mt-1 inline-block">
                Import data to get started
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider border-b border-white/[0.03]">
                    <th className="text-left px-6 py-2.5 w-10">#</th>
                    <th className="text-left px-4 py-2.5">Player</th>
                    <th className="text-left px-4 py-2.5 w-36">Country</th>
                    <th className="text-left px-4 py-2.5 w-36">Handedness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {players.slice(0, 20).map((player, i) => (
                    <tr key={player.id} className="table-row group">
                      <td className="px-6 py-3 font-mono text-muted-foreground/40">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/players/${player.id}`} className="flex items-center gap-3 group/link">
                          {"avatar_url" in player && (player as any).avatar_url ? (
                            <img
                              src={(player as any).avatar_url}
                              alt={player.name}
                              className="w-8 h-8 rounded-full object-cover border border-primary/10 shrink-0 group-hover/link:shadow-[0_0_12px_rgba(163,230,53,0.15)] transition-all"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover/link:bg-primary/20 transition-all">
                              {player.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium truncate group-hover/link:text-primary transition-colors">{player.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CountryFlag code={player.country_code} />
                          <span className="text-muted-foreground/60">{player.country_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground/60"><span className="inline-flex items-center gap-1.5"><HandEmoji hand={player.hand} />{player.hand === "L" ? "Left-handed" : "Right-handed"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Recent Matches */}
          <div className="glass">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary/60" />
                <h2 className="font-semibold text-sm">Recent Matches</h2>
              </div>
              <Link href="/analysis" className="text-[10px] text-primary/60 font-medium uppercase tracking-wider hover:text-primary transition-colors">View all →</Link>
            </div>
            <div className="px-4 py-2 space-y-1">
              {recentMatches.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">No matches yet</p>
                </div>
              ) : (
                recentMatches.slice(0, 5).map((match) => (
                  <Link
                    key={match.id}
                    href={`/analysis?match=${match.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate font-mono group-hover:text-primary/80 transition-colors">{match.score || "vs"}</p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">
                        {match.tourney_name || "Unknown"} · {match.surface || "—"}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground/40 shrink-0 ml-3 font-mono">
                      {match.tourney_date?.slice(0, 4) || "—"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Prediction Accuracy Chart */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary/60" />
                <h2 className="font-semibold text-sm">
                  {accuracy.total_resolved >= 2 ? "Prediction Accuracy" : "Prediction Confidence"}
                </h2>
              </div>
              <span className="ai-badge text-[10px] font-bold text-primary px-2.5 py-1 rounded-lg uppercase tracking-wider">AI Insights</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              {accuracy.total_resolved >= 2 ? (
                <>
                  <span className="text-3xl font-bold text-primary">{accuracy.accuracy}%</span>
                  <span className="text-xs text-muted-foreground/50 mb-1">
                    {accuracy.correct_count}/{accuracy.total_resolved} correct
                  </span>
                </>
              ) : accuracy.total_predictions >= 2 ? (
                <>
                  <span className="text-3xl font-bold text-primary">{accuracy.total_predictions}</span>
                  <span className="text-xs text-muted-foreground/50 mb-1">predictions made</span>
                </>
              ) : (
                <span className="text-lg font-bold text-muted-foreground/50">Need more data</span>
              )}
            </div>
            {accuracy.chart_data.length >= 2 ? (
              <MiniLineChart data={accuracy.chart_data} />
            ) : accuracy.total_predictions >= 2 ? (
              <>
                <MiniLineChart data={predictions.slice(0, 12).map((p) => Math.round((p.confidence || 0) * 100)).reverse()} />
                <p className="text-[10px] text-muted-foreground/30 mt-2">Confidence trend — link predictions to matches for accuracy tracking</p>
              </>
            ) : (
              <div className="h-16 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/30">Make predictions to see trends</p>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground/30 mt-2 font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Past Predictions */}
          <div className="glass">
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary/60" />
                <h2 className="font-semibold text-sm">Past Predictions</h2>
              </div>
              <Link href="/analysis" className="text-[10px] text-primary/60 font-medium uppercase tracking-wider hover:text-primary transition-colors">View all →</Link>
            </div>
            <div className="px-4 py-2 space-y-1">
              {predictions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">No predictions yet</p>
                </div>
              ) : (
                predictions.slice(0, 5).map((pred) => {
                  const isMatchPrediction = pred.match_id !== null;
                  const p1 = players.find((p) => p.id === pred.player1_id);
                  const p2 = players.find((p) => p.id === pred.player2_id);
                  const winner = players.find((p) => p.id === pred.predicted_winner_id);
                  return (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {p1?.name || "?"} vs {p2?.name || "?"}
                          </span>
                          {isMatchPrediction ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 font-medium">Match</span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/40 font-medium">Fun</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Predicted: {winner?.name || "Unknown"} · {Math.round((pred.confidence || 0) * 100)}% confidence
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary/60" />
              <h2 className="font-semibold text-sm">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <Link
                href="/admin?tab=add-player"
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4" />
                  Add Player
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/analysis"
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-foreground text-sm font-medium hover:bg-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Run Analysis
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                href="/import"
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.04] text-foreground text-sm font-medium hover:bg-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  Import Data
                </div>
                <ArrowRight className="h-3.5 w-3.5 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
