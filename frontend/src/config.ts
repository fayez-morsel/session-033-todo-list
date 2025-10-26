const envApiUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL: string =
  (typeof envApiUrl === "string" ? envApiUrl.replace(/\/$/, "") : undefined) ||
  "http://localhost:4000";
