import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Ticket } from "@phosphor-icons/react";
import { api } from "../api/client.js";

export default function JoinWatchParty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [partyId, setPartyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    const urlParty = searchParams.get("party");
    if (urlCode) setCode(urlCode);
    if (urlParty) setPartyId(urlParty);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedParty = partyId.trim();
    if (!trimmedCode || !trimmedParty) return;

    setLoading(true);
    setError("");

    try {
      await api.get<{ status: string; academyId: string }>(
        `/academies/${trimmedParty}/join/${trimmedCode}`
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join party");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-content">
          <div className="empty-state">
            <Ticket size={48} weight="bold" style={{ color: "var(--gold)" }} />
            <p className="empty-state-title">Request Sent</p>
            <p className="empty-state-text">
              Your request to join has been submitted. The host will need to approve you.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Back to Watch Parties
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          Join Watch Party
        </h1>
      </div>

      <div className="page-content" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label
              htmlFor="party-id"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Party ID
            </label>
            <input
              id="party-id"
              type="text"
              className="input"
              placeholder="Party ID from invite link"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="invite-code"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                color: "var(--text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              className="input"
              placeholder="Enter your invite code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus={!searchParams.get("code")}
              autoComplete="off"
            />
          </div>

          {error && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)" }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !code.trim() || !partyId.trim()}
          >
            <Ticket size={18} weight="bold" />
            {loading ? "Joining..." : "Join Watch Party"}
          </button>
        </form>
      </div>
    </div>
  );
}
