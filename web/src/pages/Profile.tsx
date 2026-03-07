import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignOut, Check } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import OscarStatuette from "../components/OscarStatuette.js";

interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { email, signOut, changePassword, error: authError, clearError } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<UserProfile>("/users/me")
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName === profile?.displayName) return;
    setNameSaving(true);
    setError("");
    try {
      await api.patch("/users/me", { displayName: displayName.trim() });
      setProfile((p) => p ? { ...p, displayName: displayName.trim() } : p);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage("");
    setError("");
    clearError();
    try {
      await changePassword(oldPassword, newPassword);
      setPwMessage("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
    } catch {
      // error set in auth context
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingTop: "var(--space-8)" }}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)" }} />
            ))}
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
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">{email}</p>
      </div>
      <div className="page-content">
        {error && (
          <p style={styles.error}>{error}</p>
        )}
        {authError && (
          <p style={styles.error}>{authError}</p>
        )}

        {/* Display Name */}
        <form onSubmit={handleNameSave} style={styles.section}>
          <label style={styles.label}>Display Name</label>
          <div style={styles.row}>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={nameSaving || displayName.trim() === profile?.displayName}
            >
              {nameSaved ? <><Check size={16} weight="bold" /> Saved</> : "Save"}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handlePasswordChange} style={styles.section}>
          <label style={styles.label}>Change Password</label>
          <input
            className="input"
            type="password"
            placeholder="Current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            className="btn btn-secondary btn-full"
            type="submit"
            disabled={pwSaving || !oldPassword || !newPassword}
          >
            {pwSaving ? "..." : "Change Password"}
          </button>
          {pwMessage && <p style={styles.success}>{pwMessage}</p>}
        </form>

        {/* Sign Out */}
        <div style={styles.signOutSection}>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => { signOut(); navigate("/auth"); }}
            style={{ color: "var(--status-wrong)", gap: "var(--space-2)" }}
          >
            <SignOut size={18} weight="bold" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    marginBottom: "var(--space-6)",
  },
  label: {
    fontSize: "var(--text-sm)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
  },
  row: {
    display: "flex",
    gap: "var(--space-2)",
    alignItems: "center",
  },
  error: {
    color: "var(--status-wrong)",
    fontSize: "var(--text-sm)",
    marginBottom: "var(--space-4)",
  },
  success: {
    color: "var(--status-correct)",
    fontSize: "var(--text-sm)",
  },
  signOutSection: {
    marginTop: "var(--space-4)",
    paddingTop: "var(--space-6)",
    borderTop: "0.5px solid var(--border-subtle)",
  },
};
