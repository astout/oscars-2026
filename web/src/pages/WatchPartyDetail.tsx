import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crown, Copy, Check, Users, Link, X, UserPlus, Lock, LockOpen, DoorOpen, PencilSimple, Sparkle, Trash } from "@phosphor-icons/react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import type { Party, PartyMember } from "../types/party.js";

export default function WatchPartyDetail() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDeleteParty, setConfirmDeleteParty] = useState(false);

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [partyData, memberData] = await Promise.all([
        api.get<Party>(`/parties/${partyId}`),
        api.get<PartyMember[]>(`/parties/${partyId}/members`),
      ]);
      setParty(partyData);
      setPartyName(partyData.name);
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load party");
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isHost = party?.hostUserId === userId;

  const copyInviteLink = async () => {
    if (!party) return;
    const link = `${window.location.origin}/join?code=${party.inviteCode}&party=${party.partyId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMemberAction = async (memberId: string, action: "approve" | "remove") => {
    if (!partyId) return;
    setActionLoading(memberId);
    try {
      await api.patch(`/parties/${partyId}/members/${memberId}`, { action });
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
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", textAlign: "center" }}>{error}</p>
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

            {/* Rename */}
            {editingName ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!partyName.trim() || partyName.trim() === party.name) {
                    setEditingName(false);
                    return;
                  }
                  setActionLoading("rename");
                  try {
                    await api.patch(`/parties/${partyId}`, { name: partyName.trim() });
                    setParty({ ...party, name: partyName.trim() });
                    setEditingName(false);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to rename");
                  } finally {
                    setActionLoading(null);
                  }
                }}
                style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}
              >
                <input
                  className="input"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={actionLoading === "rename"}>
                  <Check size={16} weight="bold" />
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setEditingName(false); setPartyName(party.name); }}>
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setEditingName(true)}
                style={{ marginBottom: "var(--space-3)" }}
              >
                <PencilSimple size={18} weight="bold" />
                Rename Party
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <button
                className={`btn ${party.allLocked ? "btn-primary" : "btn-secondary"} btn-full`}
                onClick={async () => {
                  setActionLoading("lock");
                  try {
                    const endpoint = party.allLocked ? "unlock" : "lock";
                    await api.post(`/parties/${partyId}/${endpoint}`);
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
                onClick={() => navigate(`/party/${partyId}/bonus/manage`)}
              >
                <Sparkle size={18} weight="bold" style={{ color: "var(--gold)" }} />
                Manage Wagers
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => navigate(`/party/${partyId}/ceremony`)}
              >
                <Crown size={18} weight="bold" style={{ color: "var(--gold)" }} />
                Ceremony Mode
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--status-wrong)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>{error}</p>
        )}

        {/* Pending Members (host only) */}
        {isHost && pendingMembers.length > 0 && (
          <div style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <UserPlus size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Pending Requests
              </p>
              <span className="badge badge-pending" style={{ marginLeft: "auto" }}>{pendingMembers.length}</span>
            </div>
            <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {pendingMembers.map((member) => (
                <div key={member.userId} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>{member.displayName}</p>
                    <span className="badge badge-pending">Pending</span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleMemberAction(member.userId, "approve")} disabled={actionLoading === member.userId} aria-label={`Approve ${member.displayName}`}>
                      <Check size={16} weight="bold" />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleMemberAction(member.userId, "remove")} disabled={actionLoading === member.userId} aria-label={`Deny ${member.displayName}`}>
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
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>Members</p>
            <span className="badge badge-pending" style={{ marginLeft: "auto" }}>{activeMembers.length}</span>
          </div>
          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {activeMembers.map((member) => (
              <div key={member.userId} className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "var(--radius-pill)",
                    background: member.role === "host" ? "var(--gold-glow)" : "var(--surface-interactive)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    border: member.role === "host" ? "1px solid var(--border-gold)" : "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: member.role === "host" ? "var(--gold)" : "var(--text-secondary)" }}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p style={{ flex: 1, fontSize: "var(--text-base)", color: "var(--text-primary)", fontWeight: "var(--weight-medium)" }}>
                  {member.displayName}
                  {member.userId === userId && (
                    <span style={{ color: "var(--text-muted)", fontWeight: "var(--weight-normal)" }}> (you)</span>
                  )}
                </p>
                {member.role === "host" && (
                  <Crown size={18} weight="fill" style={{ color: "var(--gold)", flexShrink: 0 }} />
                )}
                {isHost && member.role !== "host" && confirmRemove !== member.userId && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(member.userId)} aria-label={`Remove ${member.displayName}`}>
                    <X size={16} />
                  </button>
                )}
                {isHost && confirmRemove === member.userId && (
                  <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                    <button className="btn btn-danger btn-sm" onClick={() => { handleMemberAction(member.userId, "remove"); setConfirmRemove(null); }} disabled={actionLoading === member.userId}>
                      Remove
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leave Party (non-host) */}
        {!isHost && (
          <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "0.5px solid var(--border-subtle)" }}>
            {!confirmLeave ? (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmLeave(true)}
                style={{ color: "var(--status-wrong)", gap: "var(--space-2)" }}
              >
                <DoorOpen size={18} weight="bold" />
                Leave Party
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textAlign: "center" }}>
                  Your picks will be saved if you rejoin later.
                </p>
                <div className="confirm-actions" style={{ width: "100%" }}>
                  <button className="btn btn-ghost" onClick={() => setConfirmLeave(false)} style={{ flex: 1 }}>Cancel</button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      setActionLoading("leave");
                      try {
                        await api.post(`/parties/${partyId}/leave`);
                        navigate("/");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to leave");
                        setConfirmLeave(false);
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    disabled={actionLoading === "leave"}
                    style={{ flex: 1 }}
                  >
                    Leave
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Party (host) */}
        {isHost && (
          <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "0.5px solid var(--border-subtle)" }}>
            {!confirmDeleteParty ? (
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmDeleteParty(true)}
                style={{ color: "var(--status-wrong)", gap: "var(--space-2)" }}
              >
                <Trash size={18} weight="bold" />
                Delete Party
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--status-wrong)", textAlign: "center", fontWeight: "var(--weight-medium)" }}>
                  This will permanently delete the party and all data.
                </p>
                <div className="confirm-actions" style={{ width: "100%" }}>
                  <button className="btn btn-ghost" onClick={() => setConfirmDeleteParty(false)} style={{ flex: 1 }}>Cancel</button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      setActionLoading("delete");
                      try {
                        await api.delete(`/parties/${partyId}`);
                        navigate("/");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to delete party");
                        setConfirmDeleteParty(false);
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    disabled={actionLoading === "delete"}
                    style={{ flex: 1 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
