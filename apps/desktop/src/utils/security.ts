const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export function sanitizePlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0);
      return (
        character === "\n" ||
        character === "\t" ||
        (code >= 0x20 && code !== 0x7f)
      );
    })
    .join("")
    .trim();
}

export function validateProviderBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Base URL is required.";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Base URL must be a valid URL.";
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return "Use http or https for the Base URL.";
  }

  if (
    parsed.protocol === "http:" &&
    !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
  ) {
    return "HTTP is only allowed for localhost providers.";
  }

  if (parsed.username || parsed.password) {
    return "Base URL must not include embedded credentials.";
  }

  if (parsed.search || parsed.hash) {
    return "Base URL must not include query strings or fragments.";
  }

  return null;
}

export function validateHeaderNameInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Header name is required.";
  }

  if (/[\r\n]/.test(trimmed)) {
    return "Header name cannot contain line breaks.";
  }

  if (!HEADER_NAME_PATTERN.test(trimmed)) {
    return "Header name contains unsupported characters.";
  }

  return null;
}

export function validateHeaderValueInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Header value is required.";
  }

  if (/[\r\n]/.test(trimmed)) {
    return "Header value cannot contain line breaks.";
  }

  return null;
}
