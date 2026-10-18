// FILE: src/app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShortUrl("");

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: url, customAlias: alias || undefined }),
      });
      const data = await res.json();

      if (res.ok && (data.success || data.link || data.shortCode)) {
        const linkData = data.link || data;
        const host = linkData.domain || (typeof window !== "undefined" ? window.location.host : "");
        const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
        const code = linkData.shortCode || data.shortCode;
        setShortUrl(`${protocol}//${host}/${code}`);
      } else {
        setError(data.error || data.message || "Failed to shorten URL. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* Header Navigation */}
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 24px",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "20px",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
              Enterprise URL Shortener
            </span>
          </div>
          <a
            href="/login"
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              backgroundColor: "#1e293b",
              color: "#cbd5e1",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "600",
              border: "1px solid #334155",
            }}
          >
            Sign In
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "60px 24px", flex: 1 }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: "20px",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              color: "#818cf8",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "20px",
            }}
          >
            🚀 High-Performance Link Management
          </div>

          <h1 style={{ fontSize: "42px", fontWeight: "900", color: "#ffffff", lineHeight: "1.2", marginBottom: "16px" }}>
            Shorten, Share & Track Your <br />
            <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Links Effortlessly
            </span>
          </h1>

          <p style={{ fontSize: "18px", color: "#94a3b8", maxWidth: "650px", margin: "0 auto", lineHeight: "1.6" }}>
            Create custom branded short URLs with advanced rate-limiting, instant redirection, and high-level enterprise security.
          </p>
        </div>

        {/* URL Shortener Form Card */}
        <div
          style={{
            backgroundColor: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            maxWidth: "600px",
            margin: "0 auto 60px auto",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
                Long URL *
              </label>
              <input
                type="url"
                placeholder="https://example.com/my-very-long-link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
                Custom Alias (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. my-custom-link"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: "#020617",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 20px rgba(79, 70, 229, 0.4)",
              }}
            >
              {loading ? "Shortening Link..." : "Shorten URL Now →"}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div style={{ marginTop: "20px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Success Result Box */}
          {shortUrl && (
            <div style={{ marginTop: "24px", padding: "16px", borderRadius: "12px", backgroundColor: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#818cf8", textTransform: "uppercase", marginBottom: "8px" }}>
                Your Shortened Link:
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#020617", padding: "10px 14px", borderRadius: "8px", border: "1px solid #1e293b", gap: "10px" }}>
                <a href={shortUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "underline", wordBreak: "break-all", fontSize: "14px" }}>
                  {shortUrl}
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ padding: "8px 14px", borderRadius: "6px", backgroundColor: "#4f46e5", color: "#ffffff", border: "none", fontWeight: "600", fontSize: "12px", cursor: "pointer", shrink: 0 }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Enterprise Article / Features Showcase Section */}
        <section style={{ borderTop: "1px solid #1e293b", paddingTop: "50px" }}>
          <h2 style={{ textAlign: "center", fontSize: "28px", fontWeight: "800", color: "#ffffff", marginBottom: "36px" }}>
            Why Choose Enterprise URL Shortener?
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {/* Feature 1 */}
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", padding: "24px", borderRadius: "12px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚡</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>Blazing Fast Redirection</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: 0 }}>
                Powered by Vercel Edge Serverless Architecture, ensuring sub-100ms URL lookup and redirection speed worldwide.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", padding: "24px", borderRadius: "12px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>🛡️</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>Built-In Security</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: 0 }}>
                Automatic malicious URL scanning (`url-safety.ts`) and rate-limiting protection against automated spam bots.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", padding: "24px", borderRadius: "12px" }}>
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>🏷️</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>Custom Alias Branding</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.5", margin: 0 }}>
                Create memorable custom links for marketing campaigns, direct downloads, or personal social media sharing.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", backgroundColor: "#020617", padding: "24px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
        © {new Date().getFullYear()} Enterprise URL Shortener. Built with Next.js, Prisma & Vercel.
      </footer>
    </div>
  );
}