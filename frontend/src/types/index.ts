export type ID = number;

export interface User {
  id: ID;
  name: string;
  fullName?: string;
  firstName?: string;
  familyName?: string;
  email: string;
  familyId: ID;
}

export interface Member {
  id: ID;
  fullName: string;
  firstName?: string;
  familyName?: string;
  email?: string;
  role: "owner" | "member";
}

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: ID;
  title: string;
  description?: string;
  dueAt?: string;           
  assigneeId: ID;
  assigneeName?: string;
  status: TaskStatus;
  createdAt?: string;
}

export interface ApiError { error: string; }

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string; 
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface InviteJoinPayload {
  token: string;
  name: string;
  email: string;
  password: string;
}
