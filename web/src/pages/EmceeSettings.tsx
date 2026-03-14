import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Crown, CaretLeft, Plus, X, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";

interface Emcee {
  userId: string;
  displayName: string;
  email: string;
  addedAt: string;
}

export default function EmceeSettings() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [emcees, setEmcees] = useState<Emcee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEmcees = useCallback(async () => {
    try {
      const data = await api.get<Emcee[]>("/events/emcees");
      setEmcees(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emcees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmcees();
  }, [fetchEmcees]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const newEmcee = await api.post<Emcee>("/events/emcees", { email: email.trim() });
      setEmcees((prev) => [...prev, newEmcee]);
      setEmail("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add emcee");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    setActionLoading(targetUserId);
    try {
      await api.delete(`/events/emcees/${targetUserId}`);
      setEmcees((prev) => prev.filter((e) => e.userId !== targetUserId));
      setConfirmRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove emcee");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page animate-fade-in-up">
      <div style={styles.topBar}>
        <button
          className="tap-target"
          onClick={() => navigate(`/party/${partyId}/categories`)}
          style={styles.backButton}
        >
          <CaretLeft size={18} weight="bold" />
          <span>Categories</span>
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Crown size={24} weight="fill" style={{ color: "var(--gold)" }} />
            Emcee Management
          </h1>
          <p className="page-subtitle">
            Emcees can set winners and manage categories for all parties
          </p>
        </div>

        {error && (
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
            {error}
          </p>
        )}

        {/* Add Emcee Form */}
        <div className="card" style={{ marginBottom: "var(--space-6)", border: "0.5px solid var(--border-gold)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Plus size={16} weight="bold" style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
              Add Co-Emcee
            </p>
          </div>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "var(--space-2)" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <MagnifyingGlass
                size={16}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                className="input"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAddError(""); }}
                style={{ paddingLeft: 36 }}
              />
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={adding || !email.trim()}>
              {adding ? "..." : <Plus size={16} weight="bold" />}
            </button>
          </form>
          {addError && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}>
              {addError}
            </p>
          )}
        </div>

        {/* Emcee List */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Crown size={16} weight="bold" style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
              Current Emcees
            </p>
            <span className="badge badge-pending" style={{ marginLeft: "auto" }}>{emcees.length}</span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : (
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {emcees.map((emcee) => (
                <div key={emcee.userId} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "var(--radius-pill)",
                      background: "var(--gold-glow)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      border: "1px solid var(--border-gold)",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--gold)" }}>
                      {emcee.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>
                      {emcee.displayName}
                      {emcee.userId === userId && (
                        <span style={{ color: "var(--text-muted)", fontWeight: "var(--weight-normal)" }}> (you)</span>
                      )}
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{emcee.email}</p>
                  </div>
                  {emcee.userId !== userId && confirmRemove !== emcee.userId && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(emcee.userId)} aria-label={`Remove ${emcee.displayName}`}>
                      <X size={16} />
                    </button>
                  )}
                  {confirmRemove === emcee.userId && (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(emcee.userId)}
                        disabled={actionLoading === emcee.userId}
                      >
                        Remove
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(null)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: "flex",
    alignItems: "center",
    padding: "var(--space-2) var(--space-3)",
    borderBottom: "0.5px solid var(--border-subtle)",
    background: "var(--surface-base)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
    background: "none",
    border: "none",
    color: "var(--gold)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-body)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    cursor: "pointer",
    padding: "var(--space-1) var(--space-2)",
    borderRadius: "var(--radius-md)",
  },
};
