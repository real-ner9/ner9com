/**
 * Spots SQL injection attempts in the review field (the joke: the field is labelled "SQL
 * injection field (review)" and an attempt gets you banned). Nothing typed there ever reaches the
 * database as SQL — Prisma always sends it as data — so this is only about recognising the
 * attempt. Only unmistakable constructions count: a review saying "drop the beat, it's fire" or
 * "1 = 1 vibes" must not get anyone banned.
 */
const PATTERNS: RegExp[] = [
  // ' OR 1=1, " or 'a'='a, ' OR true --
  /['"`]\s*\)?\s*(or|and|\|\||&&)\s+['"`(]?\s*[\w'"`]+\s*['"`)]?\s*(=|<|>|like|is)\s*['"`(]?\s*[\w'"`]+/i,
  /['"`]\s*\)?\s*(or|and)\s+(true|false|not)\b/i,
  // '; DROP TABLE x; --   '; DELETE FROM users
  /;\s*(drop\s+(table|database|schema)|delete\s+from|insert\s+into|update\s+\w+\s+set|alter\s+table|create\s+(table|user)|truncate\s+(table\s+)?\w|exec(ute)?\s+\w|shutdown\b|grant\s+\w)/i,
  /\bdrop\s+(table|database|schema)\b/i,
  /\bunion\s+(all\s+)?select\b/i,
  /\bselect\b[\s\S]{0,80}\bfrom\b[\s\S]{0,40}\b(users?|information_schema|pg_\w+|sqlite_master|mysql)\b/i,
  /\binformation_schema\b|\bpg_catalog\b|\bsqlite_master\b/i,
  // Quote then a comment: admin'--   ' #   ')/*
  /['"`]\s*\)*\s*(--|#|\/\*)/,
  // Time-based and stacked tricks
  /\b(sleep|pg_sleep|benchmark|waitfor\s+delay)\s*\(/i,
  /\bwaitfor\s+delay\b/i,
  /\bxp_cmdshell\b|\bload_file\s*\(|\binto\s+(out|dump)file\b/i,
]

export function looksLikeSqlInjection(input: string) {
  return PATTERNS.some((pattern) => pattern.test(input))
}
