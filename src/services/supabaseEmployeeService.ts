import { supabase, isSupabaseConfigured } from './supabaseClient';
import { EmployeeAssignment } from '../types';

/**
 * Shared (Supabase-backed) employee data operations — the future source of
 * truth once configured, replacing per-device localStorage.
 *
 * IMPORTANT — public vs admin surface:
 * `findByNumber` calls the public `lookup_employee_by_number` RPC (no admin
 * key, no email in the result — see supabase/migrations/001_initial_schema.sql).
 * `getAll` / `add` / `update` / `delete` / `importBatch` call admin-only RPCs
 * that require the admin passphrase (the SAME "admin2026"/"admin123" already
 * used by the existing login screen — see adminAuth.ts and the migration
 * SQL's PHASE 5 design note for why this bridge exists and its limits).
 *
 * Every function here can throw (network error, RPC error, Supabase not
 * configured). Callers (lookupService, AdminDashboard, XlsxImportModal) are
 * expected to catch and fall back to the local employeeStore where the
 * migration plan calls for that (see PHASE 11: Supabase is primary, local
 * storage is a fallback for when Supabase is unreachable — not the other
 * way around).
 */

function assertConfigured(): void {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing).');
  }
}

/** Shape returned by the public RPC — deliberately has no `email`. */
interface PublicLookupRow {
  employee_number: string;
  name: string;
  mem_group: string;
  mem_priority_group: string;
  tables: string[] | null;
  excel_row: number | null;
}

/** Shape of a full row from the admin RPCs (mirrors the `employees` table). */
interface AdminEmployeeRow {
  id: number;
  employee_number: string;
  name: string;
  email: string | null;
  mem_group: string;
  mem_priority_group: string;
  tables: string[] | null;
  excel_row: number | null;
  created_at: string;
  updated_at: string;
}

function toEmployeeAssignment(row: AdminEmployeeRow | PublicLookupRow, id?: number | string): EmployeeAssignment {
  return {
    id: id ?? ('id' in row ? row.id : row.employee_number),
    employee_number: row.employee_number,
    name: row.name,
    employee_name: row.name,
    email: 'email' in row ? row.email || undefined : undefined,
    mem_group: row.mem_group,
    mem_priority_group: row.mem_priority_group,
    tables: row.tables || [],
    excel_row: row.excel_row ?? undefined,
    created_at: 'created_at' in row ? row.created_at : undefined,
    updated_at: 'updated_at' in row ? row.updated_at : undefined,
  };
}

export const supabaseEmployeeService = {
  /**
   * Public lookup — the ONLY Supabase call the public search screen makes.
   * Retrieves exactly one matching employee (or null). Never fetches the
   * full table. Never returns email.
   */
  async findByNumber(inputNumber: string): Promise<EmployeeAssignment | null> {
    assertConfigured();
    const { data, error } = await supabase!.rpc('lookup_employee_by_number', {
      p_employee_number: inputNumber,
    });
    if (error) throw error;
    const rows = (data || []) as PublicLookupRow[];
    if (rows.length === 0) return null;
    return toEmployeeAssignment(rows[0]);
  },

  /**
   * Admin: full employee list for the Admin Dashboard table.
   */
  async getAll(adminKey: string): Promise<EmployeeAssignment[]> {
    assertConfigured();
    const { data, error } = await supabase!.rpc('admin_list_employees', {
      p_admin_key: adminKey,
    });
    if (error) throw error;
    return ((data || []) as AdminEmployeeRow[]).map((row) => toEmployeeAssignment(row, row.id));
  },

  /**
   * Admin: create a new employee record.
   */
  async add(
    adminKey: string,
    data: {
      employee_number: string;
      name: string;
      email?: string;
      mem_group: string;
      mem_priority_group: string;
      tables: string[];
    }
  ): Promise<{ success: boolean; data?: EmployeeAssignment; error?: string }> {
    assertConfigured();
    const { data: result, error } = await supabase!.rpc('admin_upsert_employee', {
      p_admin_key: adminKey,
      p_original_employee_number: null,
      p_employee_number: data.employee_number,
      p_name: data.name,
      p_email: data.email || null,
      p_mem_group: data.mem_group,
      p_mem_priority_group: data.mem_priority_group,
      p_tables: data.tables,
      p_excel_row: null,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: toEmployeeAssignment(result as AdminEmployeeRow, (result as AdminEmployeeRow).id) };
  },

  /**
   * Admin: update an existing employee, identified by its CURRENT
   * employee_number (`originalEmployeeNumber`), which may itself be
   * changing as part of the edit.
   */
  async update(
    adminKey: string,
    originalEmployeeNumber: string,
    data: {
      employee_number: string;
      name: string;
      email?: string;
      mem_group: string;
      mem_priority_group: string;
      tables: string[];
      excel_row?: number;
    }
  ): Promise<{ success: boolean; data?: EmployeeAssignment; error?: string }> {
    assertConfigured();
    const { data: result, error } = await supabase!.rpc('admin_upsert_employee', {
      p_admin_key: adminKey,
      p_original_employee_number: originalEmployeeNumber,
      p_employee_number: data.employee_number,
      p_name: data.name,
      p_email: data.email || null,
      p_mem_group: data.mem_group,
      p_mem_priority_group: data.mem_priority_group,
      p_tables: data.tables,
      p_excel_row: data.excel_row ?? null,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: toEmployeeAssignment(result as AdminEmployeeRow, (result as AdminEmployeeRow).id) };
  },

  /**
   * Admin: delete by employee_number.
   */
  async delete(adminKey: string, employeeNumber: string): Promise<{ success: boolean; error?: string }> {
    assertConfigured();
    const { data, error } = await supabase!.rpc('admin_delete_employee', {
      p_admin_key: adminKey,
      p_employee_number: employeeNumber,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Employee record not found.' };
    return { success: true };
  },

  /**
   * Admin: bulk XLSX import — upserts the whole validated batch in ONE
   * database round trip (the RPC does it in a single SQL statement, so it
   * is atomic — either the whole batch lands or none of it does).
   * employee_number is the conflict/upsert key, as required.
   */
  async importBatch(
    adminKey: string,
    employees: EmployeeAssignment[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    assertConfigured();
    if (!Array.isArray(employees) || employees.length === 0) {
      return { success: false, count: 0, error: 'No valid employee records to import.' };
    }

    const payload = employees.map((e) => ({
      employee_number: e.employee_number,
      name: e.name,
      email: e.email || null,
      mem_group: e.mem_group,
      mem_priority_group: e.mem_priority_group,
      tables: e.tables || [],
      excel_row: e.excel_row ?? null,
    }));

    const { data, error } = await supabase!.rpc('admin_import_batch', {
      p_admin_key: adminKey,
      p_employees: payload,
    });
    if (error) return { success: false, count: 0, error: error.message };

    const upsertedCount = Array.isArray(data) && data.length > 0 ? data[0].upserted_count : 0;

    // Verify the count Supabase reports matches what we sent, per the
    // "verify the resulting count before reporting success" requirement.
    if (upsertedCount !== employees.length) {
      return {
        success: false,
        count: upsertedCount,
        error: `Expected to import ${employees.length} records but Supabase confirmed ${upsertedCount}.`,
      };
    }

    return { success: true, count: upsertedCount };
  },
};
