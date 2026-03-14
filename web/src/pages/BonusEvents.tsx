import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  Sparkle, Question, X, CoinVertical, Target, TrendUp, MagnifyingGlass,
  Microphone, Lock, LockOpen, Lightning, Trophy, ArrowCounterClockwise, PencilSimple,
} from "@phosphor-icons/react";

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
  minWager?: number;
  maxWager: number;
  status: "open" | "locked" | "resolved";
  upNext?: boolean;
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
            <div style={modalStyles.stepIcon}><Target size={18} weight="bold" style={{ color: "var(--gold)" }} /></div>
            <div>
              <p style={modalStyles.stepTitle}>Pick your answer</p>
              <p style={modalStyles.stepDesc}>Each wager poses a question with possible answers. Choose the one you think is right.</p>
            </div>
          </div>
          <div style={modalStyles.step}>
            <div style={modalStyles.stepIcon}><CoinVertical size={18} weight="bold" style={{ color: "var(--gold)" }} /></div>
            <div>
              <p style={modalStyles.stepTitle}>Set your wager</p>
              <p style={modalStyles.stepDesc}>Decide how many points to put on the line. Higher wagers mean bigger rewards — but also bigger losses.</p>
            </div>
          </div>
          <div style={modalStyles.step}>
            <div style={modalStyles.stepIcon}><TrendUp size={18} weight="bold" style={{ color: "var(--gold)" }} /></div>
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

const EMCEE_MODE_KEY = "oscars-emcee-mode";

export default function BonusEvents() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Emcee state
  const [canEmcee, setCanEmcee] = useState(false);
  const [canBroadcast, setCanBroadcast] = useState(false);
  const [emceeMode, setEmceeMode] = useState(() => localStorage.getItem(EMCEE_MODE_KEY) === "true");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const toggleEmceeMode = () => {
    const next = !emceeMode;
    setEmceeMode(next);
    localStorage.setItem(EMCEE_MODE_KEY, String(next));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 200);
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return events.filter((e) => {
      const searchable = e.question.toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [events, searchQuery]);

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [evts, party] = await Promise.all([
        api.get<BonusEvent[]>(`/parties/${partyId}/bonus`),
        api.get<{ isEmcee?: boolean; isTemplateParty?: boolean; emceeSync?: boolean }>(`/parties/${partyId}`),
      ]);
      setEvents(evts);
      const isGlobalEmcee = !!(party.isEmcee && party.isTemplateParty);
      const isSelfEmcee = party.emceeSync === false;
      setCanEmcee(isGlobalEmcee || isSelfEmcee);
      setCanBroadcast(isGlobalEmcee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wagers");
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWager = async (eventId: string, prediction: string, wagerAmount: number) => {
    const wagerResponse = await api.post<Wager>(`/parties/${partyId}/bonus/${eventId}/wager`, { prediction, wagerAmount });
    setEvents((prev) => prev.map((ev) => ev.eventId === eventId ? { ...ev, userWager: wagerResponse } : ev));
  };

  const handleCancelWager = async (eventId: string) => {
    await api.delete(`/parties/${partyId}/bonus/${eventId}/wager`);
    setEvents((prev) => prev.map((ev) => ev.eventId === eventId ? { ...ev, userWager: null } : ev));
  };

  // Emcee handlers
  const handleToggleLock = async (event: BonusEvent) => {
    if (!partyId) return;
    const action = event.status === "locked" ? "unlock" : "lock";
    setActionLoading(`lock-${event.eventId}`);
    try {
      const endpoint = canBroadcast
        ? `/parties/${partyId}/bonus/${event.eventId}/broadcast-${action}`
        : `/parties/${partyId}/bonus/${event.eventId}/${action}`;
      await api.post(endpoint);
      setEvents((prev) => prev.map((e) => e.eventId === event.eventId ? { ...e, status: action === "lock" ? "locked" : "open", upNext: action === "lock" ? false : e.upNext } : e));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUpNext = async (event: BonusEvent) => {
    if (!partyId) return;
    const newUpNext = !event.upNext;
    setActionLoading(`upnext-${event.eventId}`);
    try {
      if (canBroadcast) {
        if (newUpNext) await api.post(`/parties/${partyId}/bonus/${event.eventId}/broadcast-up-next`);
        else await api.delete(`/parties/${partyId}/bonus/${event.eventId}/broadcast-up-next`);
      }
      setEvents((prev) => prev.map((e) => e.eventId === event.eventId ? { ...e, upNext: newUpNext } : newUpNext ? { ...e, upNext: false } : e));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (eventId: string, correctAnswer: string) => {
    if (!partyId) return;
    setActionLoading(`resolve-${eventId}`);
    try {
      if (canBroadcast) {
        await api.post(`/parties/${partyId}/bonus/${eventId}/broadcast-resolve`, { correctAnswer });
      } else {
        await api.patch(`/parties/${partyId}/bonus/${eventId}`, { correctAnswer });
      }
      setEvents((prev) => prev.map((e) => e.eventId === eventId ? { ...e, status: "resolved", correctAnswer, resolvedAt: new Date().toISOString() } : e));
      setResolvingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnresolve = async (eventId: string) => {
    if (!partyId) return;
    setActionLoading(`unresolve-${eventId}`);
    try {
      const endpoint = canBroadcast
        ? `/parties/${partyId}/bonus/${eventId}/broadcast-unresolve`
        : `/parties/${partyId}/bonus/${eventId}/unresolve`;
      await api.post(endpoint);
      setEvents((prev) => prev.map((e) => e.eventId === eventId ? { ...e, status: "open", correctAnswer: null, resolvedAt: null } : e));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const showEmcee = canEmcee && emceeMode;

  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1></div>
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3].map((i) => (<div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />))}
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

  if (events.length === 0 && !canEmcee) {
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

      {/* Emcee mode toggle */}
      {canEmcee && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-4)" }}>
          <button
            className="tap-target"
            onClick={toggleEmceeMode}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-5)",
              background: emceeMode ? "var(--gold)" : "transparent",
              border: emceeMode ? "none" : "1px solid var(--border-gold)",
              borderRadius: "var(--radius-pill)", cursor: "pointer", fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" as unknown as number,
              color: emceeMode ? "var(--text-on-gold)" : "var(--gold)",
            }}
          >
            <Microphone size={16} weight="bold" />
            {emceeMode ? "Emcee Mode" : "Switch to Emcee Mode"}
          </button>
        </div>
      )}

      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="page-title" style={titleStyle}><Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />Wagers</h1>
          {!showEmcee && (
            <button
              className="tap-target"
              onClick={() => setShowGuide(true)}
              style={{ background: "none", border: "0.5px solid var(--border-gold)", borderRadius: "var(--radius-pill)", padding: "var(--space-2) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", color: "var(--gold)", fontSize: 14, fontFamily: "var(--font-body)" }}
            >
              <Question size={16} weight="bold" />
              How it works
            </button>
          )}
          {showEmcee && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/party/${partyId}/bonus/manage`)}
            >
              <PencilSimple size={14} weight="bold" />
              Edit Wagers
            </button>
          )}
        </div>
        <p className="page-subtitle">
          {searchQuery
            ? `${filteredEvents.length} of ${events.length} wagers`
            : `${events.length} ${events.length === 1 ? "wager" : "wagers"}`}
        </p>
      </div>
      {showGuide && createPortal(<WagerGuideModal onClose={() => setShowGuide(false)} />, document.body)}
      <div className="page-content">
        {events.length > 1 && (
          <div style={searchStyles.wrap}>
            <MagnifyingGlass size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search wagers..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={searchStyles.input}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {searchInput && (
              <button style={searchStyles.clear} onClick={() => { setSearchInput(""); setSearchQuery(""); }}>
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        )}

        {/* Emcee view: show management controls per wager */}
        {showEmcee ? (
          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filteredEvents.map((event) => (
              <div key={event.eventId} className="card" style={{ border: event.upNext ? "2px solid var(--gold)" : "0.5px solid var(--border-gold)" }}>
                {/* Closing soon banner */}
                {event.upNext && event.status === "open" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-3)", background: "var(--gold-glow)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-gold)" }}>
                    <Lightning size={16} weight="fill" style={{ color: "var(--gold)" }} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--gold)" }}>Closing soon</span>
                  </div>
                )}

                {/* Question + status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
                  <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)", flex: 1 }}>{event.question}</p>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)", flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--gold)" }}>
                      {(event.minWager || 1) === event.maxWager ? `${event.maxWager} pts` : `${event.minWager || 1}-${event.maxWager} pts`}
                    </span>
                    <span className={`badge ${event.status === "open" ? "badge-open" : event.status === "locked" ? "badge-locked" : "badge-resolved"}`}>{event.status}</span>
                  </div>
                </div>

                {/* Options display */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  {event.options.map((opt) => (
                    <span key={opt} style={{
                      padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-pill)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
                      background: opt === event.correctAnswer ? "var(--gold)" : "var(--surface-interactive)",
                      color: opt === event.correctAnswer ? "var(--text-on-gold)" : "var(--text-muted)",
                      border: opt === event.correctAnswer ? "none" : "0.5px solid var(--border)",
                    }}>{opt}{opt === event.correctAnswer && " ✓"}</span>
                  ))}
                  {event.correctAnswer === "__none__" && (
                    <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-pill)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", background: "var(--status-wrong)", color: "#fff" }}>No winner</span>
                  )}
                </div>

                {/* Resolve UI */}
                {resolvingId === event.eventId && (
                  <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--surface-interactive)", borderRadius: "var(--radius-md)" }}>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>Select correct answer</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {event.options.map((opt) => (
                        <button key={opt} className="btn btn-secondary btn-sm" onClick={() => handleResolve(event.eventId, opt)} disabled={actionLoading === `resolve-${event.eventId}`}>{opt}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                      <button className="btn btn-danger btn-sm" onClick={() => handleResolve(event.eventId, "__none__")} disabled={actionLoading === `resolve-${event.eventId}`}>
                        <X size={14} weight="bold" /> No one wins
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setResolvingId(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {resolvingId !== event.eventId && (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                    {event.status !== "resolved" && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleLock(event)} disabled={actionLoading === `lock-${event.eventId}`} title={event.status === "locked" ? "Unlock" : "Lock"}>
                          {event.status === "locked" ? <LockOpen size={16} /> : <Lock size={16} />}
                        </button>
                        {event.status === "open" && (
                          <button className={`btn ${event.upNext ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => handleToggleUpNext(event)} disabled={actionLoading === `upnext-${event.eventId}`} title={event.upNext ? "Clear closing soon" : "Mark closing soon"}>
                            <Lightning size={16} weight={event.upNext ? "fill" : "regular"} />
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setResolvingId(event.eventId)} style={{ marginLeft: "auto" }}>
                          <Trophy size={14} weight="bold" /> Resolve
                        </button>
                      </>
                    )}
                    {event.status === "resolved" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUnresolve(event.eventId)} disabled={actionLoading === `unresolve-${event.eventId}`}>
                        <ArrowCounterClockwise size={14} weight="bold" /> Reset
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Player view */
          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {filteredEvents.map((event) => (
              <BonusCard key={event.eventId} event={event} onWager={handleWager} onCancelWager={handleCancelWager} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", zIndex: 100 },
  modal: { background: "var(--surface-raised)", borderRadius: "var(--radius-xl)", border: "0.5px solid var(--border)", width: "100%", maxWidth: 420, maxHeight: "85dvh", overflow: "auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-4) var(--space-3)", borderBottom: "0.5px solid var(--border-subtle)" },
  title: { display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" },
  closeBtn: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "var(--space-1)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center" },
  body: { padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" },
  intro: { fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 },
  step: { display: "flex", gap: "var(--space-3)", alignItems: "flex-start" },
  stepIcon: { width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--gold-glow)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)", marginBottom: 2 },
  stepDesc: { fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.4 },
  tip: { padding: "var(--space-3)", background: "var(--gold-glow)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-gold)" },
  tipText: { fontSize: "var(--text-xs)", color: "var(--gold)", lineHeight: 1.5, fontStyle: "italic" },
};

const searchStyles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--surface-interactive)", borderRadius: "var(--radius-md)", border: "0.5px solid var(--border)", marginBottom: "var(--space-4)" },
  input: { flex: 1, border: "none", background: "transparent", padding: 0, fontSize: "var(--text-sm)", color: "var(--text-primary)", fontFamily: "var(--font-body)", outline: "none" },
  clear: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "var(--space-1)", display: "flex", alignItems: "center", flexShrink: 0 },
};
