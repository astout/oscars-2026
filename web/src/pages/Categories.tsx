import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FilmSlate, Sparkle } from "@phosphor-icons/react";
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

export default function Categories() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [picksMap, setPicksMap] = useState<Map<string, Pick>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    setError("");
    try {
      const [cats, picks] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<Pick[]>(`/parties/${partyId}/picks`),
      ]);
      setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
      setPicksMap(new Map(picks.map((p) => [p.categoryId, p])));
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

  const pickedCount = picksMap.size;
  const totalCount = categories.length;

  if (!partyId) return null;

  return (
    <div className="page">
      <div className="page-content">
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-4)" }}>
          <OscarStatuette size={80} />
        </div>

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

        <div className="page-header animate-fade-in-up">
          <h1 className="page-title" style={styles.title}>
            <FilmSlate size={24} weight="fill" style={{ color: "var(--gold)" }} />
            Categories
          </h1>
          {!loading && (
            <p className="page-subtitle">
              {pickedCount} of {totalCount} picked
            </p>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <div className="category-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card skeleton" style={styles.skeleton} />
            ))}
          </div>
        ) : (
          <div className="category-grid stagger-children">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.categoryId}
                category={cat}
                pick={picksMap.get(cat.categoryId)}
                onSelect={setSelectedCategory}
              />
            ))}
          </div>
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
  error: { color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" },
  skeleton: { height: 120 },
  wagerBanner: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: "var(--surface-raised)",
    border: "0.5px solid var(--border-gold)",
    borderRadius: "var(--radius-lg)",
    marginTop: "var(--space-4)",
    cursor: "pointer",
    width: "100%",
    textAlign: "left" as const,
    fontFamily: "var(--font-body)",
  },
  wagerText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  wagerLink: {
    color: "var(--gold)",
    fontWeight: "var(--weight-semibold)" as unknown as number,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  },
};
