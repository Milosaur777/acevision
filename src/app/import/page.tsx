"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";

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

    // Preview first 5 rows
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(0, 6);
      const rows = lines.map((line) => line.split(","));
      setPreview(rows);
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
        message: res.ok
          ? `Successfully imported ${data.count ?? "data"} from ${file.name}`
          : data.error ?? "Import failed",
      });
    } catch {
      setResult({
        success: false,
        message: "Failed to connect to import endpoint. Check n8n configuration.",
      });
    } finally {
      setImporting(false);
    }
  }

  function triggerN8nImport() {
    setImporting(true);
    fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "n8n-sync" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult({
          success: true,
          message: data.message ?? "n8n import triggered successfully",
        });
      })
      .catch(() => {
        setResult({
          success: false,
          message: "Failed to trigger n8n import. Check n8n webhook configuration.",
        });
      })
      .finally(() => setImporting(false));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-muted-foreground text-sm">
          Import ATP/WTA match data from CSV files or trigger automatic sync
        </p>
      </div>

      {/* Automatic Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Automatic Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Trigger an automatic import from Jeff Sackmann&apos;s ATP/WTA database via n8n.
            This will fetch the latest match data and update your Supabase database.
          </p>
          <Button onClick={triggerN8nImport} disabled={importing}>
            {importing ? "Syncing..." : "Sync from Database"}
          </Button>
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
            Upload a CSV file with match data (Jeff Sackmann format).
          </p>

          <div className="flex items-center gap-3">
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Choose CSV file..."}
                </span>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-muted-foreground mb-2">
                Preview (first 5 rows):
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {preview[0]?.slice(0, 8).map((col, i) => (
                      <th
                        key={i}
                        className="text-left p-1 border-b border-border font-medium text-muted-foreground"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.slice(0, 8).map((cell, j) => (
                        <td key={j} className="p-1 border-b border-border">
                          {cell}
                        </td>
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
              {result.success ? (
                <Check className="h-5 w-5 text-primary" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <p className="text-sm">{result.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
