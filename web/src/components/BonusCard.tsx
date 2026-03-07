import { useState } from "react";
import { Check, CoinVertical, X } from "@phosphor-icons/react";

interface Wager {
  userId: string;
  eventId: string;
  prediction: string;
  wagerAmount: number;
  createdAt: string;
}

interface BonusEvent {
  eventId: string;
  question: string;
  eventType: "yes-no" | "multiple-choice";
  options: string[];
  correctAnswer: string | null;
  basePoints: number;
  status: "open" | "locked" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  userWager: Wager | null;
}

interface BonusCardProps {
  event: BonusEvent;
  onWager: (eventId: string, prediction: string, wagerAmount: number) => Promise<void>;
}

const WAGER_AMOUNTS = [0, 1, 2, 3, 4, 5];

export default function BonusCard({ event, onWager }: BonusCardProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [selectedWager, setSelectedWager] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const statusBadgeClass =
    event.status === "open"
      ? "badge-open"
      : event.status === "locked"
        ? "badge-locked"
        : "badge-resolved";

  const handleLockIn = async () => {
    if (!selectedPrediction) return;
    setSubmitting(true);
    try {
      await onWager(event.eventId, selectedPrediction, selectedWager);
    } finally {
      setSubmitting(false);
    }
  };

  const renderResolved = () => {
    const wager = event.userWager;
    if (!wager) {
      return (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>
          Didn't play
        </p>
      );
    }

    const isCorrect = wager.prediction === event.correctAnswer;
    if (isCorrect) {
      const points = event.basePoints + 2 * wager.wagerAmount;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Check size={16} weight="bold" style={{ color: "var(--status-correct)" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--status-correct)", fontWeight: "var(--weight-medium)" }}>
            +{points} pts
          </span>
        </div>
      );
    }

    const lostPoints = wager.wagerAmount;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <X size={16} weight="bold" style={{ color: "var(--status-wrong)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--status-wrong)", fontWeight: "var(--weight-medium)" }}>
          {lostPoints > 0 ? `-${lostPoints} pts` : "0 pts"}
        </span>
      </div>
    );
  };

  return (
    <div
      className="card"
      style={{
        border: "1px dashed var(--border-gold)",
      }}
    >
      {/* Header: question + base points + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
            {event.question}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)", flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--gold)" }}>
            {event.basePoints} pts
          </span>
          <span className={`badge ${statusBadgeClass}`}>{event.status}</span>
        </div>
      </div>

      {/* Resolved: show correct answer + result */}
      {event.status === "resolved" && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            {event.options.map((opt) => (
              <span
                key={opt}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  background: opt === event.correctAnswer ? "var(--gold)" : "var(--surface-interactive)",
                  color: opt === event.correctAnswer ? "var(--text-on-gold)" : "var(--text-muted)",
                  border: opt === event.correctAnswer ? "none" : "0.5px solid var(--border)",
                }}
              >
                {opt}
              </span>
            ))}
          </div>
          {event.userWager && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              Your pick: {event.userWager.prediction} &middot; Wager: {event.userWager.wagerAmount} pts
            </p>
          )}
          {renderResolved()}
        </div>
      )}

      {/* Already wagered (open or locked, but user already placed a wager) */}
      {event.status !== "resolved" && event.userWager && (
        <div
          style={{
            marginTop: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--gold-glow)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Check size={16} weight="bold" style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
            Your pick: <strong>{event.userWager.prediction}</strong>
          </span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "auto" }}>
            Wager: {event.userWager.wagerAmount} pts
          </span>
        </div>
      )}

      {/* Open event, no wager yet: show prediction + wager UI */}
      {event.status === "open" && !event.userWager && (
        <div style={{ marginTop: "var(--space-4)" }}>
          {/* Prediction pills */}
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
            Prediction
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            {event.options.map((opt) => {
              const isSelected = selectedPrediction === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setSelectedPrediction(opt)}
                  className="tap-target"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    border: isSelected ? "none" : "0.5px solid var(--border)",
                    background: isSelected ? "var(--gold)" : "transparent",
                    color: isSelected ? "var(--text-on-gold)" : "var(--text-secondary)",
                    transition: "all var(--duration-fast) var(--ease-out)",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Wager chips */}
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
            Wager
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            {WAGER_AMOUNTS.map((amt) => {
              const isSelected = selectedWager === amt;
              return (
                <button
                  key={amt}
                  onClick={() => setSelectedWager(amt)}
                  className="tap-target"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 40,
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    border: isSelected ? "none" : "0.5px solid var(--border)",
                    background: isSelected ? "var(--gold)" : "transparent",
                    color: isSelected ? "var(--text-on-gold)" : "var(--text-secondary)",
                    transition: "all var(--duration-fast) var(--ease-out)",
                  }}
                >
                  {amt}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
            Risk: 2x return or lose wager
          </p>

          {/* Lock In button */}
          <button
            className="btn btn-primary btn-full"
            disabled={!selectedPrediction || submitting}
            onClick={handleLockIn}
          >
            <CoinVertical size={18} weight="bold" />
            {submitting ? "Locking in..." : "Lock In"}
          </button>
        </div>
      )}

      {/* Locked, no wager */}
      {event.status === "locked" && !event.userWager && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>
            Betting is closed
          </p>
        </div>
      )}
    </div>
  );
}
