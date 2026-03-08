import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, UserPlus, Crown, UserCircle } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import type { Party } from "../types/party.js";
import OscarStatuette from "../components/OscarStatuette.js";

export default function WatchParties() {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Party[]>("/parties")
      .then(setParties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Watch Parties</h1>
        </div>
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Watch Parties</h1>
        </div>
        <div className="page-content">
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (parties.length === 0) {
    return (
      <div className="page animate-fade-in-up">
        <div className="page-header">
          <h1 className="page-title">Watch Parties</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" />
            <p className="empty-state-title">No Watch Parties yet</p>
            <p className="empty-state-text">
              Create a party for your friends or join one with an invite code.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%", maxWidth: 300 }}>
              <button className="btn btn-primary btn-full" onClick={() => navigate("/create")}>
                <Plus size={18} weight="bold" />
                Create Watch Party
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => navigate("/join")}>
                <UserPlus size={18} weight="bold" />
                Join Watch Party
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in-up">
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "var(--space-2) var(--space-3) 0" }}>
        <button
          className="tap-target"
          onClick={() => navigate("/profile")}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "var(--space-1)" }}
          aria-label="Profile"
        >
          <UserCircle size={24} weight="bold" />
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <OscarStatuette size={80} />
      </div>
      <div className="page-header">
        <h1 className="page-title">Watch Parties</h1>
        <p className="page-subtitle">{parties.length} {parties.length === 1 ? "party" : "parties"}</p>
      </div>
      <div className="page-content">
        <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {parties.map((party) => (
            <div
              key={party.partyId}
              className="card card-interactive tap-target"
              onClick={() => navigate(`/party/${party.partyId}`)}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  background: "var(--gold-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={22} weight="bold" style={{ color: "var(--gold)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
                  {party.name}
                </p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                  {party.role === "host" ? "Host" : "Member"}
                </p>
              </div>
              {party.role === "host" && (
                <Crown size={18} weight="fill" style={{ color: "var(--gold)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate("/create")}>
            <Plus size={18} weight="bold" />
            Create
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate("/join")}>
            <UserPlus size={18} weight="bold" />
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
