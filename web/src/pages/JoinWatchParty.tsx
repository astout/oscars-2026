import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ticket, ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import { api } from "../api/client.js";

export default function JoinWatchParty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const attemptedRef = useRef(false);

  const urlCode = searchParams.get("code") || "";
  const urlParty = searchParams.get("party") || "";
  const hasParams = !!urlCode && !!urlParty;

  // Auto-join when both params are present
  useEffect(() => {
    if (!hasParams || attemptedRef.current) return;
    attemptedRef.current = true;
    joinParty(urlParty, urlCode);
  }, [hasParams, urlParty, urlCode]);

  const joinParty = async (partyId: string, code: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get<{ status: string; partyId: string }>(
        `/parties/${partyId}/join/${code}`
      );
      setSuccess(true);
      // If auto-approved, navigate directly to the party
      if (result.status === "active") {
        navigate(`/party/${partyId}/categories`, { replace: true });
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join party");
    } finally {
      setLoading(false);
    }
  };

  // Auto-joining in progress
  if (hasParams && loading && !error) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-content">
          <div className="empty-state">
            <CircleNotch size={48} weight="bold" style={{ color: "var(--gold)", animation: "spin 1s linear infinite" }} />
            <p className="empty-state-title">Joining party...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Pending approval
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

  // Error state (from auto-join or manual)
  if (hasParams && error) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-content">
          <div className="empty-state">
            <Ticket size={48} weight="bold" style={{ color: "var(--status-wrong)" }} />
            <p className="empty-state-title">Couldn't join party</p>
            <p className="empty-state-text">{error}</p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => { attemptedRef.current = false; setError(""); joinParty(urlParty, urlCode); }}>
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={() => navigate("/")}>
                Back to Watch Parties
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: manual entry (no URL params)
  return <ManualJoinForm />;
}

function ManualJoinForm() {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const parseInviteLink = (input: string): { partyId: string; code: string } | null => {
    try {
      const url = new URL(input);
      const code = url.searchParams.get("code");
      const party = url.searchParams.get("party");
      if (code && party) return { partyId: party, code };
    } catch {
      // Not a URL — ignore
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInviteLink(link.trim());
    if (!parsed) {
      setError("Paste a valid invite link");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.get<{ status: string; partyId: string }>(
        `/parties/${parsed.partyId}/join/${parsed.code}`
      );
      if (result.status === "active") {
        navigate(`/party/${parsed.partyId}/categories`, { replace: true });
        return;
      }
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
            <label htmlFor="invite-link" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
              Invite Link
            </label>
            <input
              id="invite-link"
              type="text"
              className="input"
              placeholder="Paste invite link here"
              value={link}
              onChange={(e) => { setLink(e.target.value); setError(""); }}
              required
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)" }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !link.trim()}>
            <Ticket size={18} weight="bold" />
            {loading ? "Joining..." : "Join Watch Party"}
          </button>
        </form>
      </div>
    </div>
  );
}
