import { LookupResponse } from '../types';
import { employeeStore } from './employeeStore';
import { supabaseEmployeeService } from './supabaseEmployeeService';
import { appSettingsService } from './appSettingsService';
import { isSupabaseConfigured } from './supabaseClient';
import { getProcessQuestions } from '../data/seedEmployees';

/**
 * Performs employee assignment lookup.
 *
 * PHASE 8 (Supabase migration): Supabase is now the primary, shared source
 * of truth — this is what makes lookup work identically across every
 * device (desktop, any phone) instead of being isolated per-browser via
 * localStorage. The old `/api/lookup` fetch attempt is gone; no such
 * endpoint ever existed in this deployment (no vercel.json, no api/ dir),
 * so that call always failed silently and fell through anyway.
 *
 * Fallback behavior (PHASE 11): if Supabase is not configured yet, or a
 * request to it fails (e.g. a transient network error), this falls back to
 * the local employeeStore (localStorage) so the app keeps working in a
 * degraded, single-device mode rather than breaking outright. Once
 * Supabase IS configured and reachable, it is always tried FIRST and is
 * authoritative — the app does not fall back to the single seed employee
 * just because a given device's localStorage happens to be empty.
 *
 * Client-approved error copies:
 * - "Please enter your employee number."
 * - "Employee number not found. Please check your employee number and try again."
 */
export async function lookupEmployeeAssignment(
  rawEmployeeNumber: string
): Promise<LookupResponse> {
  const employeeNumber = rawEmployeeNumber.trim();

  if (!employeeNumber) {
    return {
      success: false,
      message: 'Please enter your employee number.',
    };
  }

  // Tactile feedback mini-delay for mobile screen transitions (180ms)
  await new Promise((res) => setTimeout(res, 180));

  if (isSupabaseConfigured) {
    try {
      // Fetched together (not sequentially) to avoid an extra round trip on
      // every search. getTbcMode() never throws — it degrades internally —
      // so a failure here can only come from findByNumber().
      const [found, tbcMode] = await Promise.all([
        supabaseEmployeeService.findByNumber(employeeNumber),
        appSettingsService.getTbcMode(),
      ]);
      if (found) {
        const questions = getProcessQuestions(found.mem_priority_group);
        return {
          success: true,
          data: found,
          questions,
          tbcMode,
        };
      }
      // Supabase responded successfully but found no match — this is a
      // real "not found," not a fallback situation. Do NOT fall through to
      // localStorage here, or a stale/local-only record could incorrectly
      // "resurrect" an employee number Supabase has already told us
      // doesn't exist in the shared dataset.
      return {
        success: false,
        message: 'Employee number not found. Please check your employee number and try again.',
      };
    } catch (err) {
      // Supabase unreachable/misconfigured at runtime — degrade to local
      // store rather than hard-failing the whole lookup.
      console.error('Supabase lookup failed, falling back to local store:', err);
    }
  }

  // Fallback: local synchronized store (localStorage)
  const found = employeeStore.findByNumber(employeeNumber);
  if (found) {
    const questions = getProcessQuestions(found.mem_priority_group);
    const tbcMode = await appSettingsService.getTbcMode();
    return {
      success: true,
      data: found,
      questions,
      tbcMode,
    };
  }

  return {
    success: false,
    message: 'Employee number not found. Please check your employee number and try again.',
  };
}
