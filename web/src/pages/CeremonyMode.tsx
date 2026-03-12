import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Lock,
  LockOpen,
  Trophy,
  Check,
  CaretDown,
  CaretUp,
  Crown,
  Lightning,
} from "@phosphor-icons/react";
import { api } from "../api/client.js";
import OscarStatuette from "../components/OscarStatuette.js";

interface Nominee {
  nomineeId: string;
  categoryId: string;
  name: string;
  subtitle?: string;
  displayOrder: number;
}

interface Category {
  categoryId: string;
  name: string;
  displayOrder: number;
  upNext: boolean;
  winnerId: string | null;
  locked: boolean;
  resolvedAt: string | null;
  nominees: Nominee[];
}

interface PartyInfo {
  partyId: string;
  name: string;
  allLocked: boolean;
}

export default function CeremonyMode() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [cats, p] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<PartyInfo>(`/parties/${partyId}`),
      ]);
      setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
      setParty(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAllLock = async () => {
    if (!partyId || !party) return;
    setActionLoading("all-lock");
    try {
      const endpoint = party.allLocked ? "unlock" : "lock";
      await api.post(`/parties/${partyId}/${endpoint}`);
      setParty({ ...party, allLocked: !party.allLocked });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle lock");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCategoryLock = async (cat: Category) => {
    if (!partyId) return;
    setActionLoading(`lock-${cat.categoryId}`);
    try {
      const endpoint = cat.locked ? "unlock" : "lock";
      await api.post(
        `/parties/${partyId}/categories/${cat.categoryId}/${endpoint}`
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.categoryId === cat.categoryId ? { ...c, locked: !c.locked } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle lock");
    } finally {
      setActionLoading(null);
    }
  };

  const setWinner = async (categoryId: string, nomineeId: string, currentWinnerId: string | null) => {
    if (!partyId) return;
    const clearing = nomineeId === currentWinnerId;
    setActionLoading(`winner-${categoryId}`);
    try {
      await api.post(
        `/parties/${partyId}/categories/${categoryId}/winner`,
        { winnerId: clearing ? null : nomineeId }
      );
      setCategories((prev) =>
        prev.map((c) =>
          c.categoryId === categoryId
            ? clearing
              ? { ...c, winnerId: null, resolvedAt: null, locked: true }
              : { ...c, winnerId: nomineeId, resolvedAt: new Date().toISOString() }
            : c
        )
      );
      if (!clearing) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set winner");
    } finally {
      setActionLoading(null);
    }
  };

  const setUpNext = async (categoryId: string, isUpNext: boolean) => {
    if (!partyId) return;
    setActionLoading(`upnext-${categoryId}`);
    try {
      if (isUpNext) {
        await api.delete(`/parties/${partyId}/categories/${categoryId}/up-next`);
      } else {
        await api.post(`/parties/${partyId}/categories/${categoryId}/up-next`);
      }
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          upNext: c.categoryId === categoryId ? !isUpNext : false,
          locked: c.categoryId === categoryId && !isUpNext ? true : c.locked,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  const resolvedCount = categories.filter((c) => c.winnerId).length;
  const totalCount = categories.length;

  if (!partyId) return null;

  return (
    <div className="page">
      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-4)" }}>
          <OscarStatuette size={80} />
        </div>
        <div className="page-header animate-fade-in-up">
          <h1 className="page-title">Ceremony Mode</h1>
          {!loading && (
            <p className="page-subtitle">
              {resolvedCount} of {totalCount} announced
            </p>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {party && (
          <div className="card" style={styles.lockCard}>
            <div style={styles.lockRow}>
              <div>
                <p style={styles.lockLabel}>All Categories</p>
                <p style={styles.lockStatus}>
                  {party.allLocked ? "Locked — picks frozen" : "Unlocked — picks open"}
                </p>
              </div>
              <button
                className={`btn ${party.allLocked ? "btn-primary" : "btn-secondary"} btn-sm`}
                onClick={toggleAllLock}
                disabled={actionLoading === "all-lock"}
              >
                {party.allLocked ? (
                  <><LockOpen size={16} weight="bold" /> Unlock All</>
                ) : (
                  <><Lock size={16} weight="bold" /> Lock All</>
                )}
              </button>
            </div>
          </div>
        )}

        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate(`/party/${partyId}/ceremony/emcees`)}
          style={{ marginBottom: "var(--space-4)" }}
        >
          <Crown size={18} weight="bold" style={{ color: "var(--gold)" }} />
          Manage Emcees
        </button>

        {loading ? (
          <div style={styles.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: 64 }} />
            ))}
          </div>
        ) : (
          <div className="stagger-children" style={styles.list}>
            {categories.map((cat) => {
              const isExpanded = expandedId === cat.categoryId;
              const winner = cat.winnerId
                ? cat.nominees.find((n) => n.nomineeId === cat.winnerId)
                : null;

              return (
                <div key={cat.categoryId} className="card" style={styles.catCard}>
                  <button
                    className="tap-target"
                    style={styles.catHeader}
                    onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                  >
                    <div style={styles.catInfo}>
                      <div style={styles.catNameRow}>
                        <p style={styles.catName}>{cat.name}</p>
                        {cat.winnerId && (
                          <Trophy size={14} weight="fill" style={{ color: "var(--gold-bright)", flexShrink: 0 }} />
                        )}
                      </div>
                      {winner ? (
                        <p style={styles.winnerName}>{winner.name}</p>
                      ) : cat.upNext ? (
                        <p style={styles.upNextText}>Up Next</p>
                      ) : (
                        <p style={styles.pendingText}>{cat.locked ? "Locked" : "Open"}</p>
                      )}
                    </div>
                    <div style={styles.catActions}>
                      {!cat.winnerId && (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); setUpNext(cat.categoryId, cat.upNext); }}
                            disabled={actionLoading === `upnext-${cat.categoryId}`}
                            aria-label={cat.upNext ? "Clear up next" : "Set up next"}
                            style={{ color: cat.upNext ? "var(--gold)" : "var(--text-faint)" }}
                          >
                            <Lightning size={16} weight={cat.upNext ? "fill" : "regular"} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); toggleCategoryLock(cat); }}
                            disabled={actionLoading === `lock-${cat.categoryId}`}
                            aria-label={cat.locked ? "Unlock" : "Lock"}
                            style={{ color: cat.locked ? "var(--status-wrong)" : "var(--text-muted)" }}
                          >
                            {cat.locked ? <Lock size={16} weight="fill" /> : <LockOpen size={16} />}
                          </button>
                        </>
                      )}
                      {isExpanded ? (
                        <CaretUp size={16} style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <CaretDown size={16} style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={styles.nominees}>
                      {cat.nominees
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((nom) => {
                          const isWinner = cat.winnerId === nom.nomineeId;
                          return (
                            <button
                              key={nom.nomineeId}
                              className={`tap-target ${isWinner ? "card-winner" : ""}`}
                              style={{ ...styles.nomineeRow, ...(isWinner ? styles.nomineeWinner : {}) }}
                              onClick={() => setWinner(cat.categoryId, nom.nomineeId, cat.winnerId)}
                              disabled={actionLoading === `winner-${cat.categoryId}`}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={styles.nomineeName}>{nom.name}</p>
                                {nom.subtitle && <p style={styles.nomineeSubtitle}>{nom.subtitle}</p>}
                              </div>
                              {isWinner && (
                                <Check size={18} weight="bold" style={{ color: "var(--gold-bright)", flexShrink: 0 }} />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  error: { color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" },
  lockCard: { marginBottom: "var(--space-4)", border: "0.5px solid var(--border-gold)" },
  lockRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" },
  lockLabel: { fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)" as unknown as number, color: "var(--text-primary)" },
  lockStatus: { fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 },
  list: { display: "flex", flexDirection: "column" as const, gap: "var(--space-2)" },
  catCard: { padding: 0, overflow: "hidden" },
  catHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "var(--space-3) var(--space-4)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "left" as const },
  catInfo: { flex: 1, minWidth: 0 },
  catNameRow: { display: "flex", alignItems: "center", gap: "var(--space-2)" },
  catName: { fontSize: "var(--text-base)", fontWeight: "var(--weight-medium)" as unknown as number, color: "var(--text-primary)" },
  winnerName: { fontSize: "var(--text-sm)", color: "var(--gold)", marginTop: 2 },
  pendingText: { fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 },
  upNextText: { fontSize: "var(--text-sm)", color: "var(--gold)", fontWeight: "var(--weight-medium)" as unknown as number, marginTop: 2 },
  catActions: { display: "flex", alignItems: "center", gap: "var(--space-1)", flexShrink: 0 },
  nominees: { borderTop: "0.5px solid var(--border-subtle)", padding: "var(--space-2)", display: "flex", flexDirection: "column" as const, gap: "var(--space-1)" },
  nomineeRow: { display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-3)", borderRadius: "var(--radius-md)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "left" as const, width: "100%", transition: "background 150ms" },
  nomineeWinner: { background: "var(--gold-glow)" },
  nomineeName: { fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" as unknown as number },
  nomineeSubtitle: { fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 },
};
