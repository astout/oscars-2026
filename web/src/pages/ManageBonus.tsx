import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CaretLeft,
  Plus,
  Trash,
  Lock,
  LockOpen,
  Trophy,
  Check,
  X,
  PencilSimple,
  Sparkle,
  Lightning,
} from "@phosphor-icons/react";
import { api } from "../api/client.js";

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
}

interface Suggestion {
  eventId: string;
  question: string;
  options: string[];
  minWager?: number;
  maxWager: number;
}

export default function ManageBonus() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<BonusEvent[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Create/Edit form state
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["Yes", "No"]);
  const [formMinWager, setFormMinWager] = useState(1);
  const [formMaxWager, setFormMaxWager] = useState(3);
  const [newOption, setNewOption] = useState("");

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [evts, suggs] = await Promise.all([
        api.get<BonusEvent[]>(`/parties/${partyId}/bonus`),
        api.get<Suggestion[]>(`/parties/${partyId}/bonus/suggestions`).catch(() => []),
      ]);
      setEvents(evts);
      setSuggestions(suggs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormQuestion("");
    setFormOptions(["Yes", "No"]);
    setFormMinWager(1);
    setFormMaxWager(3);
    setNewOption("");
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!partyId || !formQuestion.trim() || formOptions.length < 1) return;
    setActionLoading("create");
    try {
      const created = await api.post<BonusEvent>(`/parties/${partyId}/bonus`, {
        question: formQuestion.trim(),
        options: formOptions,
        minWager: formMinWager,
        maxWager: formMaxWager,
      });
      setEvents((prev) => [...prev, created]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!partyId || !editingId || !formQuestion.trim() || formOptions.length < 1) return;
    setActionLoading("update");
    try {
      await api.put(`/parties/${partyId}/bonus/${editingId}`, {
        question: formQuestion.trim(),
        options: formOptions,
        minWager: formMinWager,
        maxWager: formMaxWager,
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.eventId === editingId
            ? { ...e, question: formQuestion.trim(), options: formOptions, minWager: formMinWager, maxWager: formMaxWager }
            : e
        )
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!partyId) return;
    setActionLoading(eventId);
    try {
      await api.delete(`/parties/${partyId}/bonus/${eventId}`);
      setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLock = async (event: BonusEvent) => {
    if (!partyId) return;
    const action = event.status === "locked" ? "unlock" : "lock";
    setActionLoading(`lock-${event.eventId}`);
    try {
      await api.post(`/parties/${partyId}/bonus/${event.eventId}/${action}`);
      setEvents((prev) =>
        prev.map((e) =>
          e.eventId === event.eventId
            ? { ...e, status: action === "lock" ? "locked" : "open" }
            : e
        )
      );
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
      await api.patch(`/parties/${partyId}/bonus/${eventId}`, { correctAnswer });
      setEvents((prev) =>
        prev.map((e) =>
          e.eventId === eventId
            ? { ...e, status: "resolved", correctAnswer, resolvedAt: new Date().toISOString() }
            : e
        )
      );
      setResolvingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdoptSuggestion = async (suggestion: Suggestion) => {
    if (!partyId) return;
    setActionLoading(`adopt-${suggestion.eventId}`);
    try {
      const created = await api.post<BonusEvent>(`/parties/${partyId}/bonus`, {
        question: suggestion.question,
        options: suggestion.options,
        minWager: suggestion.minWager,
        maxWager: suggestion.maxWager,
      });
      setEvents((prev) => [...prev, created]);
      setSuggestions((prev) => prev.filter((s) => s.eventId !== suggestion.eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (event: BonusEvent) => {
    setEditingId(event.eventId);
    setFormQuestion(event.question);
    setFormOptions([...event.options]);
    setFormMinWager(event.minWager || 1);
    setFormMaxWager(event.maxWager);
    setShowCreate(false);
  };

  const startCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const addOption = () => {
    const val = newOption.trim();
    if (!val || formOptions.includes(val)) return;
    setFormOptions((prev) => [...prev, val]);
    setNewOption("");
  };

  const removeOption = (idx: number) => {
    if (formOptions.length <= 1) return;
    setFormOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const isFormActive = showCreate || editingId;

  const statusBadge = (status: string) => {
    const cls = status === "open" ? "badge-open" : status === "locked" ? "badge-locked" : "badge-resolved";
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="page animate-fade-in-up">
      <div style={styles.topBar}>
        <button className="tap-target" onClick={() => navigate(`/party/${partyId}/settings`)} style={styles.backButton}>
          <CaretLeft size={18} weight="bold" />
          <span>Settings</span>
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Sparkle size={24} weight="fill" style={{ color: "var(--gold)" }} />
            Manage Wagers
          </h1>
          {!loading && (
            <p className="page-subtitle">{events.length} {events.length === 1 ? "wager" : "wagers"}</p>
          )}
        </div>

        {error && (
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
            {error}
          </p>
        )}

        {/* Create / Edit Form */}
        {isFormActive && (
          <div className="card" style={{ marginBottom: "var(--space-6)", border: "0.5px solid var(--border-gold)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              {editingId ? <PencilSimple size={16} weight="bold" style={{ color: "var(--gold)" }} /> : <Plus size={16} weight="bold" style={{ color: "var(--gold)" }} />}
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                {editingId ? "Edit Wager" : "New Wager"}
              </p>
            </div>

            {/* Question */}
            <input
              className="input"
              placeholder="Enter your question..."
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              maxLength={200}
              autoFocus
              style={{ marginBottom: "var(--space-3)" }}
            />

            {/* Options */}
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
              Options ({formOptions.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              {formOptions.map((opt, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{
                    flex: 1,
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-interactive)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    border: "0.5px solid var(--border)",
                  }}>
                    {opt}
                  </span>
                  {formOptions.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeOption(idx)} aria-label={`Remove ${opt}`}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {formOptions.length < 15 && (
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <input
                    className="input"
                    placeholder="Add option..."
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                    maxLength={100}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={addOption} disabled={!newOption.trim()}>
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
              )}
            </div>

            {/* Min Wager */}
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
              Min Wager
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              {[1, 2, 3, 4, 5, 6, 7].filter((w) => w <= formMaxWager).map((w) => (
                <button
                  key={w}
                  className="tap-target"
                  onClick={() => { setFormMinWager(w); if (formMaxWager < w) setFormMaxWager(w); }}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    border: formMinWager === w ? "none" : "0.5px solid var(--border)",
                    background: formMinWager === w ? "var(--gold)" : "transparent",
                    color: formMinWager === w ? "var(--text-on-gold)" : "var(--text-secondary)",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Max Wager */}
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
              Max Wager
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
              {[1, 2, 3, 4, 5, 6, 7].filter((w) => w >= formMinWager).map((w) => (
                <button
                  key={w}
                  className="tap-target"
                  onClick={() => { setFormMaxWager(w); if (formMinWager > w) setFormMinWager(w); }}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    border: formMaxWager === w ? "none" : "0.5px solid var(--border)",
                    background: formMaxWager === w ? "var(--gold)" : "transparent",
                    color: formMaxWager === w ? "var(--text-on-gold)" : "var(--text-secondary)",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Members wager {formMinWager === formMaxWager ? `${formMaxWager}` : `${formMinWager}-${formMaxWager}`} pts. Correct = +wager, wrong = -wager.
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="btn btn-primary"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!formQuestion.trim() || formOptions.length < 1 || actionLoading === "create" || actionLoading === "update"}
                style={{ flex: 1 }}
              >
                <Check size={16} weight="bold" />
                {editingId ? "Save Changes" : "Create Wager"}
              </button>
              <button className="btn btn-ghost" onClick={resetForm} style={{ flex: 0 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Button (when form is hidden) */}
        {!isFormActive && (
          <button className="btn btn-primary btn-full" onClick={startCreate} style={{ marginBottom: "var(--space-6)" }}>
            <Plus size={18} weight="bold" />
            New Wager
          </button>
        )}

        {/* Template Suggestions */}
        {suggestions.length > 0 && !isFormActive && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <Lightning size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Suggested Wagers
              </p>
            </div>
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {suggestions.map((s) => (
                <div key={s.eventId} className="card" style={{ border: "1px dashed var(--border-gold)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>
                        {s.question}
                      </p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        {s.options.join(" / ")} &middot; {(s.minWager || 1) === s.maxWager ? `${s.maxWager} pts` : `${s.minWager || 1}-${s.maxWager} pts`}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAdoptSuggestion(s)}
                      disabled={actionLoading === `adopt-${s.eventId}`}
                    >
                      <Plus size={14} weight="bold" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : events.length === 0 && !isFormActive ? (
          <div className="empty-state">
            <Sparkle size={48} className="empty-state-icon" />
            <p className="empty-state-title">No wagers yet</p>
            <p className="empty-state-text">Create custom wager questions for your party members.</p>
          </div>
        ) : (
          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {events.map((event) => (
              <div
                key={event.eventId}
                className="card"
                style={{ border: event.status === "resolved" ? "0.5px solid var(--border-gold)" : undefined }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
                      {event.question}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                      <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--gold)" }}>
                        {(event.minWager || 1) === event.maxWager ? `${event.maxWager} pts` : `${event.minWager || 1}-${event.maxWager} pts`}
                      </span>
                      {statusBadge(event.status)}
                    </div>
                  </div>
                </div>

                {/* Options display */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  {event.options.map((opt) => (
                    <span
                      key={opt}
                      style={{
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
                      {opt === event.correctAnswer && " ✓"}
                    </span>
                  ))}
                  {event.correctAnswer === "__none__" && (
                    <span style={{
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

                {/* Resolve UI */}
                {resolvingId === event.eventId && (
                  <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--surface-interactive)", borderRadius: "var(--radius-md)" }}>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" }}>
                      Select correct answer
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {event.options.map((opt) => (
                        <button
                          key={opt}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleResolve(event.eventId, opt)}
                          disabled={actionLoading === `resolve-${event.eventId}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleResolve(event.eventId, "__none__")}
                        disabled={actionLoading === `resolve-${event.eventId}`}
                      >
                        <X size={14} weight="bold" />
                        No one wins
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setResolvingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {resolvingId !== event.eventId && (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                    {event.status !== "resolved" && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleLock(event)}
                          disabled={actionLoading === `lock-${event.eventId}`}
                          title={event.status === "locked" ? "Unlock" : "Lock"}
                        >
                          {event.status === "locked" ? <LockOpen size={16} /> : <Lock size={16} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => startEdit(event)}
                          title="Edit"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setResolvingId(event.eventId)}
                          style={{ marginLeft: "auto" }}
                        >
                          <Trophy size={14} weight="bold" />
                          Resolve
                        </button>
                      </>
                    )}
                    {confirmDelete === event.eventId ? (
                      <div style={{ display: "flex", gap: "var(--space-2)", marginLeft: event.status === "resolved" ? "0" : "auto" }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(event.eventId)}
                          disabled={actionLoading === event.eventId}
                        >
                          Delete
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmDelete(event.eventId)}
                        title="Delete"
                        style={{ marginLeft: event.status === "resolved" ? "auto" : undefined }}
                      >
                        <Trash size={16} style={{ color: "var(--status-wrong)" }} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: "flex",
    alignItems: "center",
    padding: "var(--space-2) var(--space-3)",
    borderBottom: "0.5px solid var(--border-subtle)",
    background: "var(--surface-base)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
    background: "none",
    border: "none",
    color: "var(--gold)",
    fontSize: "var(--text-sm)",
    fontFamily: "var(--font-body)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    cursor: "pointer",
    padding: "var(--space-1) var(--space-2)",
    borderRadius: "var(--radius-md)",
  },
};
