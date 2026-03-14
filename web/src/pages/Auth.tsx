import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ChartBar } from "@phosphor-icons/react";
import { useAuthContext } from "../auth/AuthContext.js";
import PasswordInput from "../components/PasswordInput.js";

type AuthView = "landing" | "sign-in" | "sign-up" | "confirm" | "forgot" | "reset";

export default function Auth() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("landing");
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

  if (view === "landing") {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.logoWrap}>
              <img src="/academy-awards-logo.png" alt="98th Academy Awards" style={styles.logo} />
            </div>

            <p style={styles.landingSubtitle}>Make your picks. Watch the ceremony. See who wins.</p>

            <div style={styles.landingActions}>
              <button
                className="btn btn-primary btn-full"
                onClick={() => setView("sign-in")}
              >
                Sign In
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setView("sign-up")}
              >
                Create Account
              </button>
            </div>

            <div style={styles.landingDivider}>
              <span style={styles.landingDividerLine} />
              <span style={styles.landingDividerText}>or</span>
              <span style={styles.landingDividerLine} />
            </div>

            <button
              className="card card-interactive tap-target"
              onClick={() => navigate("/leaderboard")}
              style={styles.leaderboardLink}
            >
              <div style={styles.leaderboardIcon}>
                <ChartBar size={20} weight="bold" style={{ color: "var(--gold)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={styles.leaderboardTitle}>Public Leaderboard</p>
                <p style={styles.leaderboardSub}>See how everyone's doing</p>
              </div>
            </button>
          </div>
        </div>

        <footer style={styles.footer}>
          <span style={styles.footerText}>&copy; 2026</span>
          <span style={styles.footerDivider} />
          <img src="/alexhacks-logo.png" alt="alexhacks" style={styles.footerLogo} />
        </footer>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    auth.clearError();

    try {
      switch (view) {
        case "sign-in": {
          await auth.signIn(email, password);
          // Hard navigate to bypass React state/routing race condition
          const pending = localStorage.getItem("pendingRedirect");
          if (pending) {
            localStorage.removeItem("pendingRedirect");
            window.location.replace(pending);
          } else {
            window.location.replace("/");
          }
          return;
        }
        case "sign-up":
          await auth.signUp({ email, password, displayName });
          // Auto sign-in after signup (no email confirmation required)
          await auth.signIn(email, password);
          const pendingAfterSignup = localStorage.getItem("pendingRedirect");
          if (pendingAfterSignup) {
            localStorage.removeItem("pendingRedirect");
            window.location.replace(pendingAfterSignup);
          } else {
            window.location.replace("/");
          }
          return;
        case "confirm":
          await auth.confirmSignUp(email, code);
          // Auto sign-in after verification to avoid extra step
          try {
            await auth.signIn(email, password);
            const pending = localStorage.getItem("pendingRedirect");
            if (pending) {
              localStorage.removeItem("pendingRedirect");
              window.location.replace(pending);
            } else {
              window.location.replace("/");
            }
            return;
          } catch {
            // If auto sign-in fails, fall back to manual
            setMessage("Account verified! Sign in to continue.");
            setView("sign-in");
          }
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

          {view === "sign-in" && (
            <form key="sign-in" id="sign-in-form" action="/sign-in" onSubmit={handleSubmit} style={styles.form} autoComplete="on">
              <input
                type="email"
                name="username"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="username"
              />
              <PasswordInput
                name="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                {loading ? "..." : "Sign In"}
              </button>
            </form>
          )}

          {view === "sign-up" && (
            <form key="sign-up" id="sign-up-form" action="/sign-up" onSubmit={handleSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                required
                autoComplete="name"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
              />
              <PasswordInput
                name="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                {loading ? "..." : "Create Account"}
              </button>
            </form>
          )}

          {view === "confirm" && (
            <form key="confirm" onSubmit={handleSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input"
                required
                autoComplete="one-time-code"
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                {loading ? "..." : "Verify"}
              </button>
            </form>
          )}

          {view === "forgot" && (
            <form key="forgot" onSubmit={handleSubmit} style={styles.form}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="username"
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                {loading ? "..." : "Send Reset Code"}
              </button>
            </form>
          )}

          {view === "reset" && (
            <form key="reset" onSubmit={handleSubmit} style={styles.form}>
              <input
                type="text"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input"
                required
                autoComplete="one-time-code"
              />
              <PasswordInput
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                {loading ? "..." : "Reset Password"}
              </button>
            </form>
          )}

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
                <button style={styles.link} onClick={() => setView("landing")}>
                  Back
                </button>
              </>
            )}
            {view === "sign-up" && (
              <>
                <button style={styles.link} onClick={() => setView("sign-in")}>
                  Already have an account? Sign in
                </button>
                <button style={styles.link} onClick={() => setView("landing")}>
                  Back
                </button>
              </>
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
        <span style={styles.footerText}>&copy; 2026</span>
        <span style={styles.footerDivider} />
        <img src="/alexhacks-logo.png" alt="alexhacks" style={styles.footerLogo} />
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
  landingSubtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    textAlign: "center" as const,
    marginBottom: "var(--space-6)",
    lineHeight: 1.5,
  },
  landingActions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
  },
  landingDivider: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    margin: "var(--space-5) 0",
  },
  landingDividerLine: {
    flex: 1,
    height: "0.5px",
    background: "var(--border)",
  },
  landingDividerText: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "var(--tracking-wide)",
  },
  leaderboardLink: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    width: "100%",
    textAlign: "left" as const,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
  },
  leaderboardIcon: {
    width: 40,
    height: 40,
    borderRadius: "var(--radius-md)",
    background: "var(--gold-glow)",
    border: "1px solid var(--border-gold)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  leaderboardTitle: {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)" as const,
    color: "var(--text-primary)",
  },
  leaderboardSub: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    marginTop: 1,
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
  footerLogo: {
    height: 14,
    width: "auto",
    objectFit: "contain" as const,
    opacity: 0.5,
  },
};
