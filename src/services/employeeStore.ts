import { EmployeeAssignment, EmployeeBackup } from '../types';
import { INITIAL_EMPLOYEES, normalizeDisplayName, normalizeTables } from '../data/seedEmployees';

const STORAGE_KEY = 'nestle_mem_assignments_v2';
const BACKUPS_KEY = 'nestle_mem_backups_v2';

// Custom event to notify components across the app when assignments change
const STORE_UPDATE_EVENT = 'mem_employee_assignments_updated';

/**
 * Self-healing, non-destructive migration for already-deployed records whose
 * `name`/`employee_name` was corrupted by a historical XLSX parsing bug
 * (Location/Position leaking into the name — see normalizeDisplayName for
 * the full explanation). Runs every time employees are loaded from storage.
 *
 * Only the name-like fields are ever touched; employee_number, email,
 * mem_group, mem_priority_group, tables, excel_row, id, timestamps, etc. are
 * preserved exactly as-is. If nothing needed fixing, the original array
 * reference is returned untouched and nothing is re-written to storage.
 */
function migrateMalformedNames(employees: EmployeeAssignment[]): {
  list: EmployeeAssignment[];
  changed: boolean;
} {
  let changed = false;

  const list = employees.map((emp) => {
    const fixedName = normalizeDisplayName(emp.name || '');
    const fixedEmployeeName =
      emp.employee_name != null ? normalizeDisplayName(emp.employee_name) : emp.employee_name;

    if (fixedName === emp.name && fixedEmployeeName === emp.employee_name) {
      return emp;
    }

    changed = true;
    return { ...emp, name: fixedName, employee_name: fixedEmployeeName };
  });

  return { list: changed ? list : employees, changed };
}

function loadEmployees(): EmployeeAssignment[] {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const { list, changed } = migrateMalformedNames(parsed);
        if (changed) {
          // Repaired at least one malformed name — persist the correction so
          // it's fixed permanently, not just for this render.
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          } catch (err) {
            console.error('Failed to persist employee name migration', err);
          }
        }
        return list;
      }
    }
  } catch (err) {
    console.error('Failed to load employees from storage', err);
  }

  // First time initialization with seed data
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  } catch {}
  return INITIAL_EMPLOYEES;
}

function saveEmployees(employees: EmployeeAssignment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    window.dispatchEvent(new CustomEvent(STORE_UPDATE_EVENT, { detail: employees }));
  } catch (err) {
    console.error('Failed to save employees to storage', err);
  }
}

function loadBackups(): EmployeeBackup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load backups from storage', err);
  }
  return [];
}

function saveBackups(backups: EmployeeBackup[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep most recent 10 backups to respect storage limits
    const trimmed = backups.slice(0, 10);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save backups to storage', err);
  }
}

/**
 * Formats a timestamp into a safe backup filename, e.g. "employees.backup-2026-09-21-1745.json"
 */
function generateBackupFilename(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `employees.backup-${year}-${month}-${day}-${hours}${mins}.json`;
}

export const employeeStore = {
  /**
   * Retrieves all current employee assignments
   */
  getAll(): EmployeeAssignment[] {
    return loadEmployees();
  },

  /**
   * Finds a single employee by employee number (case-insensitive & numeric fallback)
   */
  findByNumber(inputNumber: string): EmployeeAssignment | null {
    const cleaned = inputNumber.trim().toUpperCase().replace(/^#/, '');
    if (!cleaned) return null;

    const list = loadEmployees();

    // 1. Exact match
    const exact = list.find((e) => e.employee_number.toUpperCase() === cleaned);
    if (exact) return exact;

    // 2. Numeric suffix / equivalence match (e.g. "11248494")
    const numericOnly = cleaned.replace(/\D/g, '');
    if (numericOnly) {
      const matchNumeric = list.find((e) => {
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
  },

  /**
   * Adds a new employee assignment with uniqueness validation.
   * Focuses purely on client fields: Employee Number, Name, Email, MEM Group, MEM Priority Group, Tables.
   * No room fields.
   */
  add(data: {
    employee_number: string;
    name: string;
    email?: string;
    // Optional — the client's data legitimately has "Unassigned" employees
    // with blank MEM Group / MEM Priority Group (some still with a Table
    // Number, some without; the two are independent). Never require these.
    mem_group?: string;
    mem_priority_group?: string;
    tables?: string[] | string;
  }): { success: boolean; data?: EmployeeAssignment; error?: string } {
    const list = loadEmployees();
    const cleanNumber = data.employee_number.trim().toUpperCase().replace(/^#/, '');

    if (!cleanNumber) {
      return { success: false, error: 'Employee number cannot be empty.' };
    }
    if (!data.name.trim()) {
      return { success: false, error: 'Name cannot be empty.' };
    }

    const parsedTables = normalizeTables(data.tables);

    // Check uniqueness of employee number
    const exists = list.some(
      (e) => e.employee_number.toUpperCase() === cleanNumber
    );
    if (exists) {
      return {
        success: false,
        error: `Employee number "${cleanNumber}" is already registered.`,
      };
    }

    const now = new Date().toISOString();
    const newEmployee: EmployeeAssignment = {
      id: Date.now(),
      employee_number: cleanNumber,
      name: data.name.trim(),
      employee_name: data.name.trim(),
      email: data.email?.trim() || undefined,
      mem_group: data.mem_group?.trim() || undefined,
      mem_priority_group: data.mem_priority_group?.trim() || undefined,
      tables: parsedTables,
      created_at: now,
      updated_at: now,
    };

    const updated = [newEmployee, ...list];
    saveEmployees(updated);
    return { success: true, data: newEmployee };
  },

  /**
   * Updates an existing employee assignment.
   * Room completely removed.
   */
  update(
    id: number | string,
    data: {
      employee_number: string;
      name: string;
      email?: string;
      // Optional — see the matching comment on add() above.
      mem_group?: string;
      mem_priority_group?: string;
      tables?: string[] | string;
    }
  ): { success: boolean; data?: EmployeeAssignment; error?: string } {
    const list = loadEmployees();
    const index = list.findIndex((e) => String(e.id) === String(id));

    if (index === -1) {
      return { success: false, error: 'Employee record not found.' };
    }

    const cleanNumber = data.employee_number.trim().toUpperCase().replace(/^#/, '');
    if (!cleanNumber) {
      return { success: false, error: 'Employee number cannot be empty.' };
    }
    if (!data.name.trim()) {
      return { success: false, error: 'Name cannot be empty.' };
    }

    const parsedTables = normalizeTables(data.tables);

    // Check if new employee number conflicts with someone else
    const conflict = list.some(
      (e, idx) => idx !== index && e.employee_number.toUpperCase() === cleanNumber
    );
    if (conflict) {
      return {
        success: false,
        error: `Employee number "${cleanNumber}" is already used by another employee.`,
      };
    }

    const updatedEmployee: EmployeeAssignment = {
      ...list[index],
      employee_number: cleanNumber,
      name: data.name.trim(),
      employee_name: data.name.trim(),
      email: data.email?.trim() || undefined,
      mem_group: data.mem_group?.trim() || undefined,
      mem_priority_group: data.mem_priority_group?.trim() || undefined,
      tables: parsedTables,
      updated_at: new Date().toISOString(),
    };

    const updatedList = [...list];
    updatedList[index] = updatedEmployee;
    saveEmployees(updatedList);

    return { success: true, data: updatedEmployee };
  },

  /**
   * Deletes an employee record
   */
  delete(id: number | string): { success: boolean; error?: string } {
    const list = loadEmployees();
    const filtered = list.filter((e) => String(e.id) !== String(id));

    if (filtered.length === list.length) {
      return { success: false, error: 'Employee record not found.' };
    }

    saveEmployees(filtered);
    return { success: true };
  },

  /**
   * Resets the dataset back to original client seed data
   */
  resetToDefaults(): EmployeeAssignment[] {
    this.createBackup('Before reset to defaults');
    saveEmployees(INITIAL_EMPLOYEES);
    return INITIAL_EMPLOYEES;
  },

  /**
   * Creates a timestamped backup of the current employee JSON dataset.
   * Preserves previous state before import or modification.
   */
  createBackup(reason: string, sourceFileName?: string): EmployeeBackup {
    const current = loadEmployees();
    const now = new Date();
    const backup: EmployeeBackup = {
      id: `backup-${now.getTime()}`,
      timestamp: now.toISOString(),
      employeeCount: current.length,
      fileName: sourceFileName || generateBackupFilename(now),
      reason,
      data: JSON.parse(JSON.stringify(current)),
    };

    const backups = loadBackups();
    const updatedBackups = [backup, ...backups];
    saveBackups(updatedBackups);
    return backup;
  },

  /**
   * Retrieves all stored timestamped backups
   */
  getBackups(): EmployeeBackup[] {
    return loadBackups();
  },

  /**
   * Restores employee data from a specific backup
   */
  restoreBackup(backupId: string): { success: boolean; count: number; error?: string } {
    const backups = loadBackups();
    const target = backups.find((b) => b.id === backupId);
    if (!target) {
      return { success: false, count: 0, error: 'Backup not found.' };
    }

    // Create a safety backup of current data before restoring
    this.createBackup(`Before restoring backup (${target.fileName || target.id})`);

    saveEmployees(target.data);
    return { success: true, count: target.data.length };
  },

  /**
   * Deletes a specific backup
   */
  deleteBackup(backupId: string): { success: boolean } {
    const backups = loadBackups();
    const filtered = backups.filter((b) => b.id !== backupId);
    saveBackups(filtered);
    return { success: true };
  },

  /**
   * Atomic batch import of employees:
   * 1. Generates and validates complete JSON first.
   * 2. Creates a timestamped backup of the current dataset.
   * 3. Writes the new JSON dataset safely.
   * 4. Verifies the written JSON can be parsed cleanly.
   * 5. Dispatches real-time synchronization event.
   */
  importBatch(
    newEmployees: EmployeeAssignment[],
    metadata?: { fileName?: string }
  ): { success: boolean; count: number; backupId?: string; error?: string } {
    if (!Array.isArray(newEmployees) || newEmployees.length === 0) {
      return { success: false, count: 0, error: 'No valid employee records to import.' };
    }

    try {
      // 1. Validation check on all records. MEM Group / MEM Priority Group
      // are intentionally NOT checked here — the client's data legitimately
      // has "Unassigned" employees with both blank. Only Employee Number
      // and Name are mandatory.
      for (let i = 0; i < newEmployees.length; i++) {
        const item = newEmployees[i];
        if (!item.employee_number || !item.name) {
          return {
            success: false,
            count: 0,
            error: `Import aborted: Record ${i + 1} is missing mandatory fields.`,
          };
        }
      }

      // 2. Pre-import backup creation
      const backup = this.createBackup(
        `Pre-import backup for ${metadata?.fileName || 'XLSX batch import'}`,
        metadata?.fileName
      );

      // 3. Serialize and perform atomic write
      const serialized = JSON.stringify(newEmployees);
      localStorage.setItem(STORAGE_KEY, serialized);

      // 4. Verify integrity of written JSON
      const verifiedRaw = localStorage.getItem(STORAGE_KEY);
      if (!verifiedRaw) {
        throw new Error('Verification failed: Storage key is empty after write.');
      }
      const verifiedList = JSON.parse(verifiedRaw);
      if (!Array.isArray(verifiedList) || verifiedList.length !== newEmployees.length) {
        // Rollback to backup immediately if verification fails
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.data));
        throw new Error('Integrity mismatch detected. Rolled back to previous state.');
      }

      // 5. Notify all subscribing components
      window.dispatchEvent(
        new CustomEvent(STORE_UPDATE_EVENT, { detail: verifiedList })
      );

      return {
        success: true,
        count: verifiedList.length,
        backupId: backup.id,
      };
    } catch (err: any) {
      console.error('Batch import failed:', err);
      return {
        success: false,
        count: 0,
        error: err.message || 'An error occurred while saving the employee data.',
      };
    }
  },

  /**
   * Generates a downloadable JSON file blob for the current employee dataset
   */
  exportJson(): string {
    const employees = loadEmployees();
    return JSON.stringify(employees, null, 2);
  },

  /**
   * Subscribe to store updates
   */
  subscribe(callback: (employees: EmployeeAssignment[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<EmployeeAssignment[]>;
      callback(customEvent.detail || loadEmployees());
    };
    window.addEventListener(STORE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(STORE_UPDATE_EVENT, handler);
  },
};
