"use client";

import { useState, useEffect } from "react";
import { Upload, Download, Check, AlertCircle, ExternalLink, Trash2, Scan, Trophy, RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import type { Match } from "@/types/tennis";
import { cn } from "@/lib/utils";
import PageBackground from "@/components/page-background";

const CSV_SOURCES = [
  { label: "ATP Matches 2026", url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2026.csv" },
  { label: "ATP Matches 2025", url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2025.csv" },
  { label: "ATP Matches 2024", url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2024.csv" },
  { label: "ATP Matches 2023", url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/atp/atp_matches_2023.csv" },
  { label: "WTA Matches 2024", url: "https://raw.githubusercontent.com/Aneeshers/tennis-sackmann-archive/main/wta/wta_matches_2024.csv" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ message: string; new: number; skipped: number; created_players: number; details: { match: string; status: string }[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ message: string; updated: number; inserted: number; skipped: number; details: { match: string; status: string }[] } | null>(null);

  useEffect(() => {
    async function loadMatches() {
      const db = getSupabase();
      const { data } = await db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(20);
      setRecentMatches(data ?? []);
    }
    loadMatches();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(0, 6);
      setPreview(lines.map((line) => line.split(",")));
    };
    reader.readAsText(selected);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content: text }),
      });
      const data = await res.json();
      setResult({
        success: res.ok,
        message: res.ok ? `Imported ${data.count ?? "data"} from ${file.name}` : data.error ?? "Import failed",
      });
    } catch {
      setResult({ success: false, message: "Import failed. Check console." });
    } finally {
      setImporting(false);
    }
  }

  async function downloadAndImport(source: { label: string; url: string }) {
    setImporting(true);
    setResult(null);
    try {
      const importRes = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: source.label, url: source.url }),
      });
      const data = await importRes.json();
      setResult({
        success: importRes.ok,
        message: importRes.ok ? `Imported ${data.count ?? "data"} from ${source.label}` : data.error ?? "Import failed",
      });
    } catch (err) {
      setResult({ success: false, message: `Failed: ${err}` });
    } finally {
      setImporting(false);
    }
  }

  async function scanMatches() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scan-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour: "atp", days: 14 }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
        // Refresh recent matches
        const db = getSupabase();
        const { data: matchesData } = await db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(20);
        setRecentMatches(matchesData ?? []);
      } else {
        setScanResult({ message: data.error || "Scan failed", new: 0, skipped: 0, created_players: 0, details: [] });
      }
    } catch {
      setScanResult({ message: "Scan failed. Check RAPIDAPI_KEY in .env.local", new: 0, skipped: 0, created_players: 0, details: [] });
    } finally {
      setScanning(false);
    }
  }

  async function refreshStats() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/refresh-stats", { method: "POST" });
      const data = await res.json();
      setRefreshResult(data);
      // Refresh recent matches
      const db = getSupabase();
      const { data: matchesData } = await db.from("matches").select("*").order("tourney_date", { ascending: false }).limit(20);
      setRecentMatches(matchesData ?? []);
    } catch {
      setRefreshResult({ message: "Refresh failed", updated: 0, inserted: 0, skipped: 0, details: [] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <PageBackground mobileSrc="/import-bg-mobile.avif" desktopSrc="/import-bg.avif" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Import ATP/WTA match data from CSV files</p>
      </div>

      {/* Auto Match Scanner */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-3">
          <Scan className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Auto Match Scanner</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Scan Tennis-API.com for upcoming ATP matches. Auto-creates missing players. Checks for duplicates.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={scanMatches}
            disabled={scanning}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {scanning ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Scanning...</>
            ) : (
              <><Scan className="h-4 w-4" /> Scan Next 14 Days</>
            )}
          </button>
          <span className="text-xs text-muted-foreground/50">Requires RapidAPI key</span>
        </div>

        {scanResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{scanResult.message}</span>
            </div>
            {scanResult.created_players > 0 && (
              <p className="text-xs text-muted-foreground">Created {scanResult.created_players} new players</p>
            )}
            {scanResult.details && scanResult.details.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {scanResult.details.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-white/[0.02]">
                    <span className="text-muted-foreground truncate">{d.match}</span>
                    <span className={d.status === "Imported" ? "text-primary" : d.status === "Already exists" ? "text-muted-foreground/50" : "text-red-400"}>
                      {d.status}
                    </span>
                  </div>
                ))}
                {scanResult.details.length > 10 && (
                  <p className="text-xs text-muted-foreground/40 text-center">+{scanResult.details.length - 10} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Import */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Quick Import</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">One-click import from Jeff Sackmann&apos;s ATP/WTA database on GitHub.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CSV_SOURCES.map((source) => (
            <button key={source.url} disabled={importing} onClick={() => downloadAndImport(source)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] text-foreground text-sm font-medium hover:bg-white/[0.07] transition-all disabled:opacity-50 text-left border border-white/[0.04]">
              <Download className="h-4 w-4 shrink-0 text-primary" />
              {source.label}
            </button>
          ))}
        </div>
        <a href="https://github.com/JeffSackmann/tennis_atp/tree/master" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3">
          <ExternalLink className="h-3 w-3" /> More CSV files on GitHub
        </a>
      </div>

      {/* Refresh Match Stats */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Refresh Match Stats</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Fetch latest Sackmann CSV data to enrich matches with full stats (aces, serve %, break points).
          Updates existing matches and inserts missing ones.
        </p>
        <button
          onClick={refreshStats}
          disabled={refreshing}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Refreshing...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Refresh Stats from CSV</>
          )}
        </button>

        {refreshResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{refreshResult.message}</span>
            </div>
            {refreshResult.details && refreshResult.details.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {refreshResult.details.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-white/[0.02]">
                    <span className="text-muted-foreground truncate">{d.match}</span>
                    <span className={d.status === "Updated stats" ? "text-primary" : d.status === "Inserted" ? "text-cyan-400" : "text-muted-foreground/50"}>
                      {d.status}
                    </span>
                  </div>
                ))}
                {refreshResult.details.length > 10 && (
                  <p className="text-xs text-muted-foreground/40 text-center">+{refreshResult.details.length - 10} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual CSV Upload */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Manual CSV Upload</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Upload a CSV file in Jeff Sackmann format.</p>
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <div className="flex items-center justify-center gap-2 border-2 border-dashed border-white/[0.06] rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : "Choose CSV file..."}</span>
            </div>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
          <button onClick={handleImport} disabled={!file || importing}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all disabled:opacity-50">
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
        {preview.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows):</p>
            <table className="w-full text-xs">
              <thead><tr>{preview[0]?.slice(0, 8).map((col, i) => (
                <th key={i} className="text-left p-2 border-b border-white/[0.06] font-medium text-muted-foreground">{col}</th>
              ))}</tr></thead>
              <tbody>{preview.slice(1).map((row, i) => (
                <tr key={i}>{row.slice(0, 8).map((cell, j) => (
                  <td key={j} className="p-2 border-b border-white/[0.04]">{cell}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          "glass p-5 flex items-center gap-3",
          result.success ? "border-primary/20" : "border-red-500/20"
        )}>
          {result.success ? <Check className="h-5 w-5 text-primary shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      {/* Recent Imports */}
      <div className="glass">
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary/60" />
            <h2 className="font-semibold text-sm">Recent Imports</h2>
          </div>
          <span className="text-xs text-muted-foreground">{recentMatches.length} matches</span>
        </div>
        <div className="px-4 py-2 space-y-1">
          {recentMatches.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No matches imported yet</p>
            </div>
          ) : (
            recentMatches.map((match) => {
              const isDeleting = deleteConfirm === match.id;
              return (
                <div key={match.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono">{match.score || "vs"}</p>
                    <p className="text-xs text-muted-foreground/50">
                      {match.tourney_name} · {match.surface} · {match.tourney_date?.slice(0, 4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Delete?</span>
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/matches/${match.id}`, { method: "DELETE" });
                              setRecentMatches(recentMatches.filter((m) => m.id !== match.id));
                              setDeleteConfirm(null);
                            } catch (error) {
                              console.error("Failed to delete match:", error);
                            }
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(match.id)}
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
    </div>
  );
}
