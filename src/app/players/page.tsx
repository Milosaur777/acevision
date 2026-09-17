"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import type { Player } from "@/types/tennis";
import { Search, Trash2, Trophy, RefreshCw } from "lucide-react";
import { CountryFlag, HandEmoji } from "@/components/country-flag";
import PageBackground from "@/components/page-background";

function PlayersContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [countryFilter, setCountryFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [updatingRankings, setUpdatingRankings] = useState(false);
  const [rankingsMessage, setRankingsMessage] = useState("");

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
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.country_code.toLowerCase().includes(search.toLowerCase())) &&
      (!countryFilter || p.country_code.toLowerCase().includes(countryFilter.toLowerCase()))
  );

  const uniqueCountries = [...new Set(players.map((p) => p.country_code).filter(Boolean))].sort();

  async function deletePlayer(id: string) {
    try {
      await fetch(`/api/players/${id}`, { method: "DELETE" });
      setPlayers(players.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete player:", error);
    }
  }

  async function updateRankings() {
    setUpdatingRankings(true);
    setRankingsMessage("");
    try {
      const res = await fetch("/api/update-rankings", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRankingsMessage(data.message);
        // Refresh players to show new rankings
        const db = getSupabase();
        const { data: freshPlayers } = await db.from("players").select("*").order("name");
        setPlayers(freshPlayers ?? []);
      } else {
        setRankingsMessage(data.error || "Failed to update rankings");
      }
    } catch {
      setRankingsMessage("Failed to update. Check RAPIDAPI_KEY.");
    } finally {
      setUpdatingRankings(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <PageBackground mobileSrc="/players-bg-mobile.avif" desktopSrc="/players-bg.avif" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {players.length} players in database
          </p>
          {rankingsMessage && (
            <p className="text-xs text-primary mt-1">{rankingsMessage}</p>
          )}
        </div>
        <button
          onClick={updateRankings}
          disabled={updatingRankings}
          aria-selected="true"
          className="nav-item nav-item--dark-text disabled:opacity-50"
        >
          {updatingRankings ? (
            <><RefreshCw className="nav-item__icon animate-spin" /> Updating...</>
          ) : (
            <><Trophy className="nav-item__icon" /> Sync Rankings</>
          )}
        </button>
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

      {/* Country filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by country..."
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="w-full glass px-10 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
        />
        {countryFilter && (
          <button
            onClick={() => setCountryFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
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
          {filtered.map((player) => {
            const isDeleting = deleteConfirm === player.id;
            return (
              <div key={player.id} className="glass stat-card p-5 group relative">
                <Link href={`/players/${player.id}`} className="block">
                  <div className="flex items-center gap-3">
                    {"avatar_url" in player && (player as any).avatar_url ? (
                      <img
                        src={(player as any).avatar_url}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover border border-primary/10 shrink-0 group-hover:shadow-[0_0_15px_rgba(163,230,53,0.1)] transition-all"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(163,230,53,0.1)] transition-all">
                        {player.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {"ranking" in player && (player as any).ranking && (
                          <span className="text-[10px] font-mono text-primary/50 shrink-0">#{(player as any).ranking}</span>
                        )}
                        <p className="font-medium truncate text-sm">{player.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CountryFlag code={player.country_code} />
                        <span>{player.country_code}</span>
                        <span>·</span>
                        <HandEmoji hand={player.hand} />
                        <span>{player.hand === "L" ? "Left" : "Right"}</span>
                      </p>
                    </div>
                  </div>
                  {player.strengths?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {player.strengths!.slice(0, 3).map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                {/* Delete button */}
                <div className="absolute top-3 right-3">
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2 py-1.5 rounded-lg">
                      <span className="text-[10px] text-muted-foreground">Delete?</span>
                      <button
                        onClick={(e) => { e.preventDefault(); deletePlayer(player.id); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setDeleteConfirm(null); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteConfirm(player.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
