/** Meta Facebook Login for Business configuration IDs are numeric strings. */
const META_LOGIN_CONFIG_ID_PATTERN = /^\d{5,20}$/;

export function isValidMetaLoginConfigId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return false;
  return META_LOGIN_CONFIG_ID_PATTERN.test(trimmed);
}

export function normalizeMetaLoginConfigId(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidMetaLoginConfigId(trimmed)) return null;
  return trimmed;
}

export function validateMetaLoginConfigIdInput(
  value: string | undefined
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: null };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (!isValidMetaLoginConfigId(trimmed)) {
    return {
      ok: false,
      error:
        "Facebook Login Configuration ID должен быть числовым ID из Meta → Facebook Login for Business → Configurations (5–20 цифр, не email).",
    };
  }
  return { ok: true, value: trimmed };
}
