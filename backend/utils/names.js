export function splitFullName(rawName) {
  const fullName = (rawName || "").trim();
  if (!fullName) {
    return { firstName: "", familyName: "" };
  }

  const parts = fullName.split(/\s+/);
  const firstName = parts.shift() || "";
  const familyName = parts.join(" ").trim();
  return { firstName, familyName };
}

export function formatUserRow(row = {}) {
  const id = row.id;
  const familyId = row.family_id ?? row.familyId;
  const email = row.email ?? "";
  const fullNameRaw = row.full_name ?? row.fullName ?? "";
  const { firstName, familyName } = splitFullName(fullNameRaw);

  const fallbackFirst =
    firstName ||
    familyName ||
    fullNameRaw ||
    (email.includes("@") ? email.split("@")[0] : "");

  const fullName =
    fullNameRaw.trim() || [fallbackFirst, familyName].filter(Boolean).join(" ").trim();

  return {
    id,
    familyId,
    email,
    name: fallbackFirst,
    firstName: fallbackFirst,
    familyName: familyName || undefined,
    fullName: fullName || undefined,
  };
}

