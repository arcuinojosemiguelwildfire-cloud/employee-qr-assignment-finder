import { EmployeeAssignment } from '../types';
import { normalizePriorityGroupKey } from '../data/seedEmployees';

/**
 * Pure, read-only helpers for the Admin "Employee Data Verification"
 * feature (src/components/admin/EmployeeVerificationModal.tsx).
 *
 * IMPORTANT: nothing in this file talks to Supabase, localStorage, or
 * anything else with a side effect — it only transforms data that has
 * already been fetched elsewhere (the same `employees` list the Admin
 * Dashboard already loads via supabaseEmployeeService.getAll()). This is
 * deliberate: verification never issues its own bulk "select everything"
 * query — it reuses the admin list the dashboard already has in memory,
 * and never inserts/updates/deletes anything.
 */

// ---------------------------------------------------------------------------
// 1. Parsing pasted Employee Numbers
// ---------------------------------------------------------------------------

/**
 * Splits pasted text into individual Employee Number strings.
 * Handles one-per-line paste (the normal case when copying a column out of
 * Excel), but also tabs, extra spaces, and blank lines gracefully by
 * splitting on ANY run of whitespace (space, tab, newline, CR). Employee
 * Numbers never contain internal whitespace, so this is safe and simpler
 * than trying to special-case each separator individually.
 *
 * Only whitespace is trimmed — the Employee Number string itself (digits,
 * letters, leading zeros, punctuation) is preserved byte-for-byte. Numbers
 * are NEVER coerced to a JS number anywhere in this module.
 */
export function parsePastedEmployeeNumbers(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface DuplicateIdInfo {
  id: string;
  count: number;
}

export interface ParsedIdAnalysis {
  /** Every non-blank entry from the paste, in original order, INCLUDING repeats. */
  totalChecked: number;
  /** Distinct Employee Numbers (case-insensitive), duplicates collapsed. */
  uniqueIds: string[];
  /** Distinct IDs that appeared more than once, with their occurrence count. */
  duplicates: DuplicateIdInfo[];
}

/**
 * Deduplicates (case-insensitively, matching how employee_number uniqueness
 * is enforced everywhere else in this app) while preserving the FIRST-seen
 * original casing/format for display and lookup.
 */
export function analyzePastedIds(rawEntries: string[]): ParsedIdAnalysis {
  const countByKey = new Map<string, number>();
  const firstSeenById = new Map<string, string>();

  for (const entry of rawEntries) {
    const key = entry.toUpperCase();
    countByKey.set(key, (countByKey.get(key) || 0) + 1);
    if (!firstSeenById.has(key)) {
      firstSeenById.set(key, entry);
    }
  }

  const uniqueIds = Array.from(firstSeenById.values());
  const duplicates: DuplicateIdInfo[] = [];
  countByKey.forEach((count, key) => {
    if (count > 1) {
      duplicates.push({ id: firstSeenById.get(key) || key, count });
    }
  });

  return {
    totalChecked: rawEntries.length,
    uniqueIds,
    duplicates,
  };
}

// ---------------------------------------------------------------------------
// 2. Comparing pasted IDs against the current employee dataset
// ---------------------------------------------------------------------------

export interface VerificationResult {
  totalChecked: number;
  uniqueCount: number;
  foundCount: number;
  missingCount: number;
  duplicates: DuplicateIdInfo[];
  /** Full employee records for every pasted ID that IS present. */
  foundEmployees: EmployeeAssignment[];
  /** Employee Numbers (original pasted casing) that are NOT present. */
  missingIds: string[];
}

/**
 * Compares the pasted, deduplicated Employee Numbers against the employee
 * dataset ALREADY loaded by the Admin Dashboard (via
 * supabaseEmployeeService.getAll — Supabase when configured, local
 * fallback otherwise). This performs a case-insensitive EXACT match on
 * employee_number — deliberately NOT the public lookup's lenient
 * numeric-suffix fallback (that leniency exists to help a human typing
 * their own number at the public kiosk; an audit tool comparing exact
 * source-of-truth Excel IDs should surface exact mismatches rather than
 * paper over them).
 */
export function verifyEmployeeIds(
  rawEntries: string[],
  employees: EmployeeAssignment[]
): VerificationResult {
  const { totalChecked, uniqueIds, duplicates } = analyzePastedIds(rawEntries);

  const byNumber = new Map<string, EmployeeAssignment>();
  for (const emp of employees) {
    byNumber.set(emp.employee_number.trim().toUpperCase(), emp);
  }

  const foundEmployees: EmployeeAssignment[] = [];
  const missingIds: string[] = [];

  for (const id of uniqueIds) {
    const match = byNumber.get(id.toUpperCase());
    if (match) {
      foundEmployees.push(match);
    } else {
      missingIds.push(id);
    }
  }

  return {
    totalChecked,
    uniqueCount: uniqueIds.length,
    foundCount: foundEmployees.length,
    missingCount: missingIds.length,
    duplicates,
    foundEmployees,
    missingIds,
  };
}

// ---------------------------------------------------------------------------
// 3. Group Count Verification (MEM Priority Group + MEM Group distribution)
// ---------------------------------------------------------------------------

/**
 * Reference counts from the client's XLSX source, supplied by the event
 * organizer. These are fixed reference values, not derived from any live
 * data — "Actual" is always computed fresh from the current employee
 * dataset (see computeGroupCounts below), never hardcoded.
 */
const EXPECTED_ROWS: { priorityKey: string; memGroup: string; expected: number }[] = [
  { priorityKey: 'DT', memGroup: '7', expected: 19 },
  { priorityKey: 'DT', memGroup: '8', expected: 18 },
  { priorityKey: 'DT', memGroup: '9', expected: 19 },
  { priorityKey: 'Efficiency', memGroup: '4', expected: 20 },
  { priorityKey: 'Efficiency', memGroup: '5', expected: 20 },
  { priorityKey: 'Efficiency', memGroup: '6', expected: 20 },
  { priorityKey: 'Growth', memGroup: '1', expected: 20 },
  { priorityKey: 'Growth', memGroup: '2', expected: 20 },
  { priorityKey: 'Growth', memGroup: '3', expected: 20 },
  { priorityKey: 'HP Teams', memGroup: '10', expected: 20 },
  { priorityKey: 'HP Teams', memGroup: '11', expected: 17 },
  { priorityKey: 'HP Teams', memGroup: '12', expected: 18 },
];

const UNASSIGNED_KEY = 'Unassigned';
const UNASSIGNED_MEM_GROUP = '6';

export const EXPECTED_GRAND_TOTAL = 237;

/** Display order + label for this table (plain labels, matching the reference table exactly). */
const PRIORITY_GROUP_ORDER = ['DT', 'Efficiency', 'Growth', 'HP Teams'] as const;
const PRIORITY_GROUP_TABLE_LABELS: Record<string, string> = {
  DT: 'Digital Transformation',
  Efficiency: 'Efficiency',
  Growth: 'Growth',
  'HP Teams': 'High Perf Teams',
  [UNASSIGNED_KEY]: 'Unassigned',
};

export interface GroupCountRow {
  priorityGroupLabel: string;
  memGroup: string | null; // null on subtotal/grand-total rows
  expected: number | null; // null when there is no fixed reference value
  actual: number;
  difference: number | null; // null when expected is null (never a misleading diff)
  rowType: 'detail' | 'subtotal' | 'grand-total';
}

/**
 * Buckets an employee into one of the 4 known canonical priority groups, or
 * "Unassigned" for anything that doesn't normalize to a known group
 * (including literal "Unassigned" values and anything else unrecognized).
 * Reuses the SAME normalizePriorityGroupKey already used by the admin
 * summary cards and Process Questions — one canonical mapping, not a
 * second competing one.
 */
function bucketKeyFor(employee: EmployeeAssignment): string {
  return normalizePriorityGroupKey(employee.mem_priority_group) || UNASSIGNED_KEY;
}

/**
 * Computes the full Group Count Verification table from the CURRENT
 * employee dataset only (never pasted verification IDs, never Excel rows,
 * never localStorage backups, never import-audit rows — see caller).
 *
 * Every "Actual" number is counted directly from `employees`. Subtotals
 * per priority group are computed by filtering the full employee list
 * (not by summing only the reference-listed mem_group rows), so if real
 * data contains a mem_group value not covered by the reference table, the
 * group's Total still reconciles correctly — an extra "Other" row is
 * appended so nothing is silently hidden. The Grand Total is always
 * exactly `employees.length`.
 */
export function computeGroupCounts(employees: EmployeeAssignment[]): {
  rows: GroupCountRow[];
  actualGrandTotal: number;
  expectedGrandTotal: number;
  grandTotalDifference: number;
} {
  // actual count per exact (bucketKey, memGroup) pair
  const exactCounts = new Map<string, number>();
  for (const emp of employees) {
    const key = `${bucketKeyFor(emp)}||${(emp.mem_group || '').trim()}`;
    exactCounts.set(key, (exactCounts.get(key) || 0) + 1);
  }

  const rows: GroupCountRow[] = [];

  for (const priorityKey of PRIORITY_GROUP_ORDER) {
    const label = PRIORITY_GROUP_TABLE_LABELS[priorityKey];
    const childRows = EXPECTED_ROWS.filter((r) => r.priorityKey === priorityKey);
    let shownActualSum = 0;
    let expectedSum = 0;

    for (const child of childRows) {
      const key = `${priorityKey}||${child.memGroup}`;
      const actual = exactCounts.get(key) || 0;
      exactCounts.delete(key); // consumed — remainder (if any) becomes "Other" below
      shownActualSum += actual;
      expectedSum += child.expected;
      rows.push({
        priorityGroupLabel: label,
        memGroup: child.memGroup,
        expected: child.expected,
        actual,
        difference: actual - child.expected,
        rowType: 'detail',
      });
    }

    // Real, correct subtotal — a full filter of the actual data, not a sum
    // of only the reference-listed rows above, so it can never under-count.
    const actualSubtotal = employees.filter((e) => bucketKeyFor(e) === priorityKey).length;
    const otherForThisGroup = actualSubtotal - shownActualSum;
    if (otherForThisGroup > 0) {
      rows.push({
        priorityGroupLabel: label,
        memGroup: 'Other',
        expected: null,
        actual: otherForThisGroup,
        difference: null,
        rowType: 'detail',
      });
    }

    rows.push({
      priorityGroupLabel: `${label} Total`,
      memGroup: null,
      expected: expectedSum,
      actual: actualSubtotal,
      difference: actualSubtotal - expectedSum,
      rowType: 'subtotal',
    });
  }

  // Unassigned — no fixed expected count per the reference table, so its
  // difference is intentionally never calculated (would be misleading).
  const unassignedKey = `${UNASSIGNED_KEY}||${UNASSIGNED_MEM_GROUP}`;
  const unassignedActual = exactCounts.get(unassignedKey) || 0;
  exactCounts.delete(unassignedKey);
  rows.push({
    priorityGroupLabel: PRIORITY_GROUP_TABLE_LABELS[UNASSIGNED_KEY],
    memGroup: UNASSIGNED_MEM_GROUP,
    expected: null,
    actual: unassignedActual,
    difference: null,
    rowType: 'detail',
  });

  const otherUnassigned = employees.filter((e) => bucketKeyFor(e) === UNASSIGNED_KEY).length - unassignedActual;
  if (otherUnassigned > 0) {
    rows.push({
      priorityGroupLabel: PRIORITY_GROUP_TABLE_LABELS[UNASSIGNED_KEY],
      memGroup: 'Other',
      expected: null,
      actual: otherUnassigned,
      difference: null,
      rowType: 'detail',
    });
  }

  const actualGrandTotal = employees.length;
  rows.push({
    priorityGroupLabel: 'Grand Total',
    memGroup: null,
    expected: EXPECTED_GRAND_TOTAL,
    actual: actualGrandTotal,
    difference: actualGrandTotal - EXPECTED_GRAND_TOTAL,
    rowType: 'grand-total',
  });

  return {
    rows,
    actualGrandTotal,
    expectedGrandTotal: EXPECTED_GRAND_TOTAL,
    grandTotalDifference: actualGrandTotal - EXPECTED_GRAND_TOTAL,
  };
}
