import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FilmSlate, Sparkle, MagnifyingGlass, X,
  Lock, LockOpen, Trophy, Check, CaretDown, CaretUp, Crown, Lightning, Microphone,
} from "@phosphor-icons/react";
import { api } from "../api/client.js";
import CategoryCard from "../components/CategoryCard.js";
import PickModal from "../components/PickModal.js";
import OscarStatuette from "../components/OscarStatuette.js";

interface Nominee {
  nomineeId: string;
  categoryId: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  displayOrder: number;
}

interface Category {
  categoryId: string;
  name: string;
  displayOrder: number;
  showImages: boolean;
  upNext: boolean;
  winnerId: string | null;
  locked: boolean;
  resolvedAt: string | null;
  nominees: Nominee[];
}

interface Pick {
  userId: string;
  categoryId: string;
  pick1NomineeId: string;
  pick2NomineeId: string;
  updatedAt: string;
}

const EMCEE_MODE_KEY = "oscars-emcee-mode";

export default function Categories() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [picksMap, setPicksMap] = useState<Map<string, Pick>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Emcee state
  const [canEmcee, setCanEmcee] = useState(false);
  const [isGlobalEmcee, setIsGlobalEmcee] = useState(false);
  const [isSelfEmcee, setIsSelfEmcee] = useState(false);
  const [emceeMode, setEmceeMode] = useState(() => localStorage.getItem(EMCEE_MODE_KEY) === "true");
  const [allLocked, setAllLocked] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return categories.filter((cat) => {
      const catName = cat.name.toLowerCase();
      const nomineeText = cat.nominees.map((n) => `${n.name} ${n.subtitle || ""}`).join(" ").toLowerCase();
      const searchable = `${catName} ${nomineeText}`;
      return terms.every((term) => searchable.includes(term));
    });
  }, [categories, searchQuery]);

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    setError("");
    try {
      const party = await api.get<{ isEmcee?: boolean; isTemplateParty?: boolean; emceeSync?: boolean; allLocked?: boolean; role?: string }>(`/parties/${partyId}`);
      const selfEmcee = party.emceeSync === false;
      const catEndpoint = selfEmcee ? `/parties/${partyId}/categories` : "/categories";
      const [cats, picks] = await Promise.all([
        api.get<Category[]>(catEndpoint),
        api.get<Pick[]>(`/parties/${partyId}/picks`),
      ]);
      setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
      setPicksMap(new Map(picks.map((p) => [p.categoryId, p])));
      const isHost = party.role === "host";
      setCanEmcee(!!party.isEmcee || (selfEmcee && isHost));
      setIsGlobalEmcee(!!party.isEmcee);
      setIsSelfEmcee(selfEmcee);
      setAllLocked(!!party.allLocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePickSaved = (pick: Pick) => {
    setPicksMap((prev) => {
      const next = new Map(prev);
      next.set(pick.categoryId, pick);
      return next;
    });
    setSelectedCategory(null);
  };

  // Emcee handlers
  const toggleAllLock = async () => {
    if (!partyId) return;
    setActionLoading("all-lock");
    try {
      const endpoint = allLocked ? "unlock" : "lock";
      await api.post(`/parties/${partyId}/${endpoint}`);
      setAllLocked(!allLocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCategoryLock = async (cat: Category) => {
    if (!partyId) return;
    setActionLoading(`lock-${cat.categoryId}`);
    try {
      const endpoint = cat.locked ? "unlock" : "lock";
      await api.post(`/parties/${partyId}/categories/${cat.categoryId}/${endpoint}`);
      setCategories((prev) => prev.map((c) => c.categoryId === cat.categoryId ? { ...c, locked: !c.locked } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const setWinner = async (categoryId: string, nomineeId: string, currentWinnerId: string | null) => {
    if (!partyId) return;
    const clearing = nomineeId === currentWinnerId;
    setActionLoading(`winner-${categoryId}`);
    try {
      const winnerRoute = isSelfEmcee ? "party-winner" : "winner";
      await api.post(`/parties/${partyId}/categories/${categoryId}/${winnerRoute}`, { winnerId: clearing ? null : nomineeId });
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
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const setUpNext = async (categoryId: string, isUpNext: boolean) => {
    if (!partyId) return;
    setActionLoading(`upnext-${categoryId}`);
    try {
      const upNextRoute = isSelfEmcee ? "party-up-next" : "up-next";
      if (isUpNext) {
        await api.delete(`/parties/${partyId}/categories/${categoryId}/${upNextRoute}`);
      } else {
        await api.post(`/parties/${partyId}/categories/${categoryId}/${upNextRoute}`);
      }
      setCategories((prev) => prev.map((c) => ({ ...c, upNext: c.categoryId === categoryId ? !isUpNext : false })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  };

  const pickedCount = picksMap.size;
  const totalCount = categories.length;
  const resolvedCount = categories.filter((c) => c.winnerId).length;
  const showEmcee = canEmcee && emceeMode;

  if (!partyId) return null;

  return (
    <div className="page">
      <div className="page-content">
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

        {!showEmcee && (
          <button
            onClick={() => navigate(`/party/${partyId}/bonus`)}
            style={styles.wagerBanner}
            className="tap-target"
          >
            <Sparkle size={20} weight="fill" style={{ color: "var(--gold)", flexShrink: 0 }} />
            <p style={styles.wagerText}>
              New this year! Don't miss out on earning extra points with{" "}
              <span style={styles.wagerLink}>Wagers</span>.
            </p>
          </button>
        )}

        <div className="page-header animate-fade-in-up">
          <h1 className="page-title" style={styles.title}>
            <FilmSlate size={24} weight="fill" style={{ color: "var(--gold)" }} />
            Categories
          </h1>
          {!loading && (
            <p className="page-subtitle">
              {showEmcee
                ? `${resolvedCount} of ${totalCount} announced`
                : searchQuery
                  ? `${filteredCategories.length} of ${totalCount} categories`
                  : `${pickedCount} of ${totalCount} picked`}
            </p>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Emcee view */}
        {showEmcee && !loading && (
          <>
            {/* Lock all card */}
            <div className="card" style={styles.lockCard}>
              <div style={styles.lockRow}>
                <div>
                  <p style={styles.lockLabel}>All Categories</p>
                  <p style={styles.lockStatus}>{allLocked ? "Locked — picks frozen" : "Unlocked — picks open"}</p>
                </div>
                <button
                  className={`btn ${allLocked ? "btn-primary" : "btn-secondary"} btn-sm`}
                  onClick={toggleAllLock}
                  disabled={actionLoading === "all-lock"}
                >
                  {allLocked ? <><LockOpen size={16} weight="bold" /> Unlock All</> : <><Lock size={16} weight="bold" /> Lock All</>}
                </button>
              </div>
            </div>

            {/* Manage Emcees button (global emcees only) */}
            {isGlobalEmcee && (
              <button
                className="btn btn-secondary btn-full"
                onClick={() => navigate(`/party/${partyId}/ceremony/emcees`)}
                style={{ marginBottom: "var(--space-4)" }}
              >
                <Crown size={18} weight="bold" style={{ color: "var(--gold)" }} />
                Manage Emcees
              </button>
            )}

            {/* Category list with emcee controls */}
            <div className="stagger-children" style={styles.list}>
              {categories.map((cat) => {
                const isExpanded = expandedId === cat.categoryId;
                const winner = cat.winnerId ? cat.nominees.find((n) => n.nomineeId === cat.winnerId) : null;

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
                          {cat.winnerId && <Trophy size={14} weight="fill" style={{ color: "var(--gold-bright)", flexShrink: 0 }} />}
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
                              style={{ color: cat.upNext ? "var(--gold)" : "var(--text-faint)" }}
                            >
                              <Lightning size={16} weight={cat.upNext ? "fill" : "regular"} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => { e.stopPropagation(); toggleCategoryLock(cat); }}
                              disabled={actionLoading === `lock-${cat.categoryId}`}
                              style={{ color: cat.locked ? "var(--status-wrong)" : "var(--text-muted)" }}
                            >
                              {cat.locked ? <Lock size={16} weight="fill" /> : <LockOpen size={16} />}
                            </button>
                          </>
                        )}
                        {isExpanded ? <CaretUp size={16} style={{ color: "var(--text-muted)" }} /> : <CaretDown size={16} style={{ color: "var(--text-muted)" }} />}
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
                                {isWinner && <Check size={18} weight="bold" style={{ color: "var(--gold-bright)", flexShrink: 0 }} />}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Player view */}
        {!showEmcee && (
          <>
            {!loading && categories.length > 0 && (
              <div style={styles.searchWrap}>
                <MagnifyingGlass size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search categories or nominees..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="input"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {searchInput && (
                  <button style={styles.searchClear} onClick={() => { setSearchInput(""); setSearchQuery(""); }}>
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="category-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card skeleton" style={styles.skeleton} />
                ))}
              </div>
            ) : (
              <div className="category-grid stagger-children">
                {filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat.categoryId}
                    category={cat}
                    pick={picksMap.get(cat.categoryId)}
                    onSelect={setSelectedCategory}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedCategory && (
        <PickModal
          category={selectedCategory}
          existingPick={picksMap.get(selectedCategory.categoryId)}
          partyId={partyId}
          onClose={() => setSelectedCategory(null)}
          onSaved={handlePickSaved}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { display: "flex", alignItems: "center", gap: "var(--space-2)" },
  searchWrap: {
    display: "flex", alignItems: "center", gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)", background: "var(--surface-interactive)",
    borderRadius: "var(--radius-md)", border: "0.5px solid var(--border)", marginBottom: "var(--space-4)",
  },
  searchInput: { flex: 1, border: "none", background: "transparent", padding: 0, fontSize: "var(--text-sm)", outline: "none" },
  searchClear: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "var(--space-1)", display: "flex", alignItems: "center", flexShrink: 0 },
  error: { color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" },
  skeleton: { height: 120 },
  wagerBanner: {
    display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
    background: "var(--surface-raised)", border: "0.5px solid var(--border-gold)", borderRadius: "var(--radius-lg)",
    marginTop: "var(--space-4)", cursor: "pointer", width: "100%", textAlign: "left" as const, fontFamily: "var(--font-body)",
  },
  wagerText: { fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.4 },
  wagerLink: { color: "var(--gold)", fontWeight: "var(--weight-semibold)" as unknown as number, textDecoration: "underline", textUnderlineOffset: 2 },
  // Emcee styles
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
  nomineeRow: { display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "left" as const, width: "100%", transition: "background 150ms" },
  nomineeWinner: { background: "var(--gold-glow)" },
  nomineeName: { fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" as unknown as number },
  nomineeSubtitle: { fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 },
};
