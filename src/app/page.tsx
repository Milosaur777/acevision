"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Trophy, TrendingUp, Users, Calendar, ArrowUpRight, ArrowDownRight, Zap, Target } from "lucide-react";

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [playersRes, predictionsRes, matchesRes] = await Promise.all([
        db.from("players").select("*").order("name").limit(10),
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Players", value: players.length, icon: Users, change: null, color: "text-primary" },
    { label: "AI Predictions", value: predictions.length, icon: Target, change: null, color: "text-emerald-400" },
    { label: "Matches Tracked", value: recentMatches.length, icon: Trophy, change: null, color: "text-cyan-400" },
    { label: "Win Rate", value: "—", icon: Zap, change: null, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back to AceVision</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`p-2 rounded-xl bg-primary/10`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight">{stat.value}</span>
                {stat.change && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${stat.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {stat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(stat.change)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Players - takes 2 cols */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Top Players</h2>
            <Link href="/players" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {players.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-muted-foreground text-sm">No players yet</p>
                <Link href="/import" className="text-primary text-sm hover:underline mt-1 inline-block">
                  Import data to get started
                </Link>
              </div>
            ) : (
              players.map((player, i) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-mono text-muted-foreground w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.country_code} · {player.hand === "L" ? "Left" : "Right"}-handed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">#{i + 1}</p>
                    <p className="text-[11px] text-muted-foreground">{player.play_style || "—"}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Recent Matches */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Recent Matches</h2>
            </div>
            <div className="divide-y divide-border">
              {recentMatches.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-muted-foreground text-sm">No matches yet</p>
                </div>
              ) : (
                recentMatches.map((match) => (
                  <div key={match.id} className="px-5 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {match.score || "vs"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {match.tourney_name || "Unknown"} · {match.surface || "—"}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                        {match.tourney_date?.slice(0, 4) || "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-semibold mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Users className="h-4 w-4" />
                Add Player
              </Link>
              <Link
                href="/analysis"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Run Analysis
              </Link>
              <Link
                href="/import"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <Trophy className="h-4 w-4" />
                Import Data
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
