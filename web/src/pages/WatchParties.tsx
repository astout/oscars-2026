import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, UserPlus, Crown, UserCircle } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import type { Party } from "../types/party.js";

export default function WatchParties() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Party[]>("/parties")
      .then(setParties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.topBarTitle}>Oscars 2026</span>
        <button
          className="tap-target"
          onClick={() => navigate("/profile")}
          style={styles.profileButton}
          aria-label="Profile"
        >
          <UserCircle size={24} weight="bold" />
        </button>
      </div>

      <div style={styles.main}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src="/academy-awards-logo.png" alt="98th Academy Awards" style={styles.logo} />
        </div>

        <div style={styles.content}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>Watch Parties</h1>
            {!loading && <p style={styles.subtitle}>{parties.length} {parties.length === 1 ? "party" : "parties"}</p>}
          </div>

          {error && (
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center", marginBottom: "var(--space-4)" }}>
              {error}
            </p>
          )}

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : parties.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8) 0" }}>
              <Users size={48} className="empty-state-icon" />
              <p className="empty-state-title">No Watch Parties yet</p>
              <p className="empty-state-text">
                Create a party for your friends or join one with an invite link.
              </p>
            </div>
          ) : (
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {parties.map((party) => (
                <button
                  key={party.partyId}
                  className="card card-interactive tap-target"
                  onClick={() => navigate(`/party/${party.partyId}`)}
                  style={styles.partyRow}
                >
                  <div style={styles.partyIcon}>
                    <Users size={20} weight="bold" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <div style={styles.partyInfo}>
                    <p style={styles.partyName}>{party.name}</p>
                    <p style={styles.partyRole}>{party.role === "host" ? "Host" : "Member"}</p>
                  </div>
                  {party.role === "host" && (
                    <Crown size={18} weight="fill" style={{ color: "var(--gold)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={styles.actions}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate("/create")}>
              <Plus size={18} weight="bold" />
              Create
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate("/join")}>
              <UserPlus size={18} weight="bold" />
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerText}>2026</span>
        <span style={styles.footerDivider} />
        <span style={styles.footerText}>alexhacks.life</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-3) var(--space-4)",
    borderBottom: "0.5px solid var(--border-subtle)",
    background: "var(--surface-base)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  topBarTitle: {
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-muted)",
    letterSpacing: "var(--tracking-wide)",
  },
  profileButton: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "var(--space-1)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
  },
  main: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 var(--space-4)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "var(--space-8) 0 var(--space-4)",
  },
  logo: {
    width: 160,
    height: 160,
    objectFit: "contain",
  },
  content: {
    paddingBottom: "var(--space-8)",
  },
  header: {
    marginBottom: "var(--space-4)",
  },
  title: {
    fontSize: "var(--text-xl)",
    fontWeight: "var(--weight-semibold)",
    color: "var(--text-primary)",
    letterSpacing: "var(--tracking-tight)",
  },
  subtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    marginTop: "var(--space-1)",
  },
  partyRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    width: "100%",
    textAlign: "left" as const,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
  },
  partyIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-md)",
    background: "var(--surface-interactive)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "0.5px solid var(--border)",
  },
  partyInfo: {
    flex: 1,
    minWidth: 0,
  },
  partyName: {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-primary)",
  },
  partyRole: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    marginTop: 1,
  },
  actions: {
    display: "flex",
    gap: "var(--space-3)",
    marginTop: "var(--space-6)",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3)",
    padding: "var(--space-6) var(--space-4)",
    borderTop: "0.5px solid var(--border-subtle)",
  },
  footerText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  footerDivider: {
    width: 1,
    height: 14,
    background: "var(--border)",
  },
};
