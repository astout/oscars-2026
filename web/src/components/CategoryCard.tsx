import { Trophy, Lock, LockOpen } from "@phosphor-icons/react";

interface Nominee {
  nomineeId: string;
  categoryId: string;
  name: string;
  subtitle?: string;
  displayOrder: number;
}

interface Pick {
  userId: string;
  categoryId: string;
  pick1NomineeId: string;
  pick2NomineeId: string;
  updatedAt: string;
}

interface Category {
  categoryId: string;
  name: string;
  displayOrder: number;
  winnerId: string | null;
  locked: boolean;
  resolvedAt: string | null;
  nominees: Nominee[];
}

interface CategoryCardProps {
  category: Category;
  pick?: Pick;
  onSelect: (category: Category) => void;
}

export default function CategoryCard({ category, pick, onSelect }: CategoryCardProps) {
  const { locked, winnerId, nominees } = category;
  const resolved = winnerId !== null;
  const hasPicks = pick !== undefined;

  const winner = resolved ? nominees.find((n) => n.nomineeId === winnerId) : null;
  const pick1Nominee = hasPicks ? nominees.find((n) => n.nomineeId === pick.pick1NomineeId) : null;
  const pick2Nominee = hasPicks ? nominees.find((n) => n.nomineeId === pick.pick2NomineeId) : null;

  const score = resolved
    ? pick?.pick1NomineeId === winnerId
      ? 5
      : pick?.pick2NomineeId === winnerId
        ? 3
        : 0
    : null;

  const cardClass = [
    "card",
    !locked && !resolved ? "card-interactive tap-target" : "",
    resolved ? "card-winner winner-glow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass} onClick={!locked && !resolved ? () => onSelect(category) : undefined} style={styles.card}>
      <div style={styles.header}>
        <span className="category-label">{category.name}</span>
        {resolved ? (
          <span className="badge badge-resolved">
            <Trophy size={12} weight="fill" /> Resolved
          </span>
        ) : locked ? (
          <span className="badge badge-locked">
            <Lock size={12} weight="bold" /> Locked
          </span>
        ) : (
          <span className="badge badge-open">
            <LockOpen size={12} weight="bold" /> Open
          </span>
        )}
      </div>

      {resolved && winner && (
        <div style={styles.winnerRow}>
          <Trophy size={18} weight="fill" style={{ color: "var(--gold-vivid)" }} />
          <span style={styles.winnerName}>{winner.name}</span>
          {score !== null && (
            <span className="mono" style={{ ...styles.score, color: score > 0 ? "var(--status-correct)" : "var(--text-muted)" }}>
              +{score}
            </span>
          )}
        </div>
      )}

      {hasPicks && pick1Nominee && (
        <div style={styles.picks}>
          <div className="pick-indicator pick-1">
            <span className="mono" style={styles.points}>+5</span>
            <span style={styles.pickName}>{pick1Nominee.name}</span>
          </div>
          {pick2Nominee && (
            <div className="pick-indicator pick-2">
              <span className="mono" style={styles.points}>+3</span>
              <span style={styles.pickName}>{pick2Nominee.name}</span>
            </div>
          )}
        </div>
      )}

      {!hasPicks && !resolved && (
        <div style={styles.emptyState}>
          <span style={styles.nomineeCount}>{nominees.length} nominees</span>
          {!locked && (
            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onSelect(category); }}>
              Make Your Picks
            </button>
          )}
        </div>
      )}

      {hasPicks && !locked && !resolved && (
        <button
          className="btn btn-ghost btn-sm"
          style={styles.editBtn}
          onClick={(e) => { e.stopPropagation(); onSelect(category); }}
        >
          Edit Picks
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-2)",
  },
  picks: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  points: {
    fontSize: "var(--text-xs)",
    flexShrink: 0,
  },
  pickName: {
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-2)",
  },
  nomineeCount: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  editBtn: {
    alignSelf: "flex-start",
  },
  winnerRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  },
  winnerName: {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)",
    color: "var(--gold-bright)",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  score: {
    fontSize: "var(--text-md)",
    fontWeight: "var(--weight-semibold)",
  },
};
