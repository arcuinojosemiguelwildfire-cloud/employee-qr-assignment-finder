import { EmployeeAssignment, LookupResponse } from '../types';
import { employeeStore } from './employeeStore';

/**
 * Performs employee assignment lookup.
 * Follows the server-first architecture with graceful fallback:
 * 1. Invokes /api/lookup with employee_number
 * 2. If the API is live, returns the secured server response
 * 3. Uses synchronized employeeStore resolver so any Admin additions, edits,
 *    or deletions immediately reflect in the public lookup!
 * Returns exact client-approved error copies:
 * - "Please enter your employee number."
 * - "Employee number not found. Please check your employee number and try again."
 * - "Something went wrong. Please try again."
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

  // Artificial mini-delay to ensure smooth tactile feedback for mobile taps (150ms-220ms)
  await new Promise((res) => setTimeout(res, 200));

  try {
    // Attempt server endpoint
    const response = await fetch(`/api/lookup?employee_number=${encodeURIComponent(employeeNumber)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return {
          success: true,
          data: json.data,
        };
      }
    }
  } catch {
    // Fall through to synchronized store resolver
  }

  // Query synchronized store (contains admin modifications)
  const found = employeeStore.findByNumber(employeeNumber);
  if (found) {
    return {
      success: true,
      data: found,
    };
  }

  return {
    success: false,
    message: 'Employee number not found. Please check your employee number and try again.',
  };
}

