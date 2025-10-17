import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy } from "lucide-react";
import {
  fetchMembersApi,
  createInviteApi,
  leaveFamilyApi,
} from "../services/endpoints";
import type { Member } from "../types";
import { avatarPaletteFor, initialsFor } from "../utils/avatar";
import { useAuthStore } from "../store/auth";

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

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembersApi()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  const sortedMembers = useMemo(() => {
    const normalized = members.map(buildName);
    return normalized.sort((a, b) => {
      const aOwner = a.role === "owner" || a.id === currentUser?.id;
      const bOwner = b.role === "owner" || b.id === currentUser?.id;
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

  const familyLabel = familyName ? `${familyName} Family` : "Family";
  const memberCount = sortedMembers.length;

  const handleInvite = () => {
    setLoadingInvite(true);
    setInviteError(null);
    createInviteApi()
      .then(({ token }) => {
        setInviteToken(token);
        setCopied(false);
      })
      .catch((err: any) => {
        setInviteError(err?.response?.data?.error || "Failed to create invite");
      })
      .finally(() => {
        setLoadingInvite(false);
      });
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

  const handleLeave = async () => {
    setLeaveLoading(true);
    setLeaveError(null);
    try {
      await leaveFamilyApi();
      logout();
      navigate("/auth", { replace: true });
    } catch (e: any) {
      setLeaveError(e?.response?.data?.error || "Failed to leave family");
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-28 pt-10 transition-colors">
      <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--surface-shadow)] transition-colors">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                👨‍👩‍👧‍👦
              </span>
              <h1 className="text-2xl font-bold text-[var(--app-text)]">{familyLabel}</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
          <button
            onClick={logout}
            className="self-start rounded-full border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            type="button"
          >
            Log Out
          </button>
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
              member.role === "owner" || member.id === currentUser?.id ? "owner" : "member";
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

        <div className="mt-8 space-y-2">
          <button
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleLeave}
            disabled={leaveLoading}
          >
            {leaveLoading ? "Leaving..." : "Leave Family Group"}
          </button>
          {leaveError && (
            <p className="text-sm text-red-600">{leaveError}</p>
          )}
        </div>
      </section>
    </main>
  );
}

