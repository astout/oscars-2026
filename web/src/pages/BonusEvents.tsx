import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { Sparkle, Question, X, CoinVertical, Target, TrendUp } from "@phosphor-icons/react";

const titleStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-2)" };
import { api } from "../api/client.js";
import BonusCard from "../components/BonusCard.js";
import OscarStatuette from "../components/OscarStatuette.js";

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
  maxWager: number;
  status: "open" | "locked" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  userWager: Wager | null;
}

function WagerGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>
            <Sparkle size={20} weight="fill" style={{ color: "var(--gold)" }} />
            How Wagers Work
          </h2>
          <button className="tap-target" onClick={onClose} style={modalStyles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={modalStyles.body}>
          <p style={modalStyles.intro}>
            Wagers are bonus predictions that let you risk points for a bigger score. They add strategy and stakes beyond just picking winners.
          </p>

          <div style={modalStyles.step}>
            <div style={modalStyles.stepIcon}>
              <Target size={18} weight="bold" style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <p style={modalStyles.stepTitle}>Pick your answer</p>
              <p style={modalStyles.stepDesc}>Each wager poses a question with possible answers. Choose the one you think is right.</p>
            </div>
          </div>

          <div style={modalStyles.step}>
            <div style={modalStyles.stepIcon}>
              <CoinVertical size={18} weight="bold" style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <p style={modalStyles.stepTitle}>Set your wager</p>
              <p style={modalStyles.stepDesc}>Decide how many points to put on the line. Higher wagers mean bigger rewards — but also bigger losses.</p>
            </div>
          </div>

          <div style={modalStyles.step}>
            <div style={modalStyles.stepIcon}>
              <TrendUp size={18} weight="bold" style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <p style={modalStyles.stepTitle}>Win or lose</p>
              <p style={modalStyles.stepDesc}>Get it right and you earn your wagered points. Get it wrong and you lose them. No risk, no reward!</p>
            </div>
          </div>

          <div style={modalStyles.tip}>
            <p style={modalStyles.tipText}>
              Wagers are optional — you can skip any you're unsure about. But the leaderboard loves a bold prediction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-4)",
    zIndex: 100,
  },
  modal: {
    background: "var(--surface-raised)",
    borderRadius: "var(--radius-xl)",
    border: "0.5px solid var(--border)",
    width: "100%",
    maxWidth: 420,
    maxHeight: "85dvh",
    overflow: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-4) var(--space-4) var(--space-3)",
    borderBottom: "0.5px solid var(--border-subtle)",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    fontSize: "var(--text-md)",
    fontWeight: "var(--weight-semibold)",
    color: "var(--text-primary)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "var(--space-1)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
  },
  body: {
    padding: "var(--space-4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  },
  intro: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  step: {
    display: "flex",
    gap: "var(--space-3)",
    alignItems: "flex-start",
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: "var(--radius-md)",
    background: "var(--gold-glow)",
    border: "1px solid var(--border-gold)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-primary)",
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  tip: {
    padding: "var(--space-3)",
    background: "var(--gold-glow)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-gold)",
  },
  tipText: {
    fontSize: "var(--text-xs)",
    color: "var(--gold)",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
};

export default function BonusEvents() {
  const { partyId } = useParams<{ partyId: string }>();
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    api
      .get<BonusEvent[]>(`/parties/${partyId}/bonus`)
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load wagers"))
      .finally(() => setLoading(false));
  }, [partyId]);

  const handleWager = async (eventId: string, prediction: string, wagerAmount: number) => {
    const wagerResponse = await api.post<Wager>(
      `/parties/${partyId}/bonus/${eventId}/wager`,
      { prediction, wagerAmount }
    );

    setEvents((prev) =>
      prev.map((ev) =>
        ev.eventId === eventId ? { ...ev, userWager: wagerResponse } : ev
      )
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1></div>
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1></div>
        <div className="page-content">
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-header"><h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1></div>
        <div className="page-content">
          <div className="empty-state">
            <Sparkle size={48} className="empty-state-icon" />
            <p className="empty-state-title">No wagers yet</p>
            <p className="empty-state-text">Wager questions will appear here when the host creates them.</p>
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
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1>
          <button
            className="tap-target"
            onClick={() => setShowGuide(true)}
            style={{ background: "none", border: "0.5px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "var(--space-1) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-1)", cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--text-xs)", fontFamily: "var(--font-body)" }}
          >
            <Question size={14} weight="bold" />
            How it works
          </button>
        </div>
        <p className="page-subtitle">{events.length} {events.length === 1 ? "wager" : "wagers"}</p>
      </div>
      {showGuide && createPortal(<WagerGuideModal onClose={() => setShowGuide(false)} />, document.body)}
      <div className="page-content">
        <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {events.map((event) => (
            <BonusCard key={event.eventId} event={event} onWager={handleWager} />
          ))}
        </div>
      </div>
    </div>
  );
}
