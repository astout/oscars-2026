import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Crown, Copy, Check, Users, Link, X, UserPlus, Lock, LockOpen, DoorOpen, PencilSimple, Sparkle, Trash, GlobeSimple, Eye, EyeSlash, ArrowsClockwise, QrCode, MegaphoneSimple } from "@phosphor-icons/react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api/client.js";
import { useAuthContext } from "../auth/AuthContext.js";
import type { Party, PartyMember, Invite } from "../types/party.js";

export default function WatchPartyDetail() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDeleteParty, setConfirmDeleteParty] = useState(false);
  const [otherParties, setOtherParties] = useState<{ partyId: string; name: string }[]>([]);
  const [copySource, setCopySource] = useState("");
  const [copyResult, setCopyResult] = useState<{ copied: number; skipped: number } | null>(null);
  const [myPublicOptOut, setMyPublicOptOut] = useState(false);

  // Invite state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [latestInviteCode, setLatestInviteCode] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [universalCode, setUniversalCode] = useState("");
  const [editingUniversal, setEditingUniversal] = useState(false);
  const [showUniversalQr, setShowUniversalQr] = useState(false);

  const fetchData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [partyData, memberData, allParties] = await Promise.all([
        api.get<Party>(`/parties/${partyId}`),
        api.get<PartyMember[]>(`/parties/${partyId}/members`),
        api.get<Party[]>("/parties"),
      ]);
      setParty(partyData);
      setPartyName(partyData.name);
      setMembers(memberData);
      setOtherParties(allParties.filter((p) => p.partyId !== partyId));

      const me = memberData.find((m) => m.userId === userId);
      if (me) setMyPublicOptOut(!!me.publicOptOut);

      // Load invites if host
      if (partyData.hostUserId === userId) {
        const inviteData = await api.get<Invite[]>(`/parties/${partyId}/invites`);
        setInvites(inviteData);
        const universal = inviteData.find((i) => i.isUniversal);
        if (universal) setUniversalCode(universal.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load party");
    } finally {
      setLoading(false);
    }
  }, [partyId, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isHost = party?.hostUserId === userId;

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateInvite = async () => {
    if (!partyId) return;
    setActionLoading("invite");
    try {
      const result = await api.post<{ code: string; expiresAt: string }>(`/parties/${partyId}/invites`);
      setLatestInviteCode(result.code);
      const inviteData = await api.get<Invite[]>(`/parties/${partyId}/invites`);
      setInvites(inviteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setActionLoading(null);
    }
  };

  const revokeInvite = async (code: string) => {
    if (!partyId) return;
    setActionLoading(`revoke-${code}`);
    try {
      await api.delete(`/parties/${partyId}/invites/${code}`);
      setInvites((prev) => prev.filter((i) => i.code !== code));
      if (latestInviteCode === code) setLatestInviteCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setActionLoading(null);
    }
  };

  const inviteLink = (code: string) =>
    `${window.location.origin}/join?party=${partyId}&code=${code}`;

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
  const ephemeralInvites = invites.filter((i) => !i.isUniversal);

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

        {/* Party Access Card (host only) */}
        {isHost && (
          <div className="card" style={{ marginBottom: "var(--space-6)", border: "0.5px solid var(--border-gold)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <MegaphoneSimple size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Party Access
              </p>
            </div>

            {/* Toggle isOpen */}
            <button
              className={`btn ${party.isOpen ? "btn-primary" : "btn-secondary"} btn-full`}
              onClick={async () => {
                setActionLoading("open");
                try {
                  const updated = await api.patch<Party>(`/parties/${partyId}/settings`, { isOpen: !party.isOpen });
                  setParty(updated);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update");
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === "open"}
              style={{ marginBottom: "var(--space-2)" }}
            >
              {party.isOpen ? (
                <><DoorOpen size={18} weight="bold" /> Open — anyone can join</>
              ) : (
                <><Lock size={18} weight="bold" /> Closed — invite or approval required</>
              )}
            </button>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-3)" }}>
              {party.isOpen
                ? "Anyone can join this party without an invite code."
                : "People need an invite code or host approval to join."}
            </p>

            {/* Toggle isListed */}
            <button
              className={`btn ${party.isListed ? "btn-primary" : "btn-secondary"} btn-full`}
              onClick={async () => {
                setActionLoading("listing");
                try {
                  const updated = await api.patch<Party>(`/parties/${partyId}/settings`, { isListed: !party.isListed });
                  setParty(updated);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update");
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === "listing"}
              style={{ marginBottom: "var(--space-2)" }}
            >
              {party.isListed ? (
                <><Eye size={18} weight="bold" /> Listed — visible in party browser</>
              ) : (
                <><EyeSlash size={18} weight="bold" /> Unlisted — invite link only</>
              )}
            </button>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-3)" }}>
              {party.isListed
                ? "Anyone can discover this party in the browse list."
                : "Only people with an invite link can find this party."}
            </p>

            {/* Universal code (when listed) */}
            {party.isListed && (
              <>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
                  Universal code — a reusable code for listed party joiners
                </p>
                {editingUniversal ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const cleaned = universalCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                      if (cleaned.length < 4 || cleaned.length > 20) {
                        setError("Code must be 4-20 alphanumeric characters");
                        return;
                      }
                      setActionLoading("universal");
                      try {
                        await api.put(`/parties/${partyId}/invites/universal`, { code: cleaned });
                        setUniversalCode(cleaned);
                        setEditingUniversal(false);
                        const inviteData = await api.get<Invite[]>(`/parties/${partyId}/invites`);
                        setInvites(inviteData);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to set code");
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    style={{ display: "flex", gap: "var(--space-2)" }}
                  >
                    <input
                      className="input"
                      value={universalCode}
                      onChange={(e) => setUniversalCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      maxLength={20}
                      placeholder="party-code"
                      autoFocus
                      style={{ flex: 1, fontFamily: "var(--font-mono)" }}
                    />
                    <button className="btn btn-primary btn-sm" type="submit" disabled={actionLoading === "universal"}>
                      <Check size={16} weight="bold" />
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingUniversal(false)}>
                      <X size={16} />
                    </button>
                  </form>
                ) : universalCode ? (
                  <>
                    <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                      <div
                        className="input"
                        style={{ flex: 1, fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", color: "var(--text-muted)" }}
                      >
                        {universalCode}
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingUniversal(true)}>
                        <PencilSimple size={16} weight="bold" />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          setActionLoading("rm-universal");
                          try {
                            await api.delete(`/parties/${partyId}/invites/universal`);
                            setUniversalCode("");
                            setShowUniversalQr(false);
                            const inviteData = await api.get<Invite[]>(`/parties/${partyId}/invites`);
                            setInvites(inviteData);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Failed to remove code");
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === "rm-universal"}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                      <button
                        className="btn btn-secondary btn-full"
                        onClick={() => copyToClipboard(inviteLink(universalCode), "universal-link")}
                        style={{ flex: 1 }}
                      >
                        {copied === "universal-link" ? (
                          <><Check size={16} weight="bold" style={{ color: "var(--status-open)" }} /><span style={{ color: "var(--status-open)" }}>Copied!</span></>
                        ) : (
                          <><Copy size={16} weight="bold" /> Copy Link</>
                        )}
                      </button>
                      <button
                        className="btn btn-secondary btn-full"
                        onClick={() => setShowUniversalQr(!showUniversalQr)}
                        style={{ flex: 1 }}
                      >
                        <QrCode size={16} weight="bold" />
                        {showUniversalQr ? "Hide QR" : "QR Code"}
                      </button>
                    </div>
                    {showUniversalQr && (
                      <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                        <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)", lineHeight: 0 }}>
                          <QRCodeCanvas
                            value={inviteLink(universalCode)}
                            size={200}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", textAlign: "center" }}>
                          Scan to join with universal code
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={() => setEditingUniversal(true)}
                  >
                    <Lock size={16} weight="bold" />
                    Set Universal Code
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Invite Friends Card (host only) */}
        {isHost && (
          <div className="card" style={{ marginBottom: "var(--space-6)", border: "0.5px solid var(--border-gold)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <Link size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Invite Friends
              </p>
            </div>

            {/* Generate invite button */}
            <button
              className="btn btn-primary btn-full"
              onClick={generateInvite}
              disabled={actionLoading === "invite"}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <UserPlus size={18} weight="bold" />
              {actionLoading === "invite" ? "Generating..." : "Get Invite Link"}
            </button>

            {/* Latest generated invite */}
            {latestInviteCode && (
              <div className="animate-fade-in-up" style={{ marginBottom: "var(--space-3)" }}>
                <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <button
                    className="btn btn-secondary btn-full"
                    onClick={() => copyToClipboard(inviteLink(latestInviteCode), "link")}
                  >
                    {copied === "link" ? (
                      <><Check size={16} weight="bold" style={{ color: "var(--status-open)" }} /><span style={{ color: "var(--status-open)" }}>Copied!</span></>
                    ) : (
                      <><Copy size={16} weight="bold" /> Copy Invite Link</>
                    )}
                  </button>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <div
                    className="input"
                    style={{ flex: 1, fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", color: "var(--text-muted)" }}
                  >
                    {latestInviteCode}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(latestInviteCode, "code")}
                  >
                    {copied === "code" ? <Check size={16} weight="bold" style={{ color: "var(--status-open)" }} /> : <Copy size={16} weight="bold" />}
                  </button>
                </div>
              </div>
            )}

            {/* QR Code */}
            {latestInviteCode && (
              <>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowQr(!showQr)}
                  style={{ marginBottom: showQr ? "var(--space-3)" : "var(--space-3)" }}
                >
                  <QrCode size={18} weight="bold" />
                  {showQr ? "Hide QR Code" : "Show QR Code"}
                </button>
                {showQr && (
                  <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                    <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)", lineHeight: 0 }}>
                      <QRCodeCanvas
                        value={inviteLink(latestInviteCode)}
                        size={200}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", textAlign: "center" }}>
                      Scan to join with invite code
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Active invites list */}
            {ephemeralInvites.length > 0 && (
              <div style={{ marginTop: "var(--space-2)" }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginBottom: "var(--space-2)" }}>
                  Active invites ({ephemeralInvites.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  {ephemeralInvites.map((inv) => (
                    <div key={inv.code} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2)", background: "var(--surface-interactive)", borderRadius: "var(--radius-sm)" }}>
                      <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                        {inv.code}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                        {inv.expiresAt ? `exp ${new Date(inv.expiresAt).toLocaleDateString()}` : ""}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => revokeInvite(inv.code)}
                        disabled={actionLoading === `revoke-${inv.code}`}
                        aria-label="Revoke invite"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Public Leaderboard Settings */}
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <GlobeSimple size={16} weight="bold" style={{ color: "var(--gold)" }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
              Public Leaderboard
            </p>
          </div>

          {/* Host: toggle publicParticipation */}
          {isHost && (
            <button
              className={`btn ${party.publicParticipation !== false ? "btn-primary" : "btn-secondary"} btn-full`}
              onClick={async () => {
                setActionLoading("public");
                try {
                  const newValue = party.publicParticipation === false;
                  await api.patch(`/parties/${partyId}/settings`, { publicParticipation: newValue });
                  setParty({ ...party, publicParticipation: newValue });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update");
                } finally {
                  setActionLoading(null);
                }
              }}
              disabled={actionLoading === "public"}
              style={{ marginBottom: "var(--space-3)" }}
            >
              {party.publicParticipation !== false ? (
                <><Eye size={18} weight="bold" /> Party visible on public leaderboard</>
              ) : (
                <><EyeSlash size={18} weight="bold" /> Party hidden from public leaderboard</>
              )}
            </button>
          )}

          {/* Member: toggle opt-out */}
          <button
            className={`btn ${myPublicOptOut ? "btn-secondary" : "btn-primary"} btn-full`}
            onClick={async () => {
              if (party.publicParticipation === false) return;
              setActionLoading("optout");
              try {
                const newValue = !myPublicOptOut;
                await api.patch(`/parties/${partyId}/members/me/public`, { optOut: newValue });
                setMyPublicOptOut(newValue);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update");
              } finally {
                setActionLoading(null);
              }
            }}
            disabled={actionLoading === "optout" || party.publicParticipation === false}
            style={party.publicParticipation === false ? { opacity: 0.5 } : undefined}
          >
            {myPublicOptOut ? (
              <><EyeSlash size={18} weight="bold" /> My name hidden on public leaderboard</>
            ) : (
              <><Eye size={18} weight="bold" /> My name visible on public leaderboard</>
            )}
          </button>
          {party.publicParticipation === false && !isHost && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)", textAlign: "center" }}>
              Host has disabled public participation for this party
            </p>
          )}
        </div>

        {/* Copy Picks */}
        {otherParties.length > 0 && (
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
              <ArrowsClockwise size={16} weight="bold" style={{ color: "var(--gold)" }} />
              <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
                Copy Picks
              </p>
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
              Copy your picks from another party into this one. Locked categories are skipped.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <select
                className="input"
                value={copySource}
                onChange={(e) => { setCopySource(e.target.value); setCopyResult(null); }}
                style={{ flex: 1 }}
              >
                <option value="">Select a party...</option>
                {otherParties.map((p) => (
                  <option key={p.partyId} value={p.partyId}>{p.name}</option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                disabled={!copySource || actionLoading === "copy"}
                onClick={async () => {
                  setActionLoading("copy");
                  setCopyResult(null);
                  try {
                    const result = await api.post<{ copied: number; skipped: number }>(
                      `/parties/${partyId}/picks/copy`,
                      { sourcePartyId: copySource }
                    );
                    setCopyResult(result);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to copy");
                  } finally {
                    setActionLoading(null);
                  }
                }}
              >
                <ArrowsClockwise size={16} weight="bold" />
                Copy
              </button>
            </div>
            {copyResult && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--status-open)", marginTop: "var(--space-2)" }}>
                Copied {copyResult.copied} picks{copyResult.skipped > 0 ? `, skipped ${copyResult.skipped} locked` : ""}
              </p>
            )}
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
