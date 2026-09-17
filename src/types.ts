export interface EmployeeAssignment {
  id: number | string;
  employee_number: string;
  employee_name: string;
  group_name: string;
  table_name: string;
  room_name: string;
  room_details?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LookupResponse {
  success: boolean;
  data?: EmployeeAssignment;
  message?: string;
}
