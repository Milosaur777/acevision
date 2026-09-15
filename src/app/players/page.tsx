"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player } from "@/types/tennis";
import { Search } from "lucide-react";

function PlayersContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    async function loadPlayers() {
      const db = getSupabase();
      const { data } = await db.from("players").select("*").order("name");
      setPlayers(data ?? []);
      setLoading(false);
    }
    loadPlayers();
  }, []);

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.country_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {players.length} players in database
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full glass px-10 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
        />
      </div>

      {/* Player Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.04]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/[0.04] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="text-muted-foreground">
            {search ? "No players match your search" : "No players imported yet"}
          </p>
          {!search && (
            <Link href="/import" className="text-primary text-sm hover:underline mt-2 inline-block">
              Import player data
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {filtered.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="glass stat-card p-5 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(163,230,53,0.1)] transition-all">
                  {player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.country_code} · {player.hand === "L" ? "Left" : "Right"}
                  </p>
                </div>
              </div>
              {(player.strengths?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {player.strengths!.slice(0, 3).map((s) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <PlayersContent />
    </Suspense>
  );
}
