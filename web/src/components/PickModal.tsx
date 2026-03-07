import { useState } from "react";
import { X, ArrowLeft, Check, Star, Lock } from "@phosphor-icons/react";
import { api } from "../api/client.js";

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

interface PickModalProps {
  category: Category;
  existingPick?: Pick;
  academyId: string;
  onClose: () => void;
  onSaved: (pick: Pick) => void;
}

export default function PickModal({ category, existingPick, academyId, onClose, onSaved }: PickModalProps) {
  const [pick1, setPick1] = useState<string | null>(existingPick?.pick1NomineeId ?? null);
  const [pick2, setPick2] = useState<string | null>(existingPick?.pick2NomineeId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nominees = [...category.nominees].sort((a, b) => a.displayOrder - b.displayOrder);
  const isLocked = category.locked;

  const handleNomineeClick = (nomineeId: string) => {
    if (isLocked) return;
    if (!pick1) {
      setPick1(nomineeId);
    } else if (!pick2 && nomineeId !== pick1) {
      setPick2(nomineeId);
    }
  };

  const clearPick1 = () => {
    setPick1(null);
    setPick2(null);
  };

  const clearPick2 = () => {
    setPick2(null);
  };

  const handleConfirm = async () => {
    if (!pick1 || !pick2) return;
    setSaving(true);
    setError("");
    try {
      const result = await api.put<Pick>(
        `/academies/${academyId}/picks/${category.categoryId}`,
        { pick1NomineeId: pick1, pick2NomineeId: pick2 }
      );
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save picks");
      setSaving(false);
    }
  };

  const pick1Nominee = pick1 ? nominees.find((n) => n.nomineeId === pick1) : null;
  const pick2Nominee = pick2 ? nominees.find((n) => n.nomineeId === pick2) : null;
  const availableNominees = nominees.filter((n) => n.nomineeId !== pick1);
  const step = !pick1 ? 1 : !pick2 ? 2 : 3;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <button className="btn btn-ghost" onClick={onClose}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <span className="modal-title category-label">{category.name}</span>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div style={styles.body}>
          {isLocked && (
            <div style={styles.lockedBanner}>
              <Lock size={16} weight="bold" />
              <span>This category is locked</span>
            </div>
          )}

          {/* Selected picks display */}
          {pick1Nominee && (
            <div style={styles.selectedSection}>
              <div className="pick-indicator pick-1" style={styles.selectedRow}>
                <Star size={16} weight="fill" style={{ color: "var(--pick-1)", flexShrink: 0 }} />
                <div style={styles.selectedInfo}>
                  <span style={styles.selectedLabel}>1st Pick</span>
                  <span style={styles.selectedName}>{pick1Nominee.name}</span>
                  {pick1Nominee.subtitle && <span style={styles.selectedSub}>{pick1Nominee.subtitle}</span>}
                </div>
                <span className="mono" style={styles.selectedPts}>+5</span>
                {!isLocked && (
                  <button className="btn btn-ghost" style={styles.clearBtn} onClick={clearPick1}>
                    <X size={16} weight="bold" />
                  </button>
                )}
              </div>

              {pick2Nominee && (
                <div className="pick-indicator pick-2" style={styles.selectedRow}>
                  <Star size={16} weight="fill" style={{ color: "var(--pick-2)", flexShrink: 0 }} />
                  <div style={styles.selectedInfo}>
                    <span style={styles.selectedLabel}>2nd Pick</span>
                    <span style={styles.selectedName}>{pick2Nominee.name}</span>
                    {pick2Nominee.subtitle && <span style={styles.selectedSub}>{pick2Nominee.subtitle}</span>}
                  </div>
                  <span className="mono" style={styles.selectedPts}>+3</span>
                  {!isLocked && (
                    <button className="btn btn-ghost" style={styles.clearBtn} onClick={clearPick2}>
                      <X size={16} weight="bold" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step prompt */}
          {!isLocked && step < 3 && (
            <p style={styles.prompt}>
              {step === 1
                ? "Select your 1st pick (5 pts)"
                : "Select your 2nd pick (3 pts)"}
            </p>
          )}

          {/* Nominee list */}
          {!isLocked && step < 3 && (
            <div style={styles.nomineeList} className="stagger-children">
              {(step === 1 ? nominees : availableNominees).map((nominee) => (
                <button
                  key={nominee.nomineeId}
                  className="tap-target"
                  style={styles.nomineeRow}
                  onClick={() => handleNomineeClick(nominee.nomineeId)}
                >
                  <div style={styles.nomineeInfo}>
                    <span style={styles.nomineeName}>{nominee.name}</span>
                    {nominee.subtitle && <span style={styles.nomineeSub}>{nominee.subtitle}</span>}
                  </div>
                  <Check size={18} style={{ color: "var(--text-faint)" }} />
                </button>
              ))}
            </div>
          )}

          {/* Read-only nominee list for locked */}
          {isLocked && (
            <div style={styles.nomineeList}>
              {nominees.map((nominee) => {
                const isPick1 = nominee.nomineeId === pick1;
                const isPick2 = nominee.nomineeId === pick2;
                return (
                  <div
                    key={nominee.nomineeId}
                    style={{
                      ...styles.nomineeRowStatic,
                      ...(isPick1 ? { borderLeft: "3px solid var(--pick-1)", background: "var(--pick-1-glow)" } : {}),
                      ...(isPick2 ? { borderLeft: "3px solid var(--pick-2)", background: "var(--pick-2-glow)" } : {}),
                    }}
                  >
                    <div style={styles.nomineeInfo}>
                      <span style={styles.nomineeName}>{nominee.name}</span>
                      {nominee.subtitle && <span style={styles.nomineeSub}>{nominee.subtitle}</span>}
                    </div>
                    {isPick1 && <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--pick-1)" }}>+5</span>}
                    {isPick2 && <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--pick-2)" }}>+3</span>}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}
        </div>

        {/* Confirm button */}
        {!isLocked && (
          <div style={styles.footer}>
            <button
              className="btn btn-primary btn-lg btn-full"
              disabled={step < 3 || saving}
              onClick={handleConfirm}
            >
              {saving ? "Saving..." : "Confirm Picks"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    padding: "var(--space-4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  },
  lockedBanner: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-3) var(--space-4)",
    background: "rgba(229, 76, 53, 0.1)",
    borderRadius: "var(--radius-md)",
    color: "var(--status-locked)",
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)",
  },
  selectedSection: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  selectedRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
  },
  selectedInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  selectedLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "var(--tracking-wide)",
  },
  selectedName: {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  selectedSub: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },
  selectedPts: {
    fontSize: "var(--text-sm)",
    flexShrink: 0,
  },
  clearBtn: {
    padding: "var(--space-1)",
    minHeight: "auto",
    color: "var(--text-muted)",
  },
  prompt: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: "var(--weight-medium)",
  },
  nomineeList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
  },
  nomineeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: "var(--surface-interactive)",
    border: "0.5px solid var(--border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    textAlign: "left" as const,
    width: "100%",
  },
  nomineeRowStatic: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: "var(--surface-interactive)",
    borderRadius: "var(--radius-md)",
  },
  nomineeInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  nomineeName: {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  nomineeSub: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
  },
  error: {
    color: "var(--status-wrong)",
    fontSize: "var(--text-sm)",
    textAlign: "center" as const,
  },
  footer: {
    padding: "var(--space-4)",
    borderTop: "0.5px solid var(--border)",
    paddingBottom: "calc(var(--space-4) + env(safe-area-inset-bottom))",
  },
};
