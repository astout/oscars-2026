import { useAuthContext } from "../auth/AuthContext.js";

export default function Home() {
  const { email, signOut } = useAuthContext();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        gap: "var(--space-4)",
        padding: "var(--space-6)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--text-3xl)",
          fontWeight: "var(--weight-light)",
          letterSpacing: "var(--tracking-tight)",
          color: "var(--gold)",
        }}
      >
        Oscars 2026
      </h1>
      <p
        style={{
          fontSize: "var(--text-md)",
          color: "var(--text-secondary)",
        }}
      >
        98th Academy Awards — March 15, 2026
      </p>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          marginTop: "var(--space-4)",
        }}
      >
        Signed in as {email}
      </p>
      <button
        onClick={signOut}
        style={{
          background: "none",
          border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-secondary)",
          padding: "var(--space-2) var(--space-4)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
