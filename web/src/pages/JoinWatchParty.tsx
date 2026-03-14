import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ticket, ArrowLeft, CircleNotch, Users, Crown, Lock, DoorOpen } from "@phosphor-icons/react";
import { api, publicApi } from "../api/client.js";
import type { ListedParty } from "../types/party.js";

export default function JoinWatchParty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const attemptedRef = useRef(false);

  const urlCode = searchParams.get("code") || "";
  const urlParty = searchParams.get("party") || "";
  const hasUrlParams = !!urlParty;

  // Auto-join when URL params are present
  useEffect(() => {
    if (!hasUrlParams || attemptedRef.current) return;
    attemptedRef.current = true;
    joinParty(urlParty, urlCode || undefined);
  }, [hasUrlParams, urlParty, urlCode]);

  const joinParty = async (partyId: string, code?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.post<{ status: string; partyId: string }>(
        `/parties/${partyId}/join`,
        code ? { code } : {}
      );
      if (result.status === "active") {
        navigate(`/party/${partyId}/categories`, { replace: true });
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join party");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (hasUrlParams && loading && !error) {
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

  // Error state (from auto-join)
  if (hasUrlParams && error) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-content">
          <div className="empty-state">
            <Ticket size={48} weight="bold" style={{ color: "var(--status-wrong)" }} />
            <p className="empty-state-title">Couldn't join party</p>
            <p className="empty-state-text">{error}</p>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={() => {
                attemptedRef.current = false;
                setError("");
                joinParty(urlParty, urlCode || undefined);
              }}>
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

  // No URL params — show browse view
  return <JoinBrowser />;
}

function JoinBrowser() {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [listedParties, setListedParties] = useState<ListedParty[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [requestingParty, setRequestingParty] = useState<string | null>(null);
  const [requestedParties, setRequestedParties] = useState<Set<string>>(new Set());
  const [codeInput, setCodeInput] = useState<string | null>(null); // partyId being code-entered for
  const [codeValue, setCodeValue] = useState("");

  useEffect(() => {
    publicApi.get<ListedParty[]>("/parties/listed")
      .then(setListedParties)
      .catch(() => {})
      .finally(() => setLoadingParties(false));
  }, []);

  const parseInviteLink = (input: string): { partyId: string; code?: string } | null => {
    try {
      const url = new URL(input);
      const party = url.searchParams.get("party");
      const code = url.searchParams.get("code");
      if (party) return { partyId: party, code: code || undefined };
    } catch {
      // Not a URL
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
      const result = await api.post<{ status: string; partyId: string }>(
        `/parties/${parsed.partyId}/join`,
        parsed.code ? { code: parsed.code } : {}
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

  const handleJoinListed = async (partyId: string, code?: string) => {
    setRequestingParty(partyId);
    try {
      const result = await api.post<{ status: string; partyId: string }>(
        `/parties/${partyId}/join`,
        code ? { code } : {}
      );
      if (result.status === "active") {
        navigate(`/party/${partyId}/categories`, { replace: true });
        return;
      }
      setRequestedParties((prev) => new Set(prev).add(partyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setRequestingParty(null);
      setCodeInput(null);
      setCodeValue("");
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
        {/* Invite link form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
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
              autoComplete="off"
            />
          </div>

          {error && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)" }}>{error}</p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !link.trim()}>
            <Ticket size={18} weight="bold" />
            {loading ? "Joining..." : "Join with Link"}
          </button>
        </form>

        {/* Listed parties */}
        {loadingParties ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : listedParties.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <Users size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Open Parties
              </p>
            </div>
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {listedParties.map((p) => (
                <div key={p.partyId} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>
                        {p.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                        <Crown size={12} weight="fill" style={{ color: "var(--gold)" }} />
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                          {p.hostDisplayName}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                          {p.memberCount} {p.memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>
                    {requestedParties.has(p.partyId) ? (
                      <span className="badge badge-pending" style={{ flexShrink: 0 }}>Requested</span>
                    ) : p.isOpen ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleJoinListed(p.partyId)}
                        disabled={requestingParty === p.partyId}
                        style={{ flexShrink: 0 }}
                      >
                        <DoorOpen size={14} weight="bold" />
                        {requestingParty === p.partyId ? "..." : "Join"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleJoinListed(p.partyId)}
                          disabled={requestingParty === p.partyId}
                        >
                          {requestingParty === p.partyId ? "..." : "Request"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setCodeInput(codeInput === p.partyId ? null : p.partyId)}
                        >
                          <Lock size={14} weight="bold" />
                          Code
                        </button>
                      </div>
                    )}
                  </div>
                  {codeInput === p.partyId && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (codeValue.trim()) handleJoinListed(p.partyId, codeValue.trim());
                      }}
                      style={{ display: "flex", gap: "var(--space-2)" }}
                    >
                      <input
                        className="input"
                        placeholder="Enter invite code"
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value.toLowerCase())}
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoFocus
                        style={{ flex: 1, fontFamily: "var(--font-mono)" }}
                      />
                      <button className="btn btn-primary btn-sm" type="submit" disabled={!codeValue.trim()}>
                        Join
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
