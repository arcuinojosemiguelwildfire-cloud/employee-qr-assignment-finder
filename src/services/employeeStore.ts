import { EmployeeAssignment } from '../types';
import { INITIAL_EMPLOYEES } from '../data/seedEmployees';

const STORAGE_KEY = 'event_employee_assignments_v1';

// Custom event to notify components across the app when assignments change
const STORE_UPDATE_EVENT = 'employee_assignments_updated';

function loadEmployees(): EmployeeAssignment[] {
  if (typeof window === 'undefined') return INITIAL_EMPLOYEES;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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

    // 2. Numeric suffix / equivalence match (e.g. "123" matches "EMP00123")
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
   * Adds a new employee assignment with uniqueness validation
   */
  add(data: {
    employee_number: string;
    employee_name: string;
    group_name: string;
    table_name: string;
    room_name: string;
    room_details?: string;
    department?: string;
  }): { success: boolean; data?: EmployeeAssignment; error?: string } {
    const list = loadEmployees();
    const cleanNumber = data.employee_number.trim().toUpperCase().replace(/^#/, '');

    if (!cleanNumber) {
      return { success: false, error: 'Employee number cannot be empty.' };
    }
    if (!data.employee_name.trim()) {
      return { success: false, error: 'Employee name cannot be empty.' };
    }
    if (!data.group_name.trim()) {
      return { success: false, error: 'Group cannot be empty.' };
    }
    if (!data.table_name.trim()) {
      return { success: false, error: 'Table cannot be empty.' };
    }
    if (!data.room_name.trim()) {
      return { success: false, error: 'Room cannot be empty.' };
    }

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
      employee_name: data.employee_name.trim(),
      group_name: data.group_name.trim(),
      table_name: data.table_name.trim(),
      room_name: data.room_name.trim(),
      room_details: data.room_details?.trim() || undefined,
      department: data.department?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    const updated = [newEmployee, ...list];
    saveEmployees(updated);
    return { success: true, data: newEmployee };
  },

  /**
   * Updates an existing employee assignment
   */
  update(
    id: number | string,
    data: {
      employee_number: string;
      employee_name: string;
      group_name: string;
      table_name: string;
      room_name: string;
      room_details?: string;
      department?: string;
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
    if (!data.employee_name.trim()) {
      return { success: false, error: 'Employee name cannot be empty.' };
    }
    if (!data.group_name.trim()) {
      return { success: false, error: 'Group cannot be empty.' };
    }
    if (!data.table_name.trim()) {
      return { success: false, error: 'Table cannot be empty.' };
    }
    if (!data.room_name.trim()) {
      return { success: false, error: 'Room cannot be empty.' };
    }

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
      employee_name: data.employee_name.trim(),
      group_name: data.group_name.trim(),
      table_name: data.table_name.trim(),
      room_name: data.room_name.trim(),
      room_details: data.room_details?.trim() || undefined,
      department: data.department?.trim() || undefined,
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
    saveEmployees(INITIAL_EMPLOYEES);
    return INITIAL_EMPLOYEES;
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
