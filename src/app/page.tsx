"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player, Prediction, Match } from "@/types/tennis";
import { Users, Target, Trophy, Zap, ArrowRight, TrendingUp, Activity } from "lucide-react";

const ISO_A3_TO_A2: Record<string, string> = {
  AFG:"af", ALB:"al", ALG:"dz", AND:"ad", ANG:"ao", ANT:"ag", ARG:"ar", ARM:"am", AUS:"au", AUT:"at",
  AZE:"az", BAH:"bs", BHR:"bh", BAN:"bd", BAR:"bb", BLR:"by", BEL:"be", BLZ:"bz", BEN:"bj", BER:"bm",
  BHU:"bt", BOL:"bo", BIH:"ba", BOT:"bw", BRA:"br", BRU:"bn", BUL:"bg", BUR:"mm",
  CAN:"ca", CPV:"cv", CAY:"ky", CAF:"cf", CHI:"cl", CHN:"cn", COL:"co", COM:"km", CGO:"cg", COD:"cd",
  COK:"ck", CRC:"cr", CIV:"ci", CRO:"hr", CUB:"cu", CYP:"cy", CZE:"cz", DEN:"dk", DJI:"dj", DMA:"dm",
  DOM:"do", ECU:"ec", EGY:"eg", ESA:"sv", GNQ:"gq", ERI:"er", EST:"ee", SWZ:"sz", ETH:"et", FAR:"fo",
  FIJ:"fj", FIN:"fi", FRA:"fr", GAB:"ga", GAM:"gm", GEO:"ge", GER:"de", GHA:"gh", GRC:"gr",
  GRN:"gd", GUA:"gu", GUI:"gn", GUY:"gy", HAI:"ht", HON:"hn", HKG:"hk", HUN:"hu", ISL:"is", IND:"in",
  INA:"id", IRI:"ir", IRL:"ie", IRQ:"iq", ISR:"il", ITA:"it", JAM:"jm", JPN:"jp", JOR:"jo", KAZ:"kz",
  KEN:"ke", KIR:"ki", KOR:"kr", KUW:"kw", KGZ:"kg", LAO:"la", LAT:"lv", LBA:"lb", LES:"ls", LBR:"lr",
  LBY:"ly", LIE:"li", LTU:"lt", LUX:"lu", MAD:"mg", MWI:"mw", MAS:"my", MLI:"ml", MLT:"mt",
  MHL:"mh", MRT:"mr", MRI:"mu", MEX:"mx", FSM:"fm", MDA:"md", MON:"mc", MNE:"me", MAR:"ma", MOZ:"mz",
  MYA:"mm", NAM:"na", NRU:"nr", NPL:"np", NED:"nl", NZL:"nz", NCA:"ni", NIG:"ne", NGR:"ng", MKD:"mk",
  NOR:"no", OMA:"om", PAK:"pk", PLW:"pw", PAN:"pa", PNG:"pg", PAR:"py", PER:"pe", PHI:"ph", POL:"pl",
  POR:"pt", PUR:"pu", QAT:"qa", ROU:"ro", RUS:"ru", RWA:"rw", LCA:"lc", VIN:"vc", SAM:"ws", SMR:"sm",
  STP:"st", KSA:"sa", SEN:"sn", SRB:"rs", SEY:"sc", SLE:"sl", SGP:"sg", SVK:"sk", SVN:"si", SOL:"sb",
  SOM:"so", RSA:"za", ESP:"es", SRI:"lk", SUD:"sd", SUR:"sy", SWE:"se", SUI:"ch", SYR:"sy", TPE:"tw",
  TJK:"tj", TAN:"tz", THA:"th", TLS:"tl", TOG:"tg", TGA:"to", TRI:"tt", TUN:"tn", TUR:"tr", TKM:"tm",
  TUV:"tv", UGA:"ug", UKR:"ua", UAE:"ae", GBR:"gb", USA:"us", URU:"uy", UZB:"uz", VAN:"vu", VEN:"ve",
  VIE:"vn", YEM:"ye", ZAM:"zm", ZIM:"zw",
};

function CountryFlag({ code }: { code: string }) {
  if (!code) return <span className="text-muted-foreground/40">—</span>;
  const c = code.toUpperCase();
  const a2 = c.length === 2 ? c.toLowerCase() : ISO_A3_TO_A2[c];
  if (!a2) return <span className="text-muted-foreground/40">—</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${a2}.png`}
      alt={c}
      className="w-5 h-[14px] rounded-[2px] object-cover shrink-0"
      loading="lazy"
    />
  );
}

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
  const w = 200;
  const h = 60;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" className="chart-line" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill="var(--color-primary)" className="glow-dot" style={{ animation: "none" }} />
    </svg>
  );
}

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    async function loadData() {
      const db = getSupabase();
      const [countRes, playersRes, predictionsRes, matchesRes] = await Promise.all([
        db.from("players").select("*", { count: "exact", head: true }),
        db.from("players").select("*").order("name").limit(15),
        db.from("predictions").select("*").order("created_at", { ascending: false }).limit(20),
        db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(10),
      ]);
      setTotalPlayers(countRes.count ?? 0);
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
            <span className="text-primary/70 italic">Smarter tennis through data.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60 glass px-4 py-2 rounded-xl">
          <span className="text-xs">📅</span>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass stat-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                {stat.spark && (
                  <Sparkline data={stat.spark} />
                )}
              </div>
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
                  {players.slice(0, 10).map((player, i) => (
                    <tr key={player.id} className="table-row group">
                      <td className="px-6 py-3 font-mono text-muted-foreground/40">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/players/${player.id}`} className="flex items-center gap-3 group/link">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover/link:bg-primary/20 transition-all">
                            {player.name.charAt(0)}
                          </div>
                          <span className="font-medium truncate group-hover/link:text-primary transition-colors">{player.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CountryFlag code={player.country_code} />
                          <span className="text-muted-foreground/60">{player.country_code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground/60">{player.hand === "L" ? "Left-handed" : "Right-handed"}</td>
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
              <span className="text-[10px] text-primary/60 font-medium uppercase tracking-wider">View all →</span>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {recentMatches.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-muted-foreground text-sm">No matches yet</p>
                </div>
              ) : (
                recentMatches.slice(0, 5).map((match) => (
                  <div key={match.id} className="px-5 py-3 table-row">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate font-mono">{match.score || "vs"}</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          {match.tourney_name || "Unknown"} · {match.surface || "—"}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground/40 shrink-0 ml-3 font-mono">
                        {match.tourney_date?.slice(0, 4) || "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prediction Confidence Chart */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary/60" />
                <h2 className="font-semibold text-sm">Prediction Confidence</h2>
              </div>
              <span className="ai-badge text-[10px] font-bold text-primary px-2.5 py-1 rounded-lg uppercase tracking-wider">AI Insights</span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-3xl font-bold text-primary">72%</span>
            </div>
            <MiniLineChart data={confData} />
            <div className="flex justify-between text-[10px] text-muted-foreground/30 mt-2 font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
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
                href="/admin"
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
