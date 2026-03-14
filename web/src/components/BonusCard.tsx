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
  options: string[];
  correctAnswer: string | null;
  minWager?: number;
  maxWager: number;
  status: "open" | "locked" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  userWager: Wager | null;
}

interface BonusCardProps {
  event: BonusEvent;
  onWager: (eventId: string, prediction: string, wagerAmount: number) => Promise<void>;
  onCancelWager?: (eventId: string) => Promise<void>;
}

export default function BonusCard({ event, onWager, onCancelWager }: BonusCardProps) {
  const minWager = event.minWager || 1;
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [selectedWager, setSelectedWager] = useState<number>(minWager);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const wagerAmounts = Array.from({ length: event.maxWager - minWager + 1 }, (_, i) => i + minWager);

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
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Check size={16} weight="bold" style={{ color: "var(--status-correct)" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--status-correct)", fontWeight: "var(--weight-medium)" }}>
            +{wager.wagerAmount} pts
          </span>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <X size={16} weight="bold" style={{ color: "var(--status-wrong)" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--status-wrong)", fontWeight: "var(--weight-medium)" }}>
          -{wager.wagerAmount} pts
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
      {/* Header: question + max wager + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
            {event.question}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)", flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--gold)" }}>
            {minWager === event.maxWager ? `${event.maxWager} pts` : `${minWager}-${event.maxWager} pts`}
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
            {event.correctAnswer === "__none__" && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-pill)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                background: "var(--status-wrong)",
                color: "#fff",
              }}>
                No winner
              </span>
            )}
          </div>
          {event.userWager && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
              Your pick: {event.userWager.prediction} &middot; Wagered: {event.userWager.wagerAmount} pts
            </p>
          )}
          {renderResolved()}
        </div>
      )}

      {/* Already wagered (open or locked, but user already placed a wager) */}
      {event.status !== "resolved" && event.userWager && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div
            style={{
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
              Wagered: {event.userWager.wagerAmount} pts
            </span>
          </div>
          {event.status === "open" && onCancelWager && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                setCancelling(true);
                try {
                  await onCancelWager(event.eventId);
                } finally {
                  setCancelling(false);
                }
              }}
              disabled={cancelling}
              style={{ marginTop: "var(--space-2)" }}
            >
              <X size={14} weight="bold" />
              {cancelling ? "Cancelling..." : "Cancel wager"}
            </button>
          )}
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
            Wager ({minWager === event.maxWager ? `${event.maxWager}` : `${minWager}-${event.maxWager}`})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            {wagerAmounts.map((amt) => {
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
            Correct = +{selectedWager} pts &middot; Wrong = -{selectedWager} pts
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
            Wagering is closed
          </p>
        </div>
      )}
    </div>
  );
}
