import { useState } from "react";
import { useAuthContext } from "../auth/AuthContext.js";
import { Navigate } from "react-router-dom";
import OscarStatuette from "../components/OscarStatuette.js";

type AuthView = "sign-in" | "sign-up" | "confirm" | "forgot" | "reset";

export default function Auth() {
  const auth = useAuthContext();
  const [view, setView] = useState<AuthView>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (auth.isAuthenticated) {
    const pending = localStorage.getItem("pendingRedirect");
    if (pending) {
      localStorage.removeItem("pendingRedirect");
      return <Navigate to={pending} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    auth.clearError();

    try {
      switch (view) {
        case "sign-in":
          await auth.signIn(email, password);
          break;
        case "sign-up":
          await auth.signUp({ email, password, displayName });
          setMessage("Check your email for a verification code.");
          setView("confirm");
          break;
        case "confirm":
          await auth.confirmSignUp(email, code);
          setMessage("Account verified! Sign in to continue.");
          setView("sign-in");
          break;
        case "forgot":
          await auth.forgotPassword(email);
          setMessage("Check your email for a reset code.");
          setView("reset");
          break;
        case "reset":
          await auth.confirmForgotPassword(email, code, newPassword);
          setMessage("Password reset! Sign in with your new password.");
          setView("sign-in");
          break;
      }
    } catch {
      // Error is set in auth context
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      await auth.resendCode(email);
      setMessage("Verification code resent.");
    } catch {
      // Error set in context
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-4)" }}>
          <OscarStatuette size={120} />
        </div>
        <h1 style={styles.title}>Oscars 2026</h1>
        <p style={styles.subtitle}>98th Academy Awards</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {view === "sign-up" && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              required
              autoComplete="name"
            />
          )}

          {view !== "confirm" && view !== "reset" && (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
                autoComplete="email"
              />
              {view !== "forgot" && (
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  required
                  minLength={8}
                  autoComplete={view === "sign-up" ? "new-password" : "current-password"}
                />
              )}
            </>
          )}

          {(view === "confirm" || view === "reset") && (
            <input
              type="text"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={styles.input}
              required
              autoComplete="one-time-code"
            />
          )}

          {view === "reset" && (
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
            />
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading
              ? "..."
              : {
                  "sign-in": "Sign In",
                  "sign-up": "Create Account",
                  confirm: "Verify",
                  forgot: "Send Reset Code",
                  reset: "Reset Password",
                }[view]}
          </button>
        </form>

        {auth.error && <p style={styles.error}>{auth.error}</p>}
        {message && <p style={styles.message}>{message}</p>}

        <div style={styles.links}>
          {view === "sign-in" && (
            <>
              <button style={styles.link} onClick={() => setView("sign-up")}>
                Create account
              </button>
              <button style={styles.link} onClick={() => setView("forgot")}>
                Forgot password?
              </button>
            </>
          )}
          {view === "sign-up" && (
            <button style={styles.link} onClick={() => setView("sign-in")}>
              Already have an account? Sign in
            </button>
          )}
          {view === "confirm" && (
            <button style={styles.link} onClick={resendCode}>
              Resend code
            </button>
          )}
          {(view === "forgot" || view === "reset" || view === "confirm") && (
            <button style={styles.link} onClick={() => setView("sign-in")}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "var(--space-4)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    background: "var(--surface-raised)",
    border: "0.5px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-8)",
  },
  title: {
    fontSize: "var(--text-2xl)",
    fontWeight: "var(--weight-light)",
    letterSpacing: "var(--tracking-tight)",
    color: "var(--gold)",
    textAlign: "center" as const,
    marginBottom: "var(--space-1)",
  },
  subtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    marginBottom: "var(--space-8)",
    letterSpacing: "var(--tracking-wide)",
    textTransform: "uppercase" as const,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
  },
  input: {
    background: "var(--surface-sunken)",
    border: "0.5px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3) var(--space-4)",
    color: "var(--text-primary)",
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-body)",
    outline: "none",
    transition: "border-color 150ms",
  },
  button: {
    background: "var(--gold)",
    color: "var(--text-on-gold)",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-3) var(--space-4)",
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)",
    fontFamily: "var(--font-body)",
    cursor: "pointer",
    marginTop: "var(--space-2)",
    minHeight: 44,
  },
  error: {
    color: "var(--status-wrong)",
    fontSize: "var(--text-sm)",
    textAlign: "center" as const,
    marginTop: "var(--space-3)",
  },
  message: {
    color: "var(--status-open)",
    fontSize: "var(--text-sm)",
    textAlign: "center" as const,
    marginTop: "var(--space-3)",
  },
  links: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "var(--space-2)",
    marginTop: "var(--space-4)",
  },
  link: {
    background: "none",
    border: "none",
    color: "var(--gold)",
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    padding: "var(--space-1)",
    fontFamily: "var(--font-body)",
  },
};
