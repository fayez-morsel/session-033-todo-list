import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersRound, Home } from "lucide-react";
import BrandMark from "../components/BrandMark";
import { useAuthStore } from "../store/auth";
import {
  fetchIncomingInvitesApi,
  declineInviteApi,
  type IncomingInviteApi,
} from "../services/endpoints";

type IncomingInvite = {
  id: string;
  familyId: string;
  familyName: string;
  senderName?: string | null;
  senderEmail?: string | null;
  createdAt: string;
  expiresAt: string;
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

type PendingForcedJoin =
  | {
      type: "token";
      token: string;
      currentFamily?: string | null;
      targetFamily?: string | null;
    }
  | {
      type: "invite";
      inviteId: string;
      currentFamily?: string | null;
      targetFamily?: string | null;
    };

export default function FamilySetup() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const loading = useAuthStore((state) => state.loading);
  const storeError = useAuthStore((state) => state.error);
  const createFamily = useAuthStore((state) => state.createFamily);
  const joinFamilyWithToken = useAuthStore((state) => state.joinFamilyWithToken);
  const acceptInviteById = useAuthStore((state) => state.acceptInviteById);
  const clearError = useAuthStore((state) => state.clearError);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.familyId) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser?.familyId, navigate]);

  const firstName = currentUser?.firstName || currentUser?.name || "there";

  const [familyName, setFamilyName] = useState("");
  const [familyNameError, setFamilyNameError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"create" | "join" | null>(null);
  const [pendingForcedJoin, setPendingForcedJoin] = useState<PendingForcedJoin | null>(
    null
  );
  const [forceLoading, setForceLoading] = useState(false);
  const [incomingInvites, setIncomingInvites] = useState<IncomingInvite[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingError, setIncomingError] = useState<string | null>(null);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const loadIncomingInvites = useCallback(async () => {
    setIncomingLoading(true);
    setIncomingError(null);
    try {
      const data = await fetchIncomingInvitesApi();
      const normalized = data
        .map(mapIncomingInvite)
        .filter((invite) => typeof invite.id === "string" && invite.id.trim().length > 0);
      setIncomingInvites(normalized);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || "Failed to load invitations. Try again.";
      setIncomingError(message);
    } finally {
      setIncomingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncomingInvites();
  }, [loadIncomingInvites]);

  const handleAcceptInvite = async (invite: IncomingInvite) => {
    const inviteId = typeof invite.id === "string" ? invite.id.trim() : "";
    if (!inviteId) {
      setInviteActionError("Invite is missing an identifier.");
      return;
    }
    setProcessingInviteId(inviteId);
    setInviteActionError(null);
    setPendingForcedJoin(null);
    clearError();
    try {
      await acceptInviteById(inviteId);
      setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.requiresLeave) {
        setPendingForcedJoin({
          type: "invite",
          inviteId,
          currentFamily: data.currentFamily ?? null,
          targetFamily: data.targetFamily ?? invite.familyName,
        });
        setInviteActionError(null);
      } else {
        setInviteActionError(data?.error || "Failed to accept invite. Try again.");
      }
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: IncomingInvite) => {
    const inviteId = typeof invite.id === "string" ? invite.id.trim() : "";
    if (!inviteId) {
      setInviteActionError("Invite is missing an identifier.");
      return;
    }
    setProcessingInviteId(inviteId);
    setInviteActionError(null);
    setPendingForcedJoin(null);
    try {
      await declineInviteApi(inviteId);
      setIncomingInvites((prev) => prev.filter((item) => item.id !== inviteId));
    } catch (err: any) {
      setInviteActionError(err?.response?.data?.error || "Failed to decline invite. Try again.");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleCreate = async () => {
    const trimmed = familyName.trim();
    setActiveAction("create");
    if (!trimmed) {
      setFamilyNameError("Family name is required.");
      return;
    }
    setFamilyNameError(null);
    clearError();
    await createFamily(trimmed);
    if (!useAuthStore.getState().error) {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleJoin = async () => {
    const trimmed = inviteToken.trim();
    setActiveAction("join");
    setInviteActionError(null);
    setPendingForcedJoin(null);
    if (!trimmed) {
      setTokenError("Invite token is required.");
      return;
    }
    setTokenError(null);
    clearError();
    try {
      await joinFamilyWithToken(trimmed);
      if (!useAuthStore.getState().error) {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      const requiresLeave = err?.response?.data?.requiresLeave;
      if (requiresLeave) {
        setPendingForcedJoin({
          type: "token",
          token: trimmed,
          currentFamily: err?.response?.data?.currentFamily,
          targetFamily: err?.response?.data?.targetFamily,
        });
        setTokenError(null);
        clearError();
      } else {
        clearError();
        setTokenError(err?.response?.data?.error || "Failed to join family. Try again.");
      }
    }
  };

  const createError = activeAction === "create" ? familyNameError || storeError : familyNameError;
  const joinError =
    pendingForcedJoin != null
      ? null
      : activeAction === "join"
      ? tokenError || storeError
      : tokenError;

  const confirmForcedJoin = async () => {
    if (!pendingForcedJoin) return;
    const inviteIdTrimmed =
      pendingForcedJoin.type === "invite" ? pendingForcedJoin.inviteId.trim() : null;
    if (pendingForcedJoin.type === "invite" && !inviteIdTrimmed) {
      setInviteActionError("Invite is missing an identifier.");
      return;
    }
    setForceLoading(true);
    clearError();
    let succeeded = false;
    try {
      if (pendingForcedJoin.type === "token") {
        await joinFamilyWithToken(pendingForcedJoin.token, { forceLeave: true });
        if (!useAuthStore.getState().error) {
          succeeded = true;
          navigate("/dashboard", { replace: true });
        } else {
          setTokenError(useAuthStore.getState().error);
        }
      } else {
        await acceptInviteById(inviteIdTrimmed!, { forceLeave: true });
        succeeded = true;
        setIncomingInvites((prev) =>
          prev.filter((item) => item.id !== inviteIdTrimmed)
        );
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      if (pendingForcedJoin.type === "token") {
        clearError();
        setTokenError(err?.response?.data?.error || "Failed to join family. Try again.");
      } else {
        clearError();
        setInviteActionError(err?.response?.data?.error || "Failed to accept invite. Try again.");
      }
    } finally {
      setForceLoading(false);
      if (succeeded) {
        setPendingForcedJoin(null);
        setTokenError(null);
        setInviteActionError(null);
      }
    }
  };

  const cancelForcedJoin = () => {
    if (pendingForcedJoin?.type === "token") {
      setTokenError("Invite cancelled.");
    } else if (pendingForcedJoin?.type === "invite") {
      setInviteActionError("Invite cancelled.");
    }
    setPendingForcedJoin(null);
    clearError();
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10">
        <BrandMark className="mx-auto" />

        <section className="w-full rounded-3xl border border-white/50 bg-white px-10 py-12 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
            Family workspace
          </p>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Welcome{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500">
            Choose how you want to get started. You can create a brand new family workspace or join
            one that already exists. Each account can belong to only one family at a time.
          </p>
        </section>

        <div className="grid w-full gap-6 md:grid-cols-2">
          <div className="flex h-full flex-col justify-between rounded-3xl border border-white/50 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Home size={26} strokeWidth={2.4} />
              </span>
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900">Create a new family</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pick a name for your family's workspace. You'll be the owner and can invite the
                  rest of the household after this step.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Family name
                </label>
                <input
                  className={`w-full rounded-2xl border ${
                    createError ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50"
                  } px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                  value={familyName}
                  onChange={(e) => {
                    setFamilyName(e.target.value);
                    setFamilyNameError(null);
                    if (activeAction === "create") {
                      clearError();
                    }
                  }}
                  placeholder="Create family"
                />
                <p className="min-h-[18px] text-xs text-red-600">{createError}</p>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full rounded-full bg-primary py-3 text-base font-semibold text-white shadow-[0_18px_35px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark disabled:opacity-70"
              >
                {loading && activeAction === "create" ? "Creating..." : "Create family"}
              </button>
            </div>
          </div>

          <div className="flex h-full flex-col justify-between rounded-3xl border border-white/50 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gray-900/10 text-gray-900">
                <UsersRound size={26} strokeWidth={2.4} />
              </span>
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900">Join an existing family</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the invite token shared by your family admin. Tokens expire after a few
                  days, so reach out to them if yours no longer works.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Invite token
                </label>
                <input
                  className={`w-full rounded-2xl border ${
                    joinError ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50"
                  } px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                  value={inviteToken}
                  onChange={(e) => {
                    setInviteToken(e.target.value);
                    setTokenError(null);
                    setInviteActionError(null);
                    setPendingForcedJoin(null);
                    if (activeAction === "join") {
                      clearError();
                    }
                  }}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              <p className="min-h-[18px] text-xs text-red-600">{joinError}</p>
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
                className="w-full rounded-full bg-gray-900 py-3 text-base font-semibold text-white transition hover:bg-gray-800 disabled:opacity-70"
              >
                {loading && activeAction === "join" ? "Joining..." : "Join with token"}
              </button>
              <p className="text-sm text-gray-500">
                Need a token? Ask the family admin to generate one from their members page.
              </p>
            </div>
          </div>
        </div>

        <section className="w-full max-w-3xl rounded-3xl border border-white/50 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Pending invitations</h2>
            {incomingInvites.length > 0 && (
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {incomingInvites.length} {incomingInvites.length === 1 ? "invite" : "invites"}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Family admins can invite you directly. Accepting will move your account into their
            workspace.
          </p>
          <div className="mt-4 space-y-4">
            {incomingLoading ? (
              <p className="text-sm text-gray-500">Loading invitations...</p>
            ) : incomingError ? (
              <p className="text-sm text-red-600">{incomingError}</p>
            ) : incomingInvites.length === 0 ? (
              <p className="text-sm text-gray-500">No invitations waiting for you right now.</p>
            ) : (
              incomingInvites.map((invite) => {
                const isProcessing = processingInviteId === invite.id;
                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-gray-900">{invite.familyName}</p>
                      <p className="text-sm text-gray-500">
                        {invite.senderName
                          ? `From ${invite.senderName}`
                          : invite.senderEmail
                          ? `From ${invite.senderEmail}`
                          : "Family invitation"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Sent {new Date(invite.createdAt).toLocaleString()} - Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={isProcessing}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isProcessing ? "Processing..." : "Accept invite"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(invite)}
                        disabled={isProcessing}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isProcessing ? "Processing..." : "Decline"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {inviteActionError && (!pendingForcedJoin || pendingForcedJoin.type !== "invite") && (
            <p className="mt-4 text-sm text-red-600">{inviteActionError}</p>
          )}
        </section>

        {pendingForcedJoin && (
          <div className="w-full max-w-3xl rounded-3xl border border-amber-300 bg-amber-50 px-6 py-5 text-sm text-amber-900 shadow-sm">
            <h3 className="text-base font-semibold">
              Leave current family to join {pendingForcedJoin.targetFamily || "the new family"}?
            </h3>
            <p className="mt-2">
              You are currently part of{" "}
              <strong>{pendingForcedJoin.currentFamily || "another family"}</strong>. Accepting this
              invite will move your account to{" "}
              <strong>{pendingForcedJoin.targetFamily || "the invited family"}</strong>. Any access
              to your previous family will be removed.
            </p>
            {pendingForcedJoin.type === "token" && tokenError && (
              <p className="mt-3 text-sm font-semibold text-red-600">{tokenError}</p>
            )}
            {pendingForcedJoin.type === "invite" && inviteActionError && (
              <p className="mt-3 text-sm font-semibold text-red-600">{inviteActionError}</p>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={confirmForcedJoin}
                disabled={forceLoading}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {forceLoading ? "Switching..." : "Accept & join new family"}
              </button>
              <button
                type="button"
                onClick={cancelForcedJoin}
                disabled={forceLoading}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Deny Invite
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
