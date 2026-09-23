import * as XLSX from 'xlsx';
import {
  EmployeeAssignment,
  ExcludedRowInfo,
  ImportPreviewData,
  ImportRowIssue,
  ImportRowPreview,
} from '../types';
import { normalizeTables } from '../data/seedEmployees';

const REQUIRED_SHEET_NAME = 'MEM Grouping';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * IMPORTANT — "Name + Email Address" source column format (deployed data)
 * ─────────────────────────────────────────────────────────────────────────
 * The client's "MEM Grouping" sheet packs FIVE logical fields into one
 * comma-separated cell, in this fixed POSITIONAL order:
 *
 *     [Name Part 1], [Name Part 2], [Location], [Position], [Email]
 *
 * Example: "Tiedra,Donnel Jun,PH-Makati,Public Affairs <asd.sas@ph.nestle.com>"
 *   -> Name Part 1 (1st comma segment): "Tiedra"
 *   -> Name Part 2 (2nd comma segment): "Donnel Jun"
 *   -> Location    (3rd comma segment): "PH-Makati"
 *   -> Position    (4th comma segment): "Public Affairs"
 *   -> Email       (after the last comma / inside "<...>"): "asd.sas@ph.nestle.com"
 *
 * The employee's display NAME is ONLY the first two comma-separated parts,
 * joined as "Name Part 1, Name Part 2" (e.g. "Tiedra, Donnel Jun").
 * Location and Position must NEVER be concatenated into the name — that was
 * the original bug this function fixes (the whole string, including
 * Location and Position, was previously ending up in the `name` field).
 * Any future change to this parser MUST preserve that separation.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Rules:
 * - The email is located first (still supports the deployed "<email>"
 *   suffix, a "(email)" suffix, or a bare embedded email as a fallback) and
 *   removed from the string before the comma-position split runs, so a
 *   Position without its own comma before the email (e.g. "Public Affairs
 *   <email>") doesn't get misread as part of the email segment.
 * - Whitespace around every extracted part is trimmed.
 * - If the exact format varies (missing location/position, no comma at all,
 *   no detectable email, extra commas in a free-text position, etc.) this
 *   degrades gracefully — it never throws — and simply omits what it
 *   couldn't determine.
 * - The original raw cell value is never mutated; this function only reads
 *   it and returns derived fields.
 * - Never invents an email.
 */
export function parseNameAndEmail(input: string): {
  name: string;
  email?: string;
  location?: string;
  position?: string;
  warning?: string;
} {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { name: '' };
  }

  let email: string | undefined;
  let remainder = trimmed;

  // 1. Preferred deployed format: email wrapped in "<...>" at the very end.
  const angleMatch = trimmed.match(/^(.*?)\s*<([^\s<>]+@[^\s<>]+)>\s*$/);
  if (angleMatch) {
    email = angleMatch[2].trim();
    remainder = angleMatch[1];
  } else {
    // 2. Or an email wrapped in "(...)" at the very end.
    const parenMatch = trimmed.match(/^(.*?)\s*\(([^\s()]+@[^\s()]+)\)\s*$/);
    if (parenMatch) {
      email = parenMatch[2].trim();
      remainder = parenMatch[1];
    } else {
      // 3. Fallback: a bare email embedded anywhere in the string.
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const embeddedMatch = trimmed.match(emailRegex);
      if (embeddedMatch) {
        email = embeddedMatch[1];
        remainder = trimmed.replace(embeddedMatch[1], '').replace(/[<>()[\]]/g, '');
      }
    }
  }

  // With the email removed, split the remainder by comma POSITION —
  // never by guessing keywords — to recover Name/Location/Position.
  const parts = remainder
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const namePart1 = parts[0] || '';
  const namePart2 = parts[1] || '';
  const name = [namePart1, namePart2].filter(Boolean).join(', ');
  const location = parts[2] || undefined;
  const position = parts.length > 3 ? parts.slice(3).join(', ') : undefined;

  if (!email) {
    return {
      name,
      location,
      position,
      warning: 'No email address detected in Name + Email Address column',
    };
  }

  return { name, email, location, position };
}

/**
 * Normalizes header string for comparison: trims whitespace, lowercases, collapses spaces.
 */
function normalizeHeaderName(header: any): string {
  if (header == null) return '';
  return String(header).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Finds the sheet corresponding to "MEM Grouping".
 * Case-insensitive match but strictly matching the sheet name.
 */
function findMemGroupingSheet(workbook: XLSX.WorkBook): string | null {
  for (const name of workbook.SheetNames) {
    if (name.trim().toLowerCase() === REQUIRED_SHEET_NAME.toLowerCase()) {
      return name;
    }
  }
  return null;
}

interface ColumnIndices {
  headerRowIndex: number;
  nameEmailCol: number;
  memGroupCol: number;
  memPriorityGroupCol: number;
  tableCol: number;
  empNumCol: number;
}

/**
 * Searches the first 15 rows of the sheet to locate the header row
 * and map the column indices (order-independent).
 */
function findHeaderColumns(sheetData: any[][]): ColumnIndices | { error: string } {
  const maxSearchRows = Math.min(sheetData.length, 15);

  for (let r = 0; r < maxSearchRows; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let nameEmailCol = -1;
    let memGroupCol = -1;
    let memPriorityGroupCol = -1;
    let tableCol = -1;
    let empNumCol = -1;

    for (let c = 0; c < row.length; c++) {
      const colText = normalizeHeaderName(row[c]);
      if (!colText) continue;

      if (
        // "Group MEM" (e.g. "Group 5: Efficiency") is a derived/combined
        // display column in the newer client XLSX structure. It must NEVER
        // be captured as MEM Group or MEM Priority Group — explicitly
        // skipped first, before either of those checks can run, so word
        // order in a substring match can never confuse the two.
        colText === 'group mem' ||
        colText.includes('group mem')
      ) {
        continue;
      } else if (
        colText === 'name + email address' ||
        colText === 'name + email' ||
        colText.includes('name + email') ||
        (colText.includes('name') && colText.includes('email'))
      ) {
        nameEmailCol = c;
      } else if (
        colText === 'mem priority group' ||
        colText === 'priority group' ||
        colText.includes('priority group')
      ) {
        memPriorityGroupCol = c;
      } else if (
        colText === 'mem group' ||
        colText.includes('mem group')
      ) {
        memGroupCol = c;
      } else if (
        // Covers both the legacy "Table #" header and the newer
        // "Table # - FINAL" header (startsWith already matches either).
        colText === 'table #' ||
        colText === 'table#' ||
        colText === 'table' ||
        colText.startsWith('table')
      ) {
        tableCol = c;
      } else if (
        colText === 'employee number' ||
        colText === 'employee no.' ||
        colText === 'employee no' ||
        colText === 'emp number' ||
        colText === 'emp no' ||
        colText.includes('employee number')
      ) {
        empNumCol = c;
      }
    }

    // Verify all 5 required columns were detected
    const missing: string[] = [];
    if (empNumCol === -1) missing.push('Employee Number');
    if (nameEmailCol === -1) missing.push('Name + Email Address');
    if (memGroupCol === -1) missing.push('MEM Group');
    if (memPriorityGroupCol === -1) missing.push('MEM Priority Group');
    if (tableCol === -1) missing.push('Table #');

    if (missing.length === 0) {
      return {
        headerRowIndex: r,
        nameEmailCol,
        memGroupCol,
        memPriorityGroupCol,
        tableCol,
        empNumCol,
      };
    }
  }

  return {
    error:
      'Required columns not found in MEM Grouping sheet. Please ensure columns: "Employee Number", "Name + Email Address", "MEM Group", "MEM Priority Group", and "Table #" are present.',
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Current "MEM Grouping" sheet column structure
 * ─────────────────────────────────────────────────────────────────────────
 *   1. Name + Email Address   -> parsed into name/email (see parseNameAndEmail)
 *   2. MEM Group              -> mem_group                (OPTIONAL)
 *   3. MEM Priority Group     -> mem_priority_group        (OPTIONAL)
 *   4. Group MEM              -> ignored (derived/combined display column,
 *                                 e.g. "Group 5: Efficiency" — never stored,
 *                                 never used as a substitute for the two
 *                                 separate fields above; see the explicit
 *                                 skip in findHeaderColumns)
 *   5. Table # - FINAL        -> tables                    (OPTIONAL)
 *   6. Employee Number        -> employee_number           (REQUIRED)
 *
 * MEM Group / MEM Priority Group / Table # are independent of one another
 * and independent of Employee Number's validity — the client's real data
 * has "Unassigned" employees with blank MEM Group + MEM Priority Group who
 * may or may not also have a Table Number. None of the three being blank
 * makes a row invalid; a row is only rejected for a missing/duplicate
 * Employee Number or a missing Name. Blank optional fields are stored as
 * `undefined` (or `[]` for tables), never rejected, never invented.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Safely parses an uploaded XLSX/XLS file buffer into an ImportPreviewData structure.
 * Never throws uncaught exceptions or exposes internal traces.
 */
export async function parseXlsxFile(
  file: File
): Promise<{ success: true; preview: ImportPreviewData } | { success: false; error: string }> {
  // 1. Extension & MIME verification
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
    return {
      success: false,
      error: 'Invalid file format. Please upload a valid Excel file (.xlsx or .xls).',
    };
  }

  // 2. File size boundary (limit to 30MB)
  if (file.size > 30 * 1024 * 1024) {
    return {
      success: false,
      error: 'File size exceeds the 30MB limit. Please upload a smaller Excel spreadsheet.',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Read with SheetJS - raw: false ensures formatted text string is captured to preserve leading zeros
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      raw: false,
      cellText: true,
      cellDates: true,
    });

    // 3. Strictly locate "MEM Grouping" sheet
    const targetSheetName = findMemGroupingSheet(workbook);
    if (!targetSheetName) {
      return {
        success: false,
        error: 'MEM Grouping sheet not found. Please verify that you uploaded the correct client Excel file.',
      };
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return {
        success: false,
        error: 'The MEM Grouping sheet is empty or corrupted.',
      };
    }

    // Convert sheet to row array using raw: false to retain cell string representations
    const sheetData: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });

    if (!sheetData || sheetData.length === 0) {
      return {
        success: false,
        error: 'The MEM Grouping sheet contains no data rows.',
      };
    }

    // 4. Locate header row & column mapping
    const headerResult = findHeaderColumns(sheetData);
    if ('error' in headerResult) {
      return {
        success: false,
        error: headerResult.error,
      };
    }

    const {
      headerRowIndex,
      nameEmailCol,
      memGroupCol,
      memPriorityGroupCol,
      tableCol,
      empNumCol,
    } = headerResult;

    const issues: ImportRowIssue[] = [];
    const validEmployees: EmployeeAssignment[] = [];
    const allRows: ImportRowPreview[] = []; // Every non-blank source row, whether imported or not
    const empNumberMap = new Map<string, number[]>(); // Tracks employee numbers -> row numbers for duplicate detection

    let nonBlankRowCount = 0;

    // 5. Parse data rows
    for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
      const row = sheetData[r];
      if (!Array.isArray(row)) continue;

      // Check if entire row is empty
      const isCompletelyEmpty = row.every(
        (cell) => cell == null || String(cell).trim() === ''
      );
      if (isCompletelyEmpty) continue;

      nonBlankRowCount++;
      const excelRowNum = r + 1; // 1-indexed Excel row

      // Extract raw cell values
      const rawEmpNo = row[empNumCol] != null ? String(row[empNumCol]).trim() : '';
      const rawNameEmail = row[nameEmailCol] != null ? String(row[nameEmailCol]).trim() : '';
      const rawMemGroup = row[memGroupCol] != null ? String(row[memGroupCol]).trim() : '';
      const rawPriorityGroup = row[memPriorityGroupCol] != null ? String(row[memPriorityGroupCol]).trim() : '';
      const rawTable = row[tableCol] != null ? String(row[tableCol]).trim() : '';

      let rowHasError = false;

      // Validate Employee Number
      if (!rawEmpNo) {
        issues.push({
          rowNumber: excelRowNum,
          type: 'error',
          field: 'Employee Number',
          message: `Row ${excelRowNum}: Employee Number is missing.`,
        });
        rowHasError = true;
      } else {
        // Track for duplicates
        const normalizedKey = rawEmpNo.toUpperCase();
        const existingRows = empNumberMap.get(normalizedKey) || [];
        existingRows.push(excelRowNum);
        empNumberMap.set(normalizedKey, existingRows);
      }

      // Parse Name and Email
      const { name, email, warning } = parseNameAndEmail(rawNameEmail);
      if (!name) {
        issues.push({
          rowNumber: excelRowNum,
          type: 'error',
          field: 'Name',
          message: `Row ${excelRowNum}: Name is missing.`,
        });
        rowHasError = true;
      } else if (warning) {
        issues.push({
          rowNumber: excelRowNum,
          type: 'warning',
          field: 'Email',
          message: `Row ${excelRowNum}: ${warning}`,
        });
      }

      // MEM Group, MEM Priority Group, and Table # are all OPTIONAL.
      // The client's data legitimately has "Unassigned" employees with no
      // MEM Group/Priority Group at all (some of whom still have a Table
      // Number, some of whom don't — the two are independent; neither
      // implies anything about the other). None of the three ever cause a
      // row to be rejected — only Employee Number (validated above) and
      // Name (validated above) can do that. This is intentional per the
      // client's real data shape, not an oversight.
      const parsedTables = normalizeTables(rawTable);
      // Deduplicate table entries preserving order
      const uniqueTables = Array.from(new Set(parsedTables));

      // If this row has no field errors, add to potential valid employees
      if (!rowHasError) {
        validEmployees.push({
          id: `import-${excelRowNum}-${Date.now()}`,
          employee_number: rawEmpNo, // Preserve exact string format including leading zeros
          name,
          employee_name: name,
          email: email || undefined,
          // Blank stays `undefined`, never an empty-string sentinel or an
          // invented value — see EmployeeAssignment in types.ts.
          mem_group: rawMemGroup || undefined,
          mem_priority_group: rawPriorityGroup || undefined,
          tables: uniqueTables,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Source traceability: the exact worksheet row this record came from.
          // Must never be recomputed from array position later.
          excel_row: excelRowNum,
        });
      }

      // Record this row in the full diagnostic list regardless of outcome, so the
      // preview can show every source row (Excel Row, fields, and status) and the
      // 230-vs-237-style discrepancy can always be explained from real parser output.
      const thisRowIssues = issues.filter((i) => i.rowNumber === excelRowNum);
      const rowStatus: 'valid' | 'warning' | 'error' = rowHasError
        ? 'error'
        : thisRowIssues.some((i) => i.type === 'warning')
        ? 'warning'
        : 'valid';
      allRows.push({
        excelRow: excelRowNum,
        employeeNumber: rawEmpNo,
        name: name || rawNameEmail || '',
        memGroup: rawMemGroup,
        memPriorityGroup: rawPriorityGroup,
        tables: uniqueTables,
        status: rowStatus,
        reasons: thisRowIssues.map((i) => i.message.replace(/^Row \d+:\s*/, '')),
      });
    }

    // 6. Duplicate Employee Number Analysis
    const duplicateEmpNumbers: string[] = [];
    empNumberMap.forEach((rows, empNo) => {
      if (rows.length > 1) {
        duplicateEmpNumbers.push(empNo);
        issues.push({
          rowNumber: rows[0],
          type: 'error',
          field: 'Employee Number',
          message: `Duplicate Employee Number: ${empNo} (found on Rows: ${rows.join(', ')})`,
        });

        // Every row sharing this duplicate number is excluded from import (not just the
        // first occurrence) — reflect that in the full row-by-row diagnostic list too,
        // so each duplicate row is individually traceable back to the exact Excel row.
        rows.forEach((rowNum) => {
          const entry = allRows.find((ar) => ar.excelRow === rowNum);
          if (entry) {
            entry.status = 'error';
            const otherRows = rows.filter((r) => r !== rowNum);
            entry.reasons.push(
              `Duplicate Employee Number "${empNo}" (also on Excel Row${
                otherRows.length > 1 ? 's' : ''
              }: ${otherRows.join(', ')})`
            );
          }
        });
      }
    });

    // If duplicate employee numbers exist, filter those duplicates out from validEmployees
    // so duplicate records are never imported!
    let finalValidEmployees = validEmployees;
    if (duplicateEmpNumbers.length > 0) {
      finalValidEmployees = validEmployees.filter(
        (emp) => !duplicateEmpNumbers.includes(emp.employee_number.toUpperCase())
      );
    }

    const errorsCount = issues.filter((i) => i.type === 'error').length;
    const warningsCount = issues.filter((i) => i.type === 'warning').length;

    // Row-granular (not issue-granular) accounting: every source row is either imported
    // or excluded — never both, never neither. This is what actually explains a
    // "237 detected, 230 imported" style gap, independent of how many issue lines
    // a single excluded row happens to generate.
    const excludedRows: ExcludedRowInfo[] = allRows
      .filter((r) => r.status === 'error')
      .map((r) => ({
        excelRow: r.excelRow,
        employeeNumber: r.employeeNumber || undefined,
        name: r.name || undefined,
        reasons: r.reasons,
      }));

    const preview: ImportPreviewData = {
      fileName: file.name,
      sheetName: targetSheetName,
      totalRowsDetected: nonBlankRowCount,
      validCount: finalValidEmployees.length,
      warningsCount,
      errorsCount,
      excludedCount: excludedRows.length,
      issues,
      validEmployees: finalValidEmployees,
      previewRows: finalValidEmployees.slice(0, 50),
      allRows,
      excludedRows,
    };

    return {
      success: true,
      preview,
    };
  } catch (err: any) {
    console.error('XLSX parse error:', err);
    return {
      success: false,
      error:
        'Unable to process the Excel file. Please verify that the file is a valid XLSX file.',
    };
  }
}
