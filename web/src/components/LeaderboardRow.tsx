import { useState } from "react";
import { CaretDown, CaretUp, Crown } from "@phosphor-icons/react";

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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

const rankColors: Record<number, string> = {
  1: "var(--gold-vivid)",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export default function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const [expanded, setExpanded] = useState(false);

  const rankColor = rankColors[entry.rank];

  return (
    <div
      className="card tap-target"
      onClick={() => setExpanded(!expanded)}
      style={{
        cursor: "pointer",
        borderLeft: isCurrentUser ? "3px solid var(--gold)" : undefined,
        background: isCurrentUser ? "var(--gold-glow)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span
          className="mono"
          style={{
            width: 32,
            textAlign: "center",
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            color: rankColor || "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          {entry.rank === 1 ? (
            <Crown size={20} weight="fill" style={{ color: "var(--gold-vivid)" }} />
          ) : (
            entry.rank
          )}
        </span>

        <span
          style={{
            flex: 1,
            fontSize: "var(--text-base)",
            fontWeight: isCurrentUser ? "var(--weight-medium)" : "var(--weight-normal)",
            color: "var(--text-primary)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.displayName}
          {isCurrentUser && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>
              (you)
            </span>
          )}
        </span>

        <span
          className="mono"
          style={{
            fontSize: "var(--text-md)",
            fontWeight: "var(--weight-semibold)",
            color: rankColor || "var(--text-primary)",
            flexShrink: 0,
          }}
        >
          {entry.totalPoints}
        </span>

        {expanded ? (
          <CaretUp size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        ) : (
          <CaretDown size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        )}
      </div>

      {expanded && (
        <div
          className="animate-fade-in-up"
          style={{
            marginTop: "var(--space-3)",
            paddingTop: "var(--space-3)",
            borderTop: "0.5px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-2)",
          }}
        >
          <StatRow label="Category pts" value={entry.categoryPoints} />
          <StatRow label="Wager pts" value={entry.bonusPoints} />
          <StatRow label="Correct 1st picks" value={entry.correctFirst} />
          <StatRow label="Correct 2nd picks" value={entry.correctSecond} />
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</span>
      <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}
