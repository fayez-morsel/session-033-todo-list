import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.join(__dirname, ".env");

dotenv.config();
dotenv.config({ path: backendEnvPath, override: false });
