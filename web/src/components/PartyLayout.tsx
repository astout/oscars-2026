import { useState, useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { CaretLeft } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import BottomNav from "./BottomNav.js";

interface Party {
  academyId: string;
  name: string;
}

export default function PartyLayout() {
  const { academyId } = useParams<{ academyId: string }>();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    if (!academyId) return;
    api.get<Party>(`/academies/${academyId}`).then(setParty).catch(() => {});
  }, [academyId]);

  if (!academyId) return null;

  return (
    <>
      <div style={styles.topBar}>
        <button
          className="tap-target"
          onClick={() => navigate("/")}
          style={styles.backButton}
          aria-label="Back to Watch Parties"
        >
          <CaretLeft size={18} weight="bold" />
          <span style={styles.partyName}>
            {party?.name || "Watch Party"}
          </span>
        </button>
      </div>
      <Outlet />
      <BottomNav academyId={academyId} />
    </>
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
  partyName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: 250,
  },
};
