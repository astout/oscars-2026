export default function Home() {
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
    </div>
  );
}
