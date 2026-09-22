import { LookupResponse } from '../types';
import { employeeStore } from './employeeStore';
import { getProcessQuestions } from '../data/seedEmployees';

/**
 * Performs employee assignment lookup.
 * Resolves the employee assignment and corresponding process questions
 * based on the employee's MEM Priority Group.
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

  try {
    // Attempt server endpoint if configured
    const response = await fetch(
      `/api/lookup?employee_number=${encodeURIComponent(employeeNumber)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        const questions = json.questions || getProcessQuestions(json.data.mem_priority_group);
        return {
          success: true,
          data: json.data,
          questions,
        };
      }
    }
  } catch {
    // Fall through to synchronized store resolver
  }

  // Query synchronized store
  const found = employeeStore.findByNumber(employeeNumber);
  if (found) {
    const questions = getProcessQuestions(found.mem_priority_group);
    return {
      success: true,
      data: found,
      questions,
    };
  }

  return {
    success: false,
    message: 'Employee number not found. Please check your employee number and try again.',
  };
}
