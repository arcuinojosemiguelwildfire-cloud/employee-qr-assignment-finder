export interface EmployeeAssignment {
  id?: number | string;
  employee_number: string;
  name: string;
  email?: string;
  mem_group: string;
  mem_priority_group: string;
  tables: string[];
  // Backward compatibility alias for UI references
  employee_name?: string;
  created_at?: string;
  updated_at?: string;
  // Source traceability: the original 1-indexed row number in the "MEM Grouping"
  // Excel worksheet this record was parsed from. Never recomputed or reassigned
  // after import — sorting/searching/filtering in the UI must never touch this.
  // Undefined for manually added/edited records that did not come from an XLSX import.
  excel_row?: number;
}

export type ProcessQuestionsMap = Record<string, string[]>;

export interface ImportRowIssue {
  rowNumber: number;
  type: 'error' | 'warning';
  field?: string;
  message: string;
}

/** Outcome of a single source row after validation, used for full import diagnostics. */
export type ImportRowStatus = 'valid' | 'warning' | 'error';

/**
 * One entry per non-blank source row processed from the worksheet (whether or not
 * it ended up being imported), for the full row-by-row diagnostic preview table.
 */
export interface ImportRowPreview {
  excelRow: number;
  employeeNumber: string;
  name: string;
  memGroup: string;
  memPriorityGroup: string;
  tables: string[];
  status: ImportRowStatus;
  reasons: string[];
}

/** A source row that will NOT be imported, with the exact reason(s) it was excluded. */
export interface ExcludedRowInfo {
  excelRow: number;
  employeeNumber?: string;
  name?: string;
  reasons: string[];
}

export interface ImportPreviewData {
  fileName: string;
  sheetName: string;
  totalRowsDetected: number;
  validCount: number;
  warningsCount: number;
  errorsCount: number;
  /** Count of unique source rows that will NOT be imported (totalRowsDetected - validCount). */
  excludedCount: number;
  issues: ImportRowIssue[];
  validEmployees: EmployeeAssignment[];
  previewRows: EmployeeAssignment[];
  /** Every non-blank source row with its resolved status, in worksheet order. */
  allRows: ImportRowPreview[];
  /** Subset of allRows that were excluded, with human-readable reasons, for quick diagnosis. */
  excludedRows: ExcludedRowInfo[];
}

export interface EmployeeBackup {
  id: string;
  timestamp: string;
  employeeCount: number;
  fileName?: string;
  reason: string;
  data: EmployeeAssignment[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  warningsCount: number;
  timestamp: string;
  backupId?: string;
  error?: string;
}

export interface AppData {
  employees: EmployeeAssignment[];
  process_questions: ProcessQuestionsMap;
}

export interface LookupResponse {
  success: boolean;
  data?: EmployeeAssignment;
  questions?: string[];
  message?: string;
}
