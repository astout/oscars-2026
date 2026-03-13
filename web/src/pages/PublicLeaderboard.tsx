import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowClockwise, ChartBar, ArrowLeft, Users } from "@phosphor-icons/react";
import { publicApi } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import type { PublicLeaderboardEntry } from "../types/party.js";
import OscarStatuette from "../components/OscarStatuette.js";
import PublicLeaderboardRow from "../components/PublicLeaderboardRow.js";

export default function PublicLeaderboard() {
  const navigate = useNavigate();
  const { isAuthenticated, userId } = useAuthContext();
  const [entries, setEntries] = useState<PublicLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await publicApi.get<PublicLeaderboardEntry[]>("/events/oscars_2026/leaderboard");
      setEntries(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const participantCount = new Set(entries.map((e) => e.userId)).size;
  const partyCount = new Set(entries.map((e) => e.partyId)).size;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button className="tap-target" onClick={() => navigate(isAuthenticated ? "/" : "/auth")} style={styles.backButton} aria-label="Back">
          <ArrowLeft size={20} weight="bold" />
        </button>
        <span style={styles.topBarTitle}>Public Leaderboard</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <ArrowClockwise
            size={18}
            weight="bold"
            style={{
              transition: "transform 0.6s ease-out",
              transform: refreshing ? "rotate(360deg)" : undefined,
            }}
          />
        </button>
      </div>

      {!isAuthenticated && (
        <div style={styles.signUpBanner}>
          <span style={styles.signUpText}>Create an account to join in on the fun!</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/auth")}>
            Create Account
          </button>
        </div>
      )}

      <div style={styles.main}>
        {loading ? (
          <div style={{ padding: "var(--space-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: "var(--space-4)" }}>
            <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="animate-fade-in-up" style={{ padding: "var(--space-4)" }}>
            <div className="empty-state">
              <Trophy size={48} className="empty-state-icon" />
              <p className="empty-state-title">No scores yet</p>
              <p className="empty-state-text">
                Scores will appear here once predictions are locked in and results are revealed.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-4)" }}>
              <OscarStatuette size={80} />
            </div>

            <div style={styles.stats}>
              <div style={styles.statItem}>
                <Users size={14} style={{ color: "var(--text-muted)" }} />
                <span style={styles.statText}>{participantCount} participants</span>
              </div>
              <span style={styles.statDivider} />
              <div style={styles.statItem}>
                <ChartBar size={14} style={{ color: "var(--text-muted)" }} />
                <span style={styles.statText}>{partyCount} {partyCount === 1 ? "party" : "parties"}</span>
              </div>
            </div>

            <div style={{ padding: "0 var(--space-4) var(--space-8)" }}>
              <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {entries.map((entry) => (
                  <PublicLeaderboardRow
                    key={`${entry.userId}-${entry.partyId}`}
                    entry={entry}
                    isCurrentUser={isAuthenticated && entry.userId === userId}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
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
  backButton: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "var(--space-1)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-muted)",
    letterSpacing: "var(--tracking-wide)",
  },
  signUpBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: "var(--gold-glow)",
    borderBottom: "0.5px solid var(--border-gold)",
  },
  signUpText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    flex: 1,
  },
  main: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
  },
  stats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4) var(--space-4)",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
  },
  statText: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },
  statDivider: {
    width: 1,
    height: 12,
    background: "var(--border)",
  },
};
