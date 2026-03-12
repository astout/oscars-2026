import { useState, useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { CaretLeft, UserCircle } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import BottomNav from "./BottomNav.js";
import ToastContainer, { useToastQueue } from "./Toast.js";
import { useNotifications } from "../hooks/useNotifications.js";

interface PartyInfo {
  partyId: string;
  name: string;
}

export default function PartyLayout() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyInfo | null>(null);
  const { toasts, addToast, dismissToast } = useToastQueue();

  useNotifications(partyId, addToast);

  useEffect(() => {
    if (!partyId) return;
    api.get<PartyInfo>(`/parties/${partyId}`).then(setParty).catch(() => {});
  }, [partyId]);

  if (!partyId) return null;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} partyId={partyId} />
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
        <button
          className="tap-target"
          onClick={() => navigate("/profile")}
          style={styles.profileButton}
          aria-label="Profile"
        >
          <UserCircle size={24} weight="bold" />
        </button>
      </div>
      <Outlet />
      <BottomNav partyId={partyId} />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
  profileButton: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "var(--space-1)",
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
  },
  partyName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: 250,
  },
};
