import { EmployeeAssignment, ProcessQuestionsMap } from '../types';

/**
 * Process Questions mapped to MEM Priority Group.
 * Display-only questions shown to the attendee in addition to their table assignment.
 */
export const PROCESS_QUESTIONS: ProcessQuestionsMap = {
  Growth: [
    'Where can we unlock more consumption, and how can we create more value to the consumers?',
    'From your perspective, what should we do differently to accelerate growth?',
  ],
  Efficiency: [
    'What are we doing today (ie. process, ways of working, systems) that we should address (remove/simplify/automate) to help us operate more efficiency, and drive faster decision making?',
  ],
  DT: [
    'As we build a more digitally agile organization, what key shifts do we need to adopt?',
    'What has been your biggest / most recent digital “aha” moment this year?',
  ],
  'HP Teams': [
    'As leaders, how do we drive high-performance with high level of ownership & greater sense of urgency, across teams?',
  ],
};

/**
 * Client Excel data uses several equivalent labels for the same MEM Priority Group
 * (e.g. the actual "MEM Grouping" sheet uses "Digital Transformation" and
 * "High Perf Teams", while PROCESS_QUESTIONS keys are the short "DT" / "HP Teams").
 * This maps every known raw label variant to one canonical internal key so the
 * group is treated as a single category everywhere (process questions lookup AND
 * admin summary counts) instead of silently splitting into two.
 *
 * IMPORTANT: this only affects lookup/display logic. The client's raw
 * `mem_priority_group` value is never rewritten in the stored employee record.
 */
const PRIORITY_GROUP_ALIASES: Record<string, string> = {
  growth: 'Growth',
  efficiency: 'Efficiency',
  dt: 'DT',
  dl: 'DT',
  'digital transformation': 'DT',
  'digital transformation (dl)': 'DT',
  'digital transformation(dl)': 'DT',
  'hp teams': 'HP Teams',
  'high perf teams': 'HP Teams',
  'high perf teams (hp teams)': 'HP Teams',
  'high performing teams': 'HP Teams',
  'high performance teams': 'HP Teams',
};

/** Canonical priority group key -> friendly display label for the admin summary cards. */
export const PRIORITY_GROUP_DISPLAY_LABELS: Record<string, string> = {
  DT: 'Digital Transformation (DL)',
  Efficiency: 'Efficiency',
  'HP Teams': 'High Perf Teams (HP Teams)',
  Growth: 'Growth',
};

/**
 * Canonical priority group key -> FULL source-style label, with no
 * parenthetical shorthand (unlike PRIORITY_GROUP_DISPLAY_LABELS above,
 * which is specifically for the admin summary cards). Used to expand an
 * abbreviated stored value (e.g. "HP Teams") back to the client's full
 * term ("High Perf Teams") for display, without ever rewriting the
 * underlying `mem_priority_group` value itself. Single source of truth —
 * reused by formatCombinedMemGroup below and by
 * employeeVerificationService.ts's Group Count Verification table.
 */
export const PRIORITY_GROUP_FULL_LABELS: Record<string, string> = {
  DT: 'Digital Transformation',
  Efficiency: 'Efficiency',
  'HP Teams': 'High Perf Teams',
  Growth: 'Growth',
};

/** Fixed display order for the admin dashboard's group summary cards. */
export const PRIORITY_GROUP_SUMMARY_ORDER = ['DT', 'Efficiency', 'HP Teams', 'Growth'] as const;

/**
 * Resolves a raw MEM Priority Group label (as typed by the client in Excel) to the
 * canonical internal key used by PROCESS_QUESTIONS and the admin summary cards.
 * Returns null when the value doesn't match any known group (e.g. "Unassigned").
 */
export function normalizePriorityGroupKey(priorityGroup?: string): string | null {
  if (!priorityGroup) return null;
  const trimmed = priorityGroup.trim();
  if (!trimmed) return null;
  return PRIORITY_GROUP_ALIASES[trimmed.toLowerCase()] || null;
}

/**
 * Resolves process questions based on an employee's MEM Priority Group.
 * Normalizes known label variants (e.g. "Digital Transformation" -> "DT",
 * "High Perf Teams" is the canonical key) before falling back to a direct/
 * case-insensitive key match, so client data variations never silently
 * result in zero questions.
 */
export function getProcessQuestions(priorityGroup?: string): string[] {
  if (!priorityGroup) return [];
  const trimmed = priorityGroup.trim();

  const canonicalKey = normalizePriorityGroupKey(trimmed);
  if (canonicalKey && PROCESS_QUESTIONS[canonicalKey]) {
    return PROCESS_QUESTIONS[canonicalKey];
  }

  // Direct key lookup
  if (PROCESS_QUESTIONS[trimmed]) {
    return PROCESS_QUESTIONS[trimmed];
  }

  // Case-insensitive lookup
  const match = Object.keys(PROCESS_QUESTIONS).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );

  return match ? PROCESS_QUESTIONS[match] : [];
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Display-safe name normalizer — last line of defense against the historical
 * "Name + Email Address" parsing bug.
 * ─────────────────────────────────────────────────────────────────────────
 * The source Excel cell packs 5 fields into one comma-separated string:
 *
 *     [Last Name],[First Name],[Location],[Position],[Email]
 *
 * The employee's real name is ONLY the first two comma-separated parts
 * ("Last Name, First Name"). An earlier version of the XLSX importer
 * (before Location/Position were split out) stored the WHOLE remainder —
 * e.g. "Tiedra,Donnel Jun,PH-Makati,Public Affairs" — directly as the
 * `name` field. That bad value is already sitting in already-imported/
 * already-deployed records (localStorage), and simply fixing the importer
 * does not retroactively repair data that was imported before the fix.
 *
 * This function is safe to call on ANY name string, whether it is:
 *   - already correct, e.g. "Tiedra, Donnel Jun"        -> unchanged (idempotent)
 *   - a plain single name with no comma, e.g. "Attendee" -> unchanged
 *   - historically malformed, e.g. "Tiedra,Donnel Jun,PH-Makati,Public Affairs"
 *                                                        -> "Tiedra, Donnel Jun"
 *
 * It only reformats/truncates the given name string — it never invents data,
 * never touches email/tables/employee_number/etc., and is called both as a
 * one-time self-healing migration when employee data loads (see
 * employeeStore.loadEmployees) and again defensively at the public/admin
 * display layer, so a bad name can never reach the screen either way.
 */
export function normalizeDisplayName(rawName: string): string {
  const trimmed = (rawName || '').trim();
  if (!trimmed || !trimmed.includes(',')) {
    return trimmed;
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length <= 2) {
    // Already just "Last, First" (or a single leftover part) — normalize the
    // spacing only (e.g. "Tiedra,Donnel Jun" -> "Tiedra, Donnel Jun").
    return parts.join(', ');
  }

  // More than 2 comma-separated parts means Location/Position (and possibly
  // other trailing debris) leaked into the name — keep only the real name.
  return parts.slice(0, 2).join(', ');
}

/**
 * The single "combined MEM Group" display convention used across the app
 * (public assignment result, admin verification tools): formats as
 * "Group {mem_group}: {mem_priority_group}", e.g. "Group 5: Efficiency" or
 * "Group Z: Unassigned". The two underlying fields are never modified —
 * this only formats them for display. Values are trimmed; blank/null/
 * undefined values are handled gracefully so missing data never shows as
 * "undefined", "null", or "NaN":
 *   - both present  -> "Group {mem_group}: {mem_priority_group}"
 *   - only mem_group        -> "Group {mem_group}"
 *   - only mem_priority_group -> "{mem_priority_group}" (no "Group" prefix)
 *   - both blank/undefined  -> "—"
 *
 * A known abbreviated form (e.g. a stored "HP Teams") is expanded to the
 * client's full source-style term ("High Perf Teams") via
 * PRIORITY_GROUP_FULL_LABELS above — the underlying `mem_priority_group`
 * value is never rewritten, only what's shown here. Anything that isn't a
 * recognized alias (e.g. "Unassigned", "Office of the CEO") passes through
 * completely unchanged.
 */
export function formatCombinedMemGroup(
  memPriorityGroup: string | undefined | null,
  memGroup: string | undefined | null
): string {
  const rawPriority = memPriorityGroup == null ? '' : String(memPriorityGroup).trim();
  const group = memGroup == null ? '' : String(memGroup).trim();

  const canonicalKey = normalizePriorityGroupKey(rawPriority);
  const priority = (canonicalKey && PRIORITY_GROUP_FULL_LABELS[canonicalKey]) || rawPriority;

  if (group && priority) return `Group ${group}: ${priority}`;
  if (group) return `Group ${group}`;
  if (priority) return priority;
  return '—';
}

/**
 * Utility to parse and normalize the "Table #" column from Excel.
 * Handles inputs like:
 * - "Table 3,6,8,9,12" -> ["Table 3", "Table 6", "Table 8", "Table 9", "Table 12"]
 * - "Table 3, 6, 8" -> ["Table 3", "Table 6", "Table 8"]
 * - "3, 6, 8, 9, 12" -> ["Table 3", "Table 6", "Table 8", "Table 9", "Table 12"]
 * - "Table 4" -> ["Table 4"]
 * - Array of strings -> trimmed string array
 */
export function normalizeTables(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((t) => String(t).trim()).filter(Boolean);
  }

  const raw = String(input).trim();
  if (!raw) return [];

  // Match pattern "Table 3,6,8,9,12" or "Table 3, 6, 8"
  const tablePrefixMatch = raw.match(/^Table\s+([0-9,\s]+)$/i);
  if (tablePrefixMatch) {
    const numbers = tablePrefixMatch[1].split(',').map((n) => n.trim()).filter(Boolean);
    return numbers.map((n) => `Table ${n}`);
  }

  // Match comma/semicolon separated items
  if (raw.includes(',') || raw.includes(';')) {
    const parts = raw.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    return parts.map((p) => {
      if (/^\d+$/.test(p)) {
        return `Table ${p}`;
      }
      return p;
    });
  }

  // Single digit table
  if (/^\d+$/.test(raw)) {
    return [`Table ${raw}`];
  }

  return [raw];
}

/**
 * Seed dataset initialized strictly from the client's verified data structure.
 * Room has been completely removed.
 * No fake employee records are invented.
 */
export const INITIAL_EMPLOYEES: EmployeeAssignment[] = [
  {
    id: 1,
    employee_number: '11248494',
    name: 'Donnel Jun Tiedra',
    employee_name: 'Donnel Jun Tiedra',
    email: 'asd.sas@ph.nestle.com',
    mem_group: '5',
    mem_priority_group: 'Efficiency',
    tables: ['Table 3', 'Table 6', 'Table 8', 'Table 9', 'Table 12'],
  },
];

/**
 * Searches employee by ID or formatted number.
 * Returns only the single attendee's record (or null).
 */
export function findEmployeeByNumber(inputNumber: string): EmployeeAssignment | null {
  const cleaned = inputNumber.trim().toUpperCase().replace(/^#/, '');
  if (!cleaned) return null;

  // Exact match
  const exact = INITIAL_EMPLOYEES.find(
    (e) => e.employee_number.toUpperCase() === cleaned
  );
  if (exact) return exact;

  // Normalized prefix/numeric match (e.g. user entered "11248494" or "EMP11248494")
  const numericOnly = cleaned.replace(/\D/g, '');
  if (numericOnly) {
    const matchNumeric = INITIAL_EMPLOYEES.find((e) => {
      const empNumeric = e.employee_number.replace(/\D/g, '');
      return (
        empNumeric === numericOnly ||
        empNumeric.endsWith(numericOnly) ||
        parseInt(empNumeric, 10) === parseInt(numericOnly, 10)
      );
    });
    if (matchNumeric) return matchNumeric;
  }

  return null;
}
