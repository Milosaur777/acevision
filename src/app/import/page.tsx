"use client";

import { useState } from "react";
import { Upload, Download, Check, AlertCircle, ExternalLink } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Import ATP/WTA match data from CSV files</p>
      </div>

      {/* Quick Import */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Quick Import</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">One-click import from Jeff Sackmann&apos;s ATP/WTA database on GitHub.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CSV_SOURCES.map((source) => (
            <button key={source.url} disabled={importing} onClick={() => downloadAndImport(source)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 text-left">
              <Download className="h-4 w-4 shrink-0" />
              {source.label}
            </button>
          ))}
        </div>
        <a href="https://github.com/JeffSackmann/tennis_atp/tree/master" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-3">
          <ExternalLink className="h-3 w-3" /> More CSV files on GitHub
        </a>
      </div>

      {/* Manual CSV Upload */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Manual CSV Upload</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Upload a CSV file in Jeff Sackmann format.</p>
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : "Choose CSV file..."}</span>
            </div>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
          <button onClick={handleImport} disabled={!file || importing}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
        {preview.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows):</p>
            <table className="w-full text-xs">
              <thead><tr>{preview[0]?.slice(0, 8).map((col, i) => (
                <th key={i} className="text-left p-2 border-b border-border font-medium text-muted-foreground">{col}</th>
              ))}</tr></thead>
              <tbody>{preview.slice(1).map((row, i) => (
                <tr key={i}>{row.slice(0, 8).map((cell, j) => (
                  <td key={j} className="p-2 border-b border-border">{cell}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-5 flex items-center gap-3 ${
          result.success ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20"
        }`}>
          {result.success ? <Check className="h-5 w-5 text-primary shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />}
          <p className="text-sm">{result.message}</p>
        </div>
      )}
    </div>
  );
}
