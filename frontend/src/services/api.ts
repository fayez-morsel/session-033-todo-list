import axios from "axios";
import { API_BASE_URL } from "../config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}
