"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle, ExternalLink, Download } from "lucide-react";

const CSV_SOURCES = [
  { label: "ATP Matches 2024", url: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_2024.csv" },
  { label: "ATP Matches 2023", url: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_2023.csv" },
  { label: "ATP Matches 2022", url: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_2022.csv" },
  { label: "WTA Matches 2024", url: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_matches_2024.csv" },
  { label: "WTA Matches 2023", url: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_matches_2023.csv" },
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-muted-foreground text-sm">
          Import ATP/WTA match data from CSV files
        </p>
      </div>

      {/* Quick Import from Jeff Sackmann */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Quick Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            One-click import from Jeff Sackmann&apos;s ATP/WTA database on GitHub.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CSV_SOURCES.map((source) => (
              <Button
                key={source.url}
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => downloadAndImport(source)}
                className="justify-start text-xs"
              >
                <Download className="h-3 w-3 mr-2 shrink-0" />
                {source.label}
              </Button>
            ))}
          </div>
          <a
            href="https://github.com/JeffSackmann/tennis_atp/tree/master"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            More CSV files on GitHub
          </a>
        </CardContent>
      </Card>

      {/* Manual CSV Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Manual CSV Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file in Jeff Sackmann format.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{file ? file.name : "Choose CSV file..."}</span>
              </div>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
          {preview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows):</p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {preview[0]?.slice(0, 8).map((col, i) => (
                      <th key={i} className="text-left p-1 border-b border-border font-medium text-muted-foreground">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.slice(0, 8).map((cell, j) => (
                        <td key={j} className="p-1 border-b border-border">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {result.success ? <Check className="h-5 w-5 text-primary" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
              <p className="text-sm">{result.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
