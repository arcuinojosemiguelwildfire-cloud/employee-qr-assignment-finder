<?php
/**
 * Employee QR Assignment Finder - Lookup API
 * Handles server-side lookup securely via prepared PDO statements.
 */
declare(strict_types=1);

// Set clean JSON response and CORS
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Accept employee_number from GET param or POST JSON body
$rawInput = '';
if (isset($_GET['employee_number'])) {
    $rawInput = (string)$_GET['employee_number'];
} else {
    $body = json_decode(file_get_contents('php://input'), true);
    if (is_array($body) && isset($body['employee_number'])) {
        $rawInput = (string)$body['employee_number'];
    }
}

$employeeNumber = trim($rawInput);

// Validation
if ($employeeNumber === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please enter your employee number.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Clean formatting (strip leading '#' and uppercase)
$cleanNumber = strtoupper(ltrim($employeeNumber, '#'));

try {
    // Prepared statement to prevent SQL injection
    $stmt = $pdo->prepare(
        'SELECT id, employee_number, employee_name, group_name, table_name, room_name, room_details, department 
         FROM employees 
         WHERE UPPER(employee_number) = :emp_num 
         LIMIT 1'
    );
    $stmt->execute(['emp_num' => $cleanNumber]);
    $employee = $stmt->fetch();

    if ($employee) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => (int)$employee['id'],
                'employee_number' => (string)$employee['employee_number'],
                'employee_name' => (string)$employee['employee_name'],
                'group_name' => (string)$employee['group_name'],
                'table_name' => (string)$employee['table_name'],
                'room_name' => (string)$employee['room_name'],
                'room_details' => $employee['room_details'] ? (string)$employee['room_details'] : null,
                'department' => $employee['department'] ? (string)$employee['department'] : null,
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Employee not found
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Employee number not found. Please check your employee number and try again.'
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    // Generic sanitized error message without debug leakage
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong. Please try again.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
