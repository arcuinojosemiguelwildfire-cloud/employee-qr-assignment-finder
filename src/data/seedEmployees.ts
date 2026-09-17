import { EmployeeAssignment } from '../types';

export const INITIAL_EMPLOYEES: EmployeeAssignment[] = [
  {
    id: 1,
    employee_number: 'EMP00123',
    employee_name: 'Juan Dela Cruz',
    group_name: 'Group A',
    table_name: 'Table 12',
    room_name: 'Room 3',
    room_details: 'Main Hall • 2nd Floor',
    department: 'Commercial Operations',
  },
  {
    id: 2,
    employee_number: 'EMP00124',
    employee_name: 'Maria Santos',
    group_name: 'Group B',
    table_name: 'Table 4',
    room_name: 'Room 2',
    room_details: 'Synergy Suite • 1st Floor',
    department: 'Marketing & Brand',
  },
  {
    id: 3,
    employee_number: 'EMP00125',
    employee_name: 'Angelo Reyes',
    group_name: 'Group A',
    table_name: 'Table 12',
    room_name: 'Room 3',
    room_details: 'Main Hall • 2nd Floor',
    department: 'Customer Solutions',
  },
  {
    id: 4,
    employee_number: 'EMP00201',
    employee_name: 'Sofia Garcia',
    group_name: 'Group C',
    table_name: 'Table 8',
    room_name: 'Room 1',
    room_details: 'Innovation Hub • Ground Floor',
    department: 'People & Culture (HR)',
  },
  {
    id: 5,
    employee_number: 'EMP00342',
    employee_name: 'Michael Tan',
    group_name: 'Group B',
    table_name: 'Table 5',
    room_name: 'Room 2',
    room_details: 'Synergy Suite • 1st Floor',
    department: 'Supply Chain & Logistics',
  },
  {
    id: 6,
    employee_number: 'EMP00456',
    employee_name: 'Patricia Lim',
    group_name: 'Group D',
    table_name: 'Table 15',
    room_name: 'Room 4',
    room_details: 'Grand Ballroom • 3rd Floor',
    department: 'Finance & Strategy',
  },
  {
    id: 7,
    employee_number: 'EMP00578',
    employee_name: 'Rafael Gonzales',
    group_name: 'Group C',
    table_name: 'Table 9',
    room_name: 'Room 1',
    room_details: 'Innovation Hub • Ground Floor',
    department: 'Quality Assurance',
  },
  {
    id: 8,
    employee_number: 'EMP00789',
    employee_name: 'Elena Bautista',
    group_name: 'Group A',
    table_name: 'Table 11',
    room_name: 'Room 3',
    room_details: 'Main Hall • 2nd Floor',
    department: 'Technical & Engineering',
  },
  {
    id: 9,
    employee_number: 'EMP00890',
    employee_name: 'David Mendoza',
    group_name: 'Group D',
    table_name: 'Table 16',
    room_name: 'Room 4',
    room_details: 'Grand Ballroom • 3rd Floor',
    department: 'Information Technology',
  },
  {
    id: 10,
    employee_number: 'EMP00999',
    employee_name: 'Christine Flores',
    group_name: 'Group VIP',
    table_name: 'Table 1',
    room_name: 'Executive Lounge',
    room_details: 'Penthouse • 5th Floor',
    department: 'Executive Leadership',
  }
];

/**
 * Searches employee by ID or formatted number.
 * Returns only the single attendee's record (or undefined)
 * ensuring no bulk leak of employee records.
 */
export function findEmployeeByNumber(inputNumber: string): EmployeeAssignment | null {
  const cleaned = inputNumber.trim().toUpperCase().replace(/^#/, '');
  if (!cleaned) return null;

  // Exact match
  const exact = INITIAL_EMPLOYEES.find(
    (e) => e.employee_number.toUpperCase() === cleaned
  );
  if (exact) return exact;

  // Normalized prefix match (e.g. user entered "123" instead of "EMP00123" or "EMP123")
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
