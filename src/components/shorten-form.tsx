// FILE: src/components/shorten-form.tsx
"use client";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function ShortenForm({ authenticated }: { authenticated: boolean }) {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shortUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: url, alias: alias || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult({ shortUrl: data.link.shortUrl });
      setUrl("");
      setAlias("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-3 border border-slate-200">
        <label htmlFor="url" className="sr-only">Long URL</label>
        <input
          id="url"
          type="text"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a long URL to shorten..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {authenticated && (
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Custom alias (optional)"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 transition disabled:opacity-50"
        >
          {loading ? "Shortening..." : "Shorten URL"}
        </button>
      </form>

      {result && (
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5">
          <QRCodeCanvas value={result.shortUrl} size={100} includeMargin />
          <div className="flex-1 text-center sm:text-left">
            <a href={result.shortUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-semibold break-all">
              {result.shortUrl}
            </a>
            <div className="mt-2">
              <button onClick={copy} className="text-sm font-medium rounded-lg border border-indigo-300 px-3 py-1.5 hover:bg-white transition">
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}