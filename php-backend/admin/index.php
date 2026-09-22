<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
requireAdminAuth();

require_once __DIR__ . '/../db.php';

$message = null;
$error = null;

// Normalizer for tables in PHP
function normalizeTablesPhp(string $input): string {
    $trimmed = trim($input);
    if ($trimmed === '') return '[]';
    
    // If Table 3,6,8,9,12 format
    if (preg_match('/^Table\s+([0-9,\s]+)$/i', $trimmed, $matches)) {
        $nums = array_filter(array_map('trim', explode(',', $matches[1])));
        $out = array_map(fn($n) => "Table {$n}", $nums);
        return json_encode(array_values($out), JSON_UNESCAPED_UNICODE);
    }

    if (strpos($trimmed, ',') !== false || strpos($trimmed, ';') !== false) {
        $parts = array_filter(array_map('trim', preg_split('/[,;]/', $trimmed)));
        $out = array_map(function($p) {
            return ctype_digit($p) ? "Table {$p}" : $p;
        }, $parts);
        return json_encode(array_values($out), JSON_UNESCAPED_UNICODE);
    }

    if (ctype_digit($trimmed)) {
        return json_encode(["Table {$trimmed}"], JSON_UNESCAPED_UNICODE);
    }

    return json_encode([$trimmed], JSON_UNESCAPED_UNICODE);
}

// Handle Actions (Add, Edit, Delete)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $empNumber = strtoupper(trim((string)($_POST['employee_number'] ?? '')));
        $name = trim((string)($_POST['name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? '')) ?: null;
        $memGroup = trim((string)($_POST['mem_group'] ?? ''));
        $memPriorityGroup = trim((string)($_POST['mem_priority_group'] ?? ''));
        $tablesRaw = trim((string)($_POST['tables'] ?? ''));

        if ($empNumber === '' || $name === '' || $memGroup === '' || $memPriorityGroup === '' || $tablesRaw === '') {
            $error = 'Please fill out all required fields.';
        } else {
            try {
                $tablesJson = normalizeTablesPhp($tablesRaw);
                $stmt = $pdo->prepare('INSERT INTO employees (employee_number, name, email, mem_group, mem_priority_group, tables) VALUES (:num, :name, :email, :grp, :pri, :tbl)');
                $stmt->execute([
                    'num' => $empNumber,
                    'name' => $name,
                    'email' => $email,
                    'grp' => $memGroup,
                    'pri' => $memPriorityGroup,
                    'tbl' => $tablesJson,
                ]);
                $message = 'Employee added successfully.';
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    $error = "Employee number '{$empNumber}' already exists.";
                } else {
                    $error = 'Failed to add employee. Please try again.';
                }
            }
        }
    } elseif ($action === 'edit') {
        $id = (int)($_POST['id'] ?? 0);
        $empNumber = strtoupper(trim((string)($_POST['employee_number'] ?? '')));
        $name = trim((string)($_POST['name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? '')) ?: null;
        $memGroup = trim((string)($_POST['mem_group'] ?? ''));
        $memPriorityGroup = trim((string)($_POST['mem_priority_group'] ?? ''));
        $tablesRaw = trim((string)($_POST['tables'] ?? ''));

        if ($id <= 0 || $empNumber === '' || $name === '' || $memGroup === '' || $memPriorityGroup === '' || $tablesRaw === '') {
            $error = 'Please fill out all required fields.';
        } else {
            try {
                $tablesJson = normalizeTablesPhp($tablesRaw);
                $stmt = $pdo->prepare('UPDATE employees SET employee_number = :num, name = :name, email = :email, mem_group = :grp, mem_priority_group = :pri, tables = :tbl WHERE id = :id');
                $stmt->execute([
                    'num' => $empNumber,
                    'name' => $name,
                    'email' => $email,
                    'grp' => $memGroup,
                    'pri' => $memPriorityGroup,
                    'tbl' => $tablesJson,
                    'id' => $id,
                ]);
                $message = 'Employee information updated successfully.';
            } catch (PDOException $e) {
                if ($e->getCode() == 23000) {
                    $error = "Employee number '{$empNumber}' already exists for another record.";
                } else {
                    $error = 'Failed to update employee.';
                }
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            $stmt = $pdo->prepare('DELETE FROM employees WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $message = 'Employee deleted successfully.';
        }
    }
}

// Fetch all employees or filtered
$search = trim((string)($_GET['q'] ?? ''));
if ($search !== '') {
    $stmt = $pdo->prepare(
        'SELECT * FROM employees 
         WHERE employee_number LIKE :q 
            OR name LIKE :q 
            OR email LIKE :q 
            OR mem_group LIKE :q 
            OR mem_priority_group LIKE :q 
            OR tables LIKE :q 
         ORDER BY id DESC'
    );
    $stmt->execute(['q' => "%{$search}%"]);
    $employees = $stmt->fetchAll();
} else {
    $stmt = $pdo->query('SELECT * FROM employees ORDER BY id DESC');
    $employees = $stmt->fetchAll();
}

$currentUser = getCurrentAdminUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - Nestlé MEM 2026</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="bg-white border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Nestlé MEM 2026 Admin</h1>
        <p class="text-xs text-slate-500">Employee Grouping & Table Assignments</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          Logged in as <?= htmlspecialchars($currentUser['username'] ?? 'admin') ?>
        </span>
        <a href="logout.php" class="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
          Logout
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-8">
    <?php if ($message): ?>
      <div class="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
        <?= htmlspecialchars($message) ?>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
        <?= htmlspecialchars($error) ?>
      </div>
    <?php endif; ?>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
      <h2 class="text-lg font-bold mb-4">Add New Employee Assignment</h2>
      <form method="POST" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="hidden" name="action" value="add">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Employee Number *</label>
          <input type="text" name="employee_number" required placeholder="e.g. 11248494" class="w-full px-3 py-2 text-sm border rounded-lg uppercase">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
          <input type="text" name="name" required placeholder="e.g. Donnel Jun Tiedra" class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
          <input type="email" name="email" placeholder="e.g. asd.sas@ph.nestle.com" class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">MEM Group *</label>
          <input type="text" name="mem_group" required placeholder="e.g. 5" class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">MEM Priority Group *</label>
          <input type="text" name="mem_priority_group" required placeholder="e.g. Efficiency" class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Table # *</label>
          <input type="text" name="tables" required placeholder="e.g. Table 3,6,8,9,12" class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        <div class="md:col-span-3 flex justify-end">
          <button type="submit" class="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700">
            Save Employee Record
          </button>
        </div>
      </form>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 class="font-bold text-slate-800">Employee Records (<?= count($employees) ?>)</h3>
        <form method="GET" class="flex gap-2">
          <input type="text" name="q" value="<?= htmlspecialchars($search) ?>" placeholder="Search records..." class="px-3 py-1.5 text-xs border rounded-lg">
          <button type="submit" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg">Search</button>
          <?php if ($search !== ''): ?>
            <a href="index.php" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold rounded-lg border">Clear</a>
          <?php endif; ?>
        </form>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
            <tr>
              <th class="py-3 px-4">Employee No.</th>
              <th class="py-3 px-4">Name + Email</th>
              <th class="py-3 px-4">MEM Group</th>
              <th class="py-3 px-4">MEM Priority Group</th>
              <th class="py-3 px-4">Table(s)</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <?php if (empty($employees)): ?>
              <tr>
                <td colspan="6" class="text-center py-8 text-slate-400">No records found</td>
              </tr>
            <?php else: ?>
              <?php foreach ($employees as $row): 
                $tablesArr = json_decode($row['tables'] ?? '[]', true);
                if (!is_array($tablesArr)) {
                  $tablesArr = [$row['tables']];
                }
              ?>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 px-4 font-mono font-bold text-indigo-700"><?= htmlspecialchars((string)$row['employee_number']) ?></td>
                  <td class="py-3 px-4 font-bold text-slate-800">
                    <?= htmlspecialchars((string)$row['name']) ?>
                    <?php if (!empty($row['email'])): ?>
                      <div class="text-[10px] text-slate-500 font-normal"><?= htmlspecialchars((string)$row['email']) ?></div>
                    <?php endif; ?>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]"><?= htmlspecialchars((string)$row['mem_group']) ?></span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[11px]"><?= htmlspecialchars((string)$row['mem_priority_group']) ?></span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex flex-wrap gap-1 max-w-[220px]">
                      <?php foreach ($tablesArr as $tbl): ?>
                        <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-100"><?= htmlspecialchars((string)$tbl) ?></span>
                      <?php endforeach; ?>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <form method="POST" onsubmit="return confirm('Delete this employee record?');" class="inline">
                      <input type="hidden" name="action" value="delete">
                      <input type="hidden" name="id" value="<?= (int)$row['id'] ?>">
                      <button type="submit" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">Delete</button>
                    </form>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</body>
</html>
