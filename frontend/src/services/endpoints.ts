import { api } from "./api";
import type {
  AuthCredentials,
  AuthResponse,
  Task,
  InviteJoinPayload,
  Member,
  TaskStatus,
} from "../types";

type TaskApi = {
  id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  assignee_id: number;
  assignee_name?: string | null;
  is_done: boolean;
  created_at?: string | null;
};

type MemberApi = {
  id: number;
  full_name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  familyName?: string | null;
  email: string | null;
  role?: Member["role"];
};

function mapTaskFromApi(task: TaskApi): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    dueAt: task.due_at ?? undefined,
    assigneeId: task.assignee_id,
    assigneeName: task.assignee_name ?? undefined,
    status: task.is_done ? "completed" : "pending",
    createdAt: task.created_at ?? undefined,
  };
}

function mapStatusToIsDone(status?: TaskStatus | string) {
  if (status === "completed") return true;
  if (status === "pending") return false;
  return undefined;
}

function mapMemberFromApi(member: MemberApi): Member {
  const emailFallback = member.email?.split("@")[0] ?? "Family Member";
  const fullNameRaw = member.fullName ?? member.full_name ?? "";
  const fullName = fullNameRaw.trim() || emailFallback;
  const providedFirst = member.firstName?.trim();
  const providedFamily = member.familyName?.trim();

  let firstName = providedFirst;
  let familyName = providedFamily;

  if (!firstName) {
    const parts = fullName.split(/\s+/);
    firstName = parts.shift() || emailFallback;
    if (!familyName) {
      const rest = parts.join(" ").trim();
      familyName = rest || undefined;
    }
  }

  return {
    id: member.id,
    fullName,
    firstName,
    familyName,
    email: member.email ?? undefined,
    role: member.role ?? "member",
  };
}

// Auth
export const loginApi = (cred: AuthCredentials) =>
  api.post<AuthResponse>("/auth/login", cred).then(r => r.data);

export const registerApi = (cred: AuthCredentials) =>
  api.post<AuthResponse>("/auth/register", cred).then(r => r.data);

export const joinWithInviteApi = (payload: InviteJoinPayload) =>
  api.post<AuthResponse>("/auth/accept-invite", payload).then(r => r.data);

export const createInviteApi = (expiresInHours?: number) =>
  api
    .post<{ token: string; inviteId: number; expiresAt: string }>("/invites", {
      expiresInHours,
    })
    .then(r => r.data);

// Users
export const fetchMembersApi = () =>
  api.get<MemberApi[]>("/users").then(r => r.data.map(mapMemberFromApi));

export const leaveFamilyApi = () =>
  api.delete<{ ok: true }>("/users/me").then(r => r.data);

// Tasks
export const fetchTasksApi = (params?: { assigneeId?: number; status?: string }) =>
  api
    .get<TaskApi[]>("/todos", {
      params: {
        assigneeId: params?.assigneeId,
        isDone: mapStatusToIsDone(params?.status),
      },
    })
    .then(r => r.data.map(mapTaskFromApi));

export const createTaskApi = (task: Partial<Task>) =>
  api
    .post<TaskApi>("/todos", {
      title: task.title,
      description: task.description ?? null,
      due_at: task.dueAt ?? null,
      assignee_id: task.assigneeId,
    })
    .then(r => mapTaskFromApi(r.data));

export const updateTaskApi = (id: number, task: Partial<Task>) => {
  const payload: Record<string, unknown> = {};
  if ("title" in task) payload.title = task.title;
  if ("description" in task) payload.description = task.description ?? null;
  if ("dueAt" in task) payload.due_at = task.dueAt ?? null;
  if ("assigneeId" in task) payload.assignee_id = task.assigneeId;
  if ("status" in task) payload.is_done = mapStatusToIsDone(task.status);

  return api
    .patch<TaskApi>(`/todos/${id}`, payload)
    .then(r => mapTaskFromApi(r.data));
};

export const deleteTaskApi = (id: number) =>
  api.delete<{ ok: true }>(`/todos/${id}`).then(r => r.data);
