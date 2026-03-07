import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Trophy, ArrowClockwise } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import LeaderboardRow from "../components/LeaderboardRow.js";
import OscarStatuette from "../components/OscarStatuette.js";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  categoryPoints: number;
  bonusPoints: number;
  totalPoints: number;
  correctFirst: number;
  correctSecond: number;
  rank: number;
}

export default function Leaderboard() {
  const { academyId } = useParams<{ academyId: string }>();
  const { userId } = useAuthContext();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await api.get<LeaderboardEntry[]>(`/academies/${academyId}/leaderboard`);
      setEntries(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    }
  }, [academyId]);

  useEffect(() => {
    fetchLeaderboard().finally(() => setLoading(false));
  }, [fetchLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
        </div>
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
        </div>
        <div className="page-content">
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <Trophy size={48} className="empty-state-icon" />
            <p className="empty-state-title">No scores yet</p>
            <p className="empty-state-text">
              Scores will appear here once predictions are locked in and results are revealed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in-up">
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-4)" }}>
        <OscarStatuette size={80} />
      </div>
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="page-title">Leaderboard</h1>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh leaderboard"
        >
          <ArrowClockwise
            size={18}
            weight="bold"
            style={{
              transition: "transform var(--duration-slow) var(--ease-out)",
              transform: refreshing ? "rotate(360deg)" : undefined,
            }}
          />
        </button>
      </div>
      <div className="page-content">
        <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === userId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
