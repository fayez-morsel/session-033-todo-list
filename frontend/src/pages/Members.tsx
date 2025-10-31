import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Bell } from "lucide-react";
import { fetchMembersApi, createInviteApi, fetchIncomingInvitesApi, declineInviteApi, type IncomingInviteApi } from "../services/endpoints";
import type { Member } from "../types";
import { avatarPaletteFor, initialsFor } from "../utils/avatar";
import { useAuthStore } from "../store/auth";
import { useUiStore } from "../store/ui";
import { useInviteHistoryStore, type StoredSentInvite } from "../store/inviteHistory";

function buildName(member: Member) {
  const rawFull = member.fullName?.trim() || "";
  const inferredFirst =
    member.firstName?.trim() ||
    (rawFull ? rawFull.split(/\s+/)[0] : undefined) ||
    (member.email?.includes("@") ? member.email.split("@")[0] : undefined) ||
    "";
  const inferredFamily =
    member.familyName?.trim() ||
    (rawFull
      ? rawFull
          .split(/\s+/)
          .slice(1)
          .join(" ")
          .trim() || undefined
      : undefined);

  return {
    ...member,
    firstName: inferredFirst,
    familyName: inferredFamily,
    fullName:
      rawFull || [inferredFirst, inferredFamily].filter(Boolean).join(" ").trim(),
  };
}

type ApiErrorData = {
  error?: string;
  requiresLeave?: boolean;
  currentFamily?: string | null;
  targetFamily?: string | null;
};

function extractApiError(error: unknown): ApiErrorData | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("data" in response)) {
    return undefined;
  }

  const data = (response as { data?: unknown }).data;
  if (typeof data === "object" && data !== null) {
    return data as ApiErrorData;
  }

  return undefined;
}

function resolveErrorMessage(error: unknown, fallback: string) {
  const message = extractApiError(error)?.error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

type SentInvite = StoredSentInvite;

const EMPTY_SENT_INVITES: SentInvite[] = [];

type IncomingInvite = {
  id: string;
  familyId: string;
  familyName: string;
  senderName?: string | null;
  senderEmail?: string | null;
  createdAt: string;
  expiresAt: string;
};

type PendingForceInvite = {
  invite: IncomingInvite;
  currentFamily?: string | null;
  targetFamily?: string | null;
};

function mapIncomingInvite(raw: IncomingInviteApi): IncomingInvite {
  const scoped = raw as IncomingInviteApi & Record<string, unknown>;
  const idValue =
    (typeof scoped.id === "string" && scoped.id) ||
    (typeof scoped.id === "number" && scoped.id > 0 ? String(scoped.id) : "") ||
    (typeof scoped.inviteId === "string" ? scoped.inviteId : "");
  const familyIdValue =
    (typeof scoped.familyId === "string" && scoped.familyId) ||
    (typeof scoped.family_id === "string" && scoped.family_id) ||
    (typeof scoped.family === "string" && scoped.family) ||
    (typeof scoped.familyId === "number" && scoped.familyId > 0 ? String(scoped.familyId) : "") ||
    (typeof scoped.family_id === "number" && scoped.family_id > 0 ? String(scoped.family_id) : "") ||
    "";

  return {
    id: idValue.trim(),
    familyId: familyIdValue.trim(),
    familyName:
      (typeof scoped.familyName === "string" && scoped.familyName) ||
      (typeof scoped.family_name === "string" && scoped.family_name) ||
      "Family",
    senderName:
      (typeof scoped.senderName === "string" ? scoped.senderName : undefined) ??
      (typeof scoped.sender_name === "string" ? scoped.sender_name : undefined) ??
      null,
    senderEmail:
      (typeof scoped.senderEmail === "string" ? scoped.senderEmail : undefined) ??
      (typeof scoped.sender_email === "string" ? scoped.sender_email : undefined) ??
      null,
    createdAt:
      (typeof scoped.createdAt === "string" && scoped.createdAt) ||
      (typeof scoped.created_at === "string" && scoped.created_at) ||
      new Date().toISOString(),
    expiresAt:
      (typeof scoped.expiresAt === "string" && scoped.expiresAt) ||
      (typeof scoped.expires_at === "string" && scoped.expires_at) ||
      new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  };
}

function getInviteId(invite: IncomingInvite) {
  const id = typeof invite.id === "string" ? invite.id.trim() : "";
  return id.length ? id : null;
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [emailInvite, setEmailInvite] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<IncomingInvite[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingError, setIncomingError] = useState<string | null>(null);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingForceInvite, setPendingForceInvite] = useState<PendingForceInvite | null>(null);
  const [forceError, setForceError] = useState<string | null>(null);
  const showNotifications = useUiStore((state) => state.notificationOpen);
  const setNotificationOpen = useUiStore((state) => state.setNotificationOpen);
  const toggleNotification = useUiStore((state) => state.toggleNotification);
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentUserId = currentUser?.id ?? null;
  const sentInvites = useInviteHistoryStore((state) => {
    if (currentUserId == null) return EMPTY_SENT_INVITES;
    const key = String(currentUserId);
    return state.historyByUser[key] ?? EMPTY_SENT_INVITES;
  });
  const addSentInvite = useInviteHistoryStore((state) => state.addInvite);
  const acceptInviteById = useAuthStore((state) => state.acceptInviteById);
  const clearStoreError = useAuthStore((state) => state.clearError);
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const reloadMembers = useCallback(async () => {
    try {
      const data = await fetchMembersApi();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  }, []);

  const loadIncomingInvites = useCallback(async () => {
    setIncomingLoading(true);
    setIncomingError(null);
    try {
      const data = await fetchIncomingInvitesApi();
      const normalized = data
        .map(mapIncomingInvite)
        .filter((item) => Boolean(getInviteId(item)));
      setIncomingInvites(normalized);
    } catch (err) {
      setIncomingError(resolveErrorMessage(err, "Failed to load invitations."));
    } finally {
      setIncomingLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadMembers();
  }, [reloadMembers]);

  useEffect(() => {
    void loadIncomingInvites();
  }, [loadIncomingInvites]);

  useEffect(() => {
    if (!showNotifications) {
      setPendingForceInvite(null);
      setActionError(null);
      setActionInviteId(null);
      setForceError(null);
      clearStoreError();
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications, clearStoreError, setNotificationOpen]);

  useEffect(() => {
    if (!showNotifications) return;
    void loadIncomingInvites();
    const interval = window.setInterval(() => {
      void loadIncomingInvites();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [showNotifications, loadIncomingInvites]);

  useEffect(() => {
    if (
      pendingForceInvite &&
      !incomingInvites.some((invite) => invite.id === pendingForceInvite.invite.id)
    ) {
      setPendingForceInvite(null);
    }
  }, [incomingInvites, pendingForceInvite]);

  const sortedMembers = useMemo(() => {
    const normalized = members.map(buildName);
    return normalized.sort((a, b) => {
      const aOwner = a.role === "owner";
      const bOwner = b.role === "owner";
      if (aOwner !== bOwner) return aOwner ? -1 : 1;

      const aFamily = (a.familyName || "").toLowerCase();
      const bFamily = (b.familyName || "").toLowerCase();
      if (aFamily && bFamily && aFamily !== bFamily) {
        return aFamily.localeCompare(bFamily);
      }

      const aFirst = (a.firstName || "").toLowerCase();
      const bFirst = (b.firstName || "").toLowerCase();
      if (aFirst && bFirst && aFirst !== bFirst) {
        return aFirst.localeCompare(bFirst);
      }

      return (a.fullName || "").localeCompare(b.fullName || "");
    });
  }, [members, currentUser?.id]);

  const familyName =
    currentUser?.familyName ||
    sortedMembers.find((m) => (m.role === "owner" || m.id === currentUser?.id) && m.familyName)?.familyName ||
    sortedMembers.find((m) => m.familyName)?.familyName;

  const familyLabel =
    currentUser?.familyLabel?.trim() ||
    (familyName ? `${familyName} Family` : "Family");
  const memberCount = sortedMembers.length;
  const familyInitials = useMemo(
    () => initialsFor(familyLabel || "Family"),
    [familyLabel]
  );

  const handleInvite = async () => {
    setLoadingInvite(true);
    setInviteError(null);
    setEmailSuccess(null);
    try {
      const { token, email, inviteeHasFamily, inviteeRecognized, emailSent } =
        await createInviteApi();
      setInviteToken(token);
      setCopied(false);
      const entry: SentInvite = {
        token,
        email: email ?? undefined,
        sentAt: new Date().toISOString(),
        method: "manual",
        inviteeHasFamily: Boolean(inviteeHasFamily),
        inviteeRecognized: Boolean(inviteeRecognized),
        emailSent: Boolean(emailSent),
      };
      if (currentUserId != null) {
        addSentInvite(currentUserId, entry);
      }
      setNotificationOpen(true);
    } catch (err) {
      setInviteError(resolveErrorMessage(err, "Failed to create invite"));
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleEmailInvite = async () => {
    const trimmed = emailInvite.trim().toLowerCase();
    if (!trimmed) {
      setEmailError("Please enter an email address.");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);
    setInviteError(null);
    try {
      const {
        token,
        email,
        inviteeHasFamily,
        inviteeRecognized,
        emailSent,
      } = await createInviteApi({ email: trimmed });
      setInviteToken(token);
      setCopied(false);
      const inviteEmail = email ?? trimmed;
      setEmailInvite("");
      let successMessage: string;
      if (emailSent) {
        if (inviteeHasFamily) {
          successMessage =
            "Invite email sent. They currently belong to another family and must leave it to accept.";
        } else if (inviteeRecognized) {
          successMessage =
            "Invite email sent. The recipient will also see it as an in-app notification.";
        } else {
          successMessage =
            "Invite email sent with the token. Ask them to follow the instructions to join.";
        }
      } else {
        successMessage =
          "Invite created, but the email could not be delivered. Share the token manually.";
      }
      setEmailSuccess(successMessage);
      const entry: SentInvite = {
        token,
        email: inviteEmail,
        sentAt: new Date().toISOString(),
        method: "email",
        inviteeHasFamily: Boolean(inviteeHasFamily),
        inviteeRecognized: Boolean(inviteeRecognized),
        emailSent: Boolean(emailSent),
      };
      if (currentUserId != null) {
        addSentInvite(currentUserId, entry);
      }
      setNotificationOpen(true);
    } catch (err) {
      setEmailError(resolveErrorMessage(err, "Failed to prepare invite email."));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDecline = async (invite: IncomingInvite) => {
    const inviteId = getInviteId(invite);
    if (!inviteId) {
      setActionError("Invite is missing an identifier.");
      return;
    }
    setProcessingInviteId(inviteId);
    setActionInviteId(inviteId);
    setActionError(null);
    setForceError(null);
    try {
      await declineInviteApi(inviteId);
      setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
      if (pendingForceInvite?.invite.id === inviteId) {
        setPendingForceInvite(null);
      }
      setActionInviteId(null);
    } catch (err) {
      setActionError(resolveErrorMessage(err, "Failed to decline invite."));
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleAccept = async (invite: IncomingInvite) => {
    const inviteId = getInviteId(invite);
    if (!inviteId) {
      setActionError("Invite is missing an identifier.");
      return;
    }
    setProcessingInviteId(inviteId);
    setActionInviteId(inviteId);
    setActionError(null);
    setForceError(null);
    setPendingForceInvite(null);
    clearStoreError();
    try {
      await acceptInviteById(inviteId);
      setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
      reloadMembers();
      loadIncomingInvites();
      setActionInviteId(null);
    } catch (err) {
      const data = extractApiError(err);
      if (data?.requiresLeave) {
        setPendingForceInvite({
          invite,
          currentFamily: data.currentFamily ?? null,
          targetFamily: data.targetFamily ?? null,
        });
        setActionError(null);
      } else {
        setActionError(data?.error || "Failed to accept invite.");
      }
    } finally {
      setProcessingInviteId(null);
    }
  };

  const confirmForceInvite = async () => {
    if (!pendingForceInvite) return;
    const invite = pendingForceInvite.invite;
    const inviteId = getInviteId(invite);
    if (!inviteId) {
      setForceError("Invite is missing an identifier.");
      return;
    }
    setProcessingInviteId(inviteId);
    setActionInviteId(inviteId);
    setForceError(null);
    clearStoreError();
    try {
      await acceptInviteById(inviteId, { forceLeave: true });
      setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
      setPendingForceInvite(null);
      reloadMembers();
      loadIncomingInvites();
      setActionInviteId(null);
    } catch (err) {
      setForceError(resolveErrorMessage(err, "Failed to join new family."));
    } finally {
      setProcessingInviteId(null);
    }
  };
  const handleCopy = async () => {
    if (!inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const pendingCount = incomingInvites.length + sentInvites.length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-28 pt-10 transition-colors">
      <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--surface-shadow)] transition-colors">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                {familyInitials || "F"}
              </span>
              <h1 className="text-2xl font-bold text-[var(--app-text)]">{familyLabel}</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="relative self-start sm:self-auto" ref={notificationRef}>
            <button
              type="button"
              onClick={toggleNotification}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="View invitations"
            >
              <Bell size={18} strokeWidth={2.2} />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 z-20 mt-3 w-96 max-w-[22rem] rounded-2xl border border-[var(--surface-border)] bg-white p-4 text-left shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Invitations</p>
                  {pendingCount > 0 && (
                    <span className="text-xs font-medium text-gray-400">
                      {pendingCount} total
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Received
                    </p>
                    {incomingLoading ? (
                      <p className="mt-2 text-sm text-gray-500">Loading...</p>
                    ) : incomingInvites.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">No invitations waiting for you.</p>
                    ) : (
                      incomingInvites.map((invite) => {
                        const normalizedInviteFamilyId = invite.familyId.trim();
                        const currentFamilyRaw = currentUser?.familyId;
                        const normalizedCurrentFamilyId =
                          currentFamilyRaw != null ? String(currentFamilyRaw).trim() : "";
                        const requiresLeave =
                          normalizedCurrentFamilyId.length > 0 &&
                          normalizedInviteFamilyId.length > 0 &&
                          normalizedCurrentFamilyId !== normalizedInviteFamilyId;
                        const isProcessing = processingInviteId === invite.id;
                        const isForcePrompt = pendingForceInvite?.invite.id === invite.id;
                        return (
                          <div
                            key={invite.id}
                            className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">{invite.familyName}</p>
                                <p className="text-xs text-gray-500">
                                  {invite.senderName ? `From ${invite.senderName}` : invite.senderEmail ? `From ${invite.senderEmail}` : "Family invitation"}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Sent {new Date(invite.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400">
                                Expires {new Date(invite.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                            {requiresLeave && !isForcePrompt && (
                              <p className="mt-2 text-xs text-amber-600">
                                Accepting will move you to this family workspace.
                              </p>
                            )}
                            {actionInviteId === invite.id && actionError && (
                              <p className="mt-2 text-xs text-red-600">{actionError}</p>
                            )}
                            {isForcePrompt ? (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-amber-700">
                                  You are currently part of {pendingForceInvite?.currentFamily || "another family"}. Accepting will switch you to {pendingForceInvite?.targetFamily || invite.familyName}.
                                </p>
                                {forceError && (
                                  <p className="text-xs text-red-600">{forceError}</p>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    onClick={confirmForceInvite}
                                    disabled={isProcessing}
                                    className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {isProcessing ? "Switching..." : "Accept & leave current family"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDecline(invite)}
                                    disabled={isProcessing}
                                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    Deny invite
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => handleAccept(invite)}
                                  disabled={isProcessing}
                                  className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {isProcessing ? "Accepting..." : "Accept"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDecline(invite)}
                                  disabled={isProcessing}
                                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {isProcessing && actionInviteId === invite.id ? "Processing..." : "Decline"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {incomingError && (
                      <p className="mt-2 text-xs text-red-600">{incomingError}</p>
                    )}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Sent
                    </p>
                    {sentInvites.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">No invitations sent yet.</p>
                    ) : (
                      sentInvites.map((invite) => (
                        <div
                          key={`${invite.token}-${invite.sentAt}`}
                          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {invite.email || "Token invite"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(invite.sentAt).toLocaleString()}
                              </p>
                            </div>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                            {invite.method === "manual"
                              ? "Manual"
                              : invite.emailSent
                              ? "Email"
                              : "Email (failed)"}
                          </span>
                          </div>
                          <p className="mt-2 break-all text-xs text-gray-600">
                            Token: <span className="font-mono">{invite.token}</span>
                          </p>
                          {invite.inviteeHasFamily && (
                            <p className="mt-2 text-xs text-amber-600">
                              Recipient currently belongs to another family.
                            </p>
                          )}
                          {invite.method === "email" && invite.emailSent === false && (
                            <p className="mt-2 text-xs text-amber-600">
                              Email delivery failed. Share this token with them directly.
                            </p>
                          )}
                          {invite.method === "email" &&
                            invite.emailSent &&
                            invite.inviteeRecognized === false && (
                              <p className="mt-2 text-xs text-[var(--text-muted)]">
                                Recipient has not created an account yet. Ask them to follow the email link to sign up.
                              </p>
                            )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="space-y-3">
          {!sortedMembers.length && (
            <div className="rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-alt)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              No members yet. Generate an invite to add someone.
            </div>
          )}

          {sortedMembers.map((member) => {
            const display = [member.firstName, member.familyName]
              .filter(Boolean)
              .join(" ")
              .trim() || member.fullName || member.email || "Family Member";
            const palette = avatarPaletteFor(display);
            const initials = initialsFor(display);
            const resolvedRole =
              member.role === "owner" ? "owner" : "member";
            const roleClasses =
              resolvedRole === "owner"
                ? "bg-emerald-100 text-emerald-600"
                : "bg-gray-100 text-gray-600";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--surface-shadow)]"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full text-lg font-semibold ${palette.bg} ${palette.text}`}
                  >
                    {initials}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--app-text)]">{display}</p>
                    {member.email && (
                      <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                    )}
                    <span
                      className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${roleClasses}`}
                    >
                      {resolvedRole === "owner" ? "Owner" : "Member"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            <button
              className="w-full rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 px-5 py-4 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleInvite}
              disabled={loadingInvite}
              type="button"
            >
              {loadingInvite ? "Generating invite..." : "Invite Member"}
            </button>
            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}
          </div>
        </div>

        {inviteToken && (
          <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">Invite Token</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-2xl border border-primary/30 bg-[var(--surface)] px-4 py-3 text-center font-mono text-sm tracking-[0.35em] text-[var(--app-text)] focus:outline-none"
                value={inviteToken}
                readOnly
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleCopy}
                disabled={copied}
                type="button"
              >
                <Copy size={16} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Share this token with your family member to let them join.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-alt)] p-5">
          <h2 className="text-base font-semibold text-[var(--app-text)]">Send invite by email</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Enter an email address and we&apos;ll send that person an in-app notification with the invite.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--app-text)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={emailInvite}
              onChange={(e) => {
                setEmailInvite(e.target.value);
                setEmailError(null);
                setEmailSuccess(null);
              }}
              placeholder="friend@example.com"
            />
            <button
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleEmailInvite}
              disabled={emailLoading}
              type="button"
            >
              {emailLoading ? "Sending..." : "Send notification"}
            </button>
          </div>
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-emerald-600">{emailSuccess}</p>}
        </div>

        <div className="mt-8 space-y-2">
          <button
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            onClick={() => {
              logout();
              navigate("/auth", { replace: true });
            }}
          >
            Log Out
          </button>
        </div>
      </section>
    </main>
  );
}

