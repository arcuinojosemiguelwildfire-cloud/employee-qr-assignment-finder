<?php
/**
 * Nestlé MEM 2026 - Lookup API
 * Handles server-side lookup securely via prepared PDO statements.
 * Returns attendee assignment and display-only process questions.
 * Room has been completely removed.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Process questions mapping
$processQuestionsMap = [
    'Growth' => [
        'Where can we unlock more consumption, and how can we create more value to the consumers?',
        'From your perspective, what should we do differently to accelerate growth?'
    ],
    'Efficiency' => [
        'What are we doing today (ie. process, ways of working, systems) that we should address (remove/simplify/automate) to help us operate more efficiency, and drive faster decision making?'
    ],
    'DT' => [
        'As we build a more digitally agile organization, what key shifts do we need to adopt?',
        'What has been your biggest / most recent digital “aha” moment this year?'
    ],
    'HP Teams' => [
        'As leaders, how do we drive high-performance with high level of ownership & greater sense of urgency, across teams?'
    ]
];

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

$cleanNumber = strtoupper(ltrim($employeeNumber, '#'));

try {
    $stmt = $pdo->prepare(
        'SELECT id, employee_number, name, email, mem_group, mem_priority_group, tables 
         FROM employees 
         WHERE UPPER(employee_number) = :emp_num 
         LIMIT 1'
    );
    $stmt->execute(['emp_num' => $cleanNumber]);
    $employee = $stmt->fetch();

    if ($employee) {
        $tables = json_decode($employee['tables'] ?? '[]', true);
        if (!is_array($tables)) {
            $tables = array_filter(array_map('trim', explode(',', (string)$employee['tables'])));
        }

        $priorityGroup = trim((string)$employee['mem_priority_group']);
        $questions = [];
        foreach ($processQuestionsMap as $key => $qList) {
            if (strcasecmp($key, $priorityGroup) === 0) {
                $questions = $qList;
                break;
            }
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => (int)$employee['id'],
                'employee_number' => (string)$employee['employee_number'],
                'name' => (string)$employee['name'],
                'email' => $employee['email'] ? (string)$employee['email'] : null,
                'mem_group' => (string)$employee['mem_group'],
                'mem_priority_group' => (string)$employee['mem_priority_group'],
                'tables' => $tables,
            ],
            'questions' => $questions
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Employee number not found. Please check your employee number and try again.'
    ], JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong. Please try again.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
