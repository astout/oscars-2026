import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sparkle } from "@phosphor-icons/react";

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

export default function BonusEvents() {
  const { partyId } = useParams<{ partyId: string }>();
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        <h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1>
        <p className="page-subtitle">{events.length} {events.length === 1 ? "wager" : "wagers"}</p>
      </div>
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
