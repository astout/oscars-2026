import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Lightning, Crown, X } from "@phosphor-icons/react";
import type { AppNotification } from "../hooks/useNotifications.js";

const TOAST_DURATION = 8000;

interface ToastItem extends AppNotification {
  id: string;
  exiting?: boolean;
}

export function useToastQueue() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (n: AppNotification) => {
    setToasts((prev) => [...prev, { ...n, id: n.notificationId }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  return { toasts, addToast, dismissToast };
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  partyId?: string;
}

export default function ToastContainer({ toasts, onDismiss, partyId }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          partyId={partyId}
        />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss, partyId }: { toast: ToastItem; onDismiss: (id: string) => void; partyId?: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icon = toast.type === "category-awarded"
    ? <Trophy size={18} weight="fill" style={{ color: "var(--gold-bright)" }} />
    : toast.type === "category-up-next"
      ? <Lightning size={18} weight="fill" style={{ color: "var(--gold)" }} />
      : <Crown size={18} weight="fill" style={{ color: "var(--gold)" }} />;

  const handleClick = () => {
    if (toast.linkTo && partyId) {
      navigate(`/party/${partyId}${toast.linkTo}`);
      onDismiss(toast.id);
    }
  };

  return (
    <div
      style={{
        ...styles.toast,
        ...(toast.exiting ? styles.toastExit : {}),
        cursor: toast.linkTo ? "pointer" : "default",
      }}
      onClick={toast.linkTo ? handleClick : undefined}
    >
      <div style={styles.toastIcon}>{icon}</div>
      <p style={styles.toastMessage}>{toast.message}</p>
      <button
        style={styles.dismissBtn}
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: "env(safe-area-inset-top, 0px)",
    left: 0,
    right: 0,
    zIndex: 300,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-3) var(--space-4)",
    pointerEvents: "none",
  },
  toast: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    background: "var(--surface-raised)",
    border: "0.5px solid var(--border-gold)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    maxWidth: 480,
    width: "100%",
    animation: "slideDown 300ms var(--ease-out)",
  },
  toastExit: {
    opacity: 0,
    transform: "translateY(-10px)",
    transition: "opacity 300ms, transform 300ms",
  },
  toastIcon: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  toastMessage: {
    flex: 1,
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    color: "var(--text-primary)",
    lineHeight: 1.4,
  },
  dismissBtn: {
    flexShrink: 0,
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "var(--space-1)",
    display: "flex",
    alignItems: "center",
  },
};
