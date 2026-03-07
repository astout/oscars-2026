import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crown, Copy, Check, Users, Link, X, UserPlus, SignOut, Lock, LockOpen } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import type { Academy, AcademyMember } from "../types/academy.js";

export default function WatchPartyDetail() {
  const { academyId } = useParams<{ academyId: string }>();
  const navigate = useNavigate();
  const { userId, signOut } = useAuthContext();

  const [party, setParty] = useState<Academy | null>(null);
  const [members, setMembers] = useState<AcademyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!academyId) return;
    try {
      const [partyData, memberData] = await Promise.all([
        api.get<Academy>(`/academies/${academyId}`),
        api.get<AcademyMember[]>(`/academies/${academyId}/members`),
      ]);
      setParty(partyData);
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load party");
    } finally {
      setLoading(false);
    }
  }, [academyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isHost = party?.hostUserId === userId;

  const copyInviteLink = async () => {
    if (!party) return;
    const link = `${window.location.origin}/join?code=${party.inviteCode}&party=${party.academyId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMemberAction = async (memberId: string, action: "approve" | "remove") => {
    if (!academyId) return;
    setActionLoading(memberId);
    try {
      await api.patch(`/academies/${academyId}/members/${memberId}`, { action });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} member`);
    } finally {
      setActionLoading(null);
    }
  };

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  if (loading) {
    return (
      <div className="page">
        <div className="page-content">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !party) {
    return (
      <div className="page">
        <div className="page-content">
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!party) return null;

  return (
    <div className="page animate-fade-in-up">
      <div className="page-content">
        {/* Invite Link Card */}
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Link size={16} weight="bold" style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
              Invite Link
            </p>
          </div>
          <button className="btn btn-secondary btn-full" onClick={copyInviteLink}>
            {copied ? (
              <>
                <Check size={18} weight="bold" style={{ color: "var(--status-open)" }} />
                <span style={{ color: "var(--status-open)" }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} weight="bold" />
                Copy Invite Link
              </>
            )}
          </button>
        </div>

        {/* Host Controls */}
        {isHost && (
          <div className="card" style={{ marginBottom: "var(--space-6)", border: "0.5px solid var(--border-gold)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <Lock size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Host Controls
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <button
                className={`btn ${party.allLocked ? "btn-primary" : "btn-secondary"} btn-full`}
                onClick={async () => {
                  setActionLoading("lock");
                  try {
                    const endpoint = party.allLocked ? "unlock" : "lock";
                    await api.post(`/academies/${academyId}/${endpoint}`);
                    setParty({ ...party, allLocked: !party.allLocked });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={actionLoading === "lock"}
              >
                {party.allLocked ? (
                  <><LockOpen size={18} weight="bold" /> Unlock All Picks</>
                ) : (
                  <><Lock size={18} weight="bold" /> Lock All Picks</>
                )}
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => navigate(`/party/${academyId}/ceremony`)}
              >
                <Crown size={18} weight="bold" style={{ color: "var(--gold)" }} />
                Ceremony Mode
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
            {error}
          </p>
        )}

        {/* Pending Members (host only) */}
        {isHost && pendingMembers.length > 0 && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <UserPlus size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Pending Requests
              </p>
              <span className="badge badge-pending" style={{ marginLeft: "auto" }}>
                {pendingMembers.length}
              </span>
            </div>
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {pendingMembers.map((member) => (
                <div
                  key={member.userId}
                  className="card"
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>
                      {member.displayName}
                    </p>
                    <span className="badge badge-pending">Pending</span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleMemberAction(member.userId, "approve")}
                      disabled={actionLoading === member.userId}
                      aria-label={`Approve ${member.displayName}`}
                    >
                      <Check size={16} weight="bold" />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleMemberAction(member.userId, "remove")}
                      disabled={actionLoading === member.userId}
                      aria-label={`Deny ${member.displayName}`}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Users size={16} weight="bold" style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
              Members
            </p>
            <span className="badge badge-pending" style={{ marginLeft: "auto" }}>
              {activeMembers.length}
            </span>
          </div>
          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {activeMembers.map((member) => (
              <div
                key={member.userId}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-pill)",
                    background: member.role === "host" ? "var(--gold-glow)" : "var(--surface-interactive)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: member.role === "host" ? "1px solid var(--border-gold)" : "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--weight-semibold)",
                      color: member.role === "host" ? "var(--gold)" : "var(--text-secondary)",
                    }}
                  >
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p
                  style={{
                    flex: 1,
                    fontSize: "var(--text-base)",
                    color: "var(--text-primary)",
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  {member.displayName}
                </p>
                {member.role === "host" && (
                  <Crown size={18} weight="fill" style={{ color: "var(--gold)", flexShrink: 0 }} />
                )}
                {isHost && member.role !== "host" && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleMemberAction(member.userId, "remove")}
                    disabled={actionLoading === member.userId}
                    aria-label={`Remove ${member.displayName}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "0.5px solid var(--border-subtle)" }}>
          <button
            className="btn btn-ghost btn-full"
            onClick={signOut}
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
