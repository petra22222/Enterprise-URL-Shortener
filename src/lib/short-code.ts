// FILE: src/lib/short-code.ts
import { customAlphabet } from "nanoid";
import { RESERVED_CODES } from "./reserved-codes";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/l/I ambiguity
const generate = customAlphabet(ALPHABET, 7);

export function generateShortCode(): string {
  return generate();
}

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

export function validateAliasFormat(alias: string): { ok: true } | { ok: false; error: string } {
  if (!ALIAS_REGEX.test(alias)) {
    return { ok: false, error: "Alias must be 3-30 characters: letters, numbers, hyphens or underscores." };
  }
  if (RESERVED_CODES.has(alias.toLowerCase())) {
    return { ok: false, error: "This alias is reserved. Please choose another." };
  }
  return { ok: true };
}