import { useState } from "react";
import { useAuthContext } from "../auth/AuthContext.js";
import { Navigate } from "react-router-dom";

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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <img src="/academy-awards-logo.png" alt="98th Academy Awards" style={styles.logo} />
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {view === "sign-up" && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
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
                  className="input"
                  required
                  autoComplete="email"
                />
                {view !== "forgot" && (
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
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
                className="input"
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
                className="input"
                required
                minLength={8}
                autoComplete="new-password"
              />
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
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

      <footer style={styles.footer}>
        <span style={styles.footerText}>2026</span>
        <span style={styles.footerDivider} />
        <span style={styles.footerText}>alexhacks.life</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
  },
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-4)",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "var(--surface-raised)",
    border: "0.5px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-8) var(--space-6)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "var(--space-6)",
  },
  logo: {
    width: 180,
    height: 180,
    objectFit: "contain",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
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
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3)",
    padding: "var(--space-6) var(--space-4)",
    borderTop: "0.5px solid var(--border-subtle)",
  },
  footerText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
  },
  footerDivider: {
    width: 1,
    height: 14,
    background: "var(--border)",
  },
};
