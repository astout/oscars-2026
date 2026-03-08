import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import type { Party } from "../types/party.js";

export default function CreateWatchParty() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      await api.post<Party>("/parties", { name: trimmed });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-fade-in-up">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <button className="btn btn-ghost" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>
          Create Watch Party
        </h1>
      </div>

      <div className="page-content" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label
              htmlFor="party-name"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Party Name
            </label>
            <input
              id="party-name"
              type="text"
              className="input"
              placeholder="e.g. Movie Night Crew"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              autoFocus
              autoComplete="off"
            />
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
              {name.trim().length}/50 characters
            </p>
          </div>

          {error && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)" }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !name.trim()}>
            <Plus size={18} weight="bold" />
            {loading ? "Creating..." : "Create Watch Party"}
          </button>
        </form>
      </div>
    </div>
  );
}
