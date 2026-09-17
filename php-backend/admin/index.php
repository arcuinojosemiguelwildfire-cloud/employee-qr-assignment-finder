<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
requireAdminAuth();

require_once __DIR__ . '/../db.php';

$message = null;
$error = null;

// Handle Actions (Add, Edit, Delete)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $empNumber = strtoupper(trim((string)($_POST['employee_number'] ?? '')));
        $empName = trim((string)($_POST['employee_name'] ?? ''));
        $groupName = trim((string)($_POST['group_name'] ?? ''));
        $tableName = trim((string)($_POST['table_name'] ?? ''));
        $roomName = trim((string)($_POST['room_name'] ?? ''));
        $roomDetails = trim((string)($_POST['room_details'] ?? '')) ?: null;
        $department = trim((string)($_POST['department'] ?? '')) ?: null;

        if ($empNumber === '' || $empName === '' || $groupName === '' || $tableName === '' || $roomName === '') {
            $error = 'Please fill out all required fields.';
        } else {
            try {
                $stmt = $pdo->prepare('INSERT INTO employees (employee_number, employee_name, group_name, table_name, room_name, room_details, department) VALUES (:num, :name, :grp, :tbl, :rm, :dtl, :dept)');
                $stmt->execute([
                    'num' => $empNumber,
                    'name' => $empName,
                    'grp' => $groupName,
                    'tbl' => $tableName,
                    'rm' => $roomName,
                    'dtl' => $roomDetails,
                    'dept' => $department,
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
        $empName = trim((string)($_POST['employee_name'] ?? ''));
        $groupName = trim((string)($_POST['group_name'] ?? ''));
        $tableName = trim((string)($_POST['table_name'] ?? ''));
        $roomName = trim((string)($_POST['room_name'] ?? ''));
        $roomDetails = trim((string)($_POST['room_details'] ?? '')) ?: null;
        $department = trim((string)($_POST['department'] ?? '')) ?: null;

        if ($id <= 0 || $empNumber === '' || $empName === '' || $groupName === '' || $tableName === '' || $roomName === '') {
            $error = 'Please fill out all required fields.';
        } else {
            try {
                $stmt = $pdo->prepare('UPDATE employees SET employee_number = :num, employee_name = :name, group_name = :grp, table_name = :tbl, room_name = :rm, room_details = :dtl, department = :dept WHERE id = :id');
                $stmt->execute([
                    'num' => $empNumber,
                    'name' => $empName,
                    'grp' => $groupName,
                    'tbl' => $tableName,
                    'rm' => $roomName,
                    'dtl' => $roomDetails,
                    'dept' => $department,
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
            OR employee_name LIKE :q 
            OR group_name LIKE :q 
            OR table_name LIKE :q 
            OR room_name LIKE :q 
         ORDER BY id DESC'
    );
    $stmt->execute(['q' => "%{$search}%"]);
    $employees = $stmt->fetchAll();
} else {
    $stmt = $pdo->query('SELECT * FROM employees ORDER BY id DESC');
    $employees = $stmt->fetchAll();
}

$totalCountStmt = $pdo->query('SELECT COUNT(*) FROM employees');
$totalEmployees = (int)$totalCountStmt->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Employee Assignment Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen text-slate-900 p-4 sm:p-8 font-sans">
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Employee Assignment Admin</h1>
        <p class="text-xs text-slate-500">Internal assignment roster management</p>
      </div>
      <div class="flex items-center gap-3">
        <a href="../lookup.php" target="_blank" class="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          Public Finder API
        </a>
        <a href="logout.php" class="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100">
          Logout
        </a>
      </div>
    </div>

    <!-- Alert Messages -->
    <?php if ($message): ?>
      <div class="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
        <?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?>
      </div>
    <?php endif; ?>
    <?php if ($error): ?>
      <div class="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
        <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
      </div>
    <?php endif; ?>

    <!-- Main Card -->
    <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Employees</p>
          <p class="text-2xl font-extrabold text-slate-900"><?= number_format($totalEmployees) ?></p>
        </div>
        <button onclick="document.getElementById('addModal').classList.remove('hidden')" class="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md">
          + ADD EMPLOYEE
        </button>
      </div>

      <!-- Search Box -->
      <form method="GET" class="py-4 flex gap-2">
        <input type="text" name="q" value="<?= htmlspecialchars($search, ENT_QUOTES, 'UTF-8') ?>" placeholder="Search employee..."
          class="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none">
        <button type="submit" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl">Search</button>
        <?php if ($search !== ''): ?>
          <a href="index.php" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl flex items-center">Clear</a>
        <?php endif; ?>
      </form>

      <!-- Table -->
      <div class="overflow-x-auto rounded-xl border border-slate-100">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">Employee No.</th>
              <th class="py-3 px-4">Employee Name</th>
              <th class="py-3 px-4">Group</th>
              <th class="py-3 px-4">Table</th>
              <th class="py-3 px-4">Room</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <?php if (empty($employees)): ?>
              <tr>
                <td colspan="6" class="py-8 text-center text-slate-400">No employees found.</td>
              </tr>
            <?php else: ?>
              <?php foreach ($employees as $e): ?>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 px-4 font-mono font-bold text-indigo-900"><?= htmlspecialchars($e['employee_number']) ?></td>
                  <td class="py-3 px-4 font-bold text-slate-900"><?= htmlspecialchars($e['employee_name']) ?></td>
                  <td class="py-3 px-4"><?= htmlspecialchars($e['group_name']) ?></td>
                  <td class="py-3 px-4"><?= htmlspecialchars($e['table_name']) ?></td>
                  <td class="py-3 px-4"><?= htmlspecialchars($e['room_name']) ?></td>
                  <td class="py-3 px-4 text-right space-x-2">
                    <button onclick='editEmp(<?= json_encode($e) ?>)' class="text-indigo-600 hover:underline font-bold">Edit</button>
                    <button onclick='deleteEmp(<?= (int)$e['id'] ?>, "<?= htmlspecialchars($e['employee_name'], ENT_QUOTES) ?>", "<?= htmlspecialchars($e['employee_number'], ENT_QUOTES) ?>")' class="text-rose-600 hover:underline font-bold">Delete</button>
                  </td>
                </tr>
              <?php endforeach; ?>
            <?php endif; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Add Modal -->
  <div id="addModal" class="hidden fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-lg font-extrabold mb-4">Add Employee</h2>
      <form method="POST" class="space-y-3">
        <input type="hidden" name="action" value="add">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Employee Number *</label>
          <input type="text" name="employee_number" required placeholder="EMP00123" class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Employee Name *</label>
          <input type="text" name="employee_name" required placeholder="Juan Dela Cruz" class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Group *</label>
          <input type="text" name="group_name" required placeholder="Group A" class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Table *</label>
          <input type="text" name="table_name" required placeholder="Table 12" class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Room *</label>
          <input type="text" name="room_name" required placeholder="Room 3" class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div class="flex justify-end gap-2 pt-3">
          <button type="button" onclick="document.getElementById('addModal').classList.add('hidden')" class="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
          <button type="submit" class="px-4 py-2 text-xs font-bold text-white bg-indigo-700 rounded-xl">SAVE EMPLOYEE</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Edit Modal -->
  <div id="editModal" class="hidden fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-lg font-extrabold mb-4">Edit Employee</h2>
      <form method="POST" class="space-y-3">
        <input type="hidden" name="action" value="edit">
        <input type="hidden" name="id" id="edit_id">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Employee Number *</label>
          <input type="text" name="employee_number" id="edit_num" required class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Employee Name *</label>
          <input type="text" name="employee_name" id="edit_name" required class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Group *</label>
          <input type="text" name="group_name" id="edit_grp" required class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Table *</label>
          <input type="text" name="table_name" id="edit_tbl" required class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Room *</label>
          <input type="text" name="room_name" id="edit_rm" required class="w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl">
        </div>
        <div class="flex justify-end gap-2 pt-3">
          <button type="button" onclick="document.getElementById('editModal').classList.add('hidden')" class="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
          <button type="submit" class="px-4 py-2 text-xs font-bold text-white bg-indigo-700 rounded-xl">SAVE CHANGES</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Modal -->
  <div id="deleteModal" class="hidden fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
      <h2 class="text-base font-extrabold mb-2">Delete this employee assignment?</h2>
      <p id="del_text" class="text-xs text-slate-600 mb-4 p-3 bg-slate-50 rounded-xl font-bold"></p>
      <form method="POST" class="flex justify-center gap-3">
        <input type="hidden" name="action" value="delete">
        <input type="hidden" name="id" id="del_id">
        <button type="button" onclick="document.getElementById('deleteModal').classList.add('hidden')" class="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
        <button type="submit" class="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl">Delete</button>
      </form>
    </div>
  </div>

  <script>
    function editEmp(emp) {
      document.getElementById('edit_id').value = emp.id;
      document.getElementById('edit_num').value = emp.employee_number;
      document.getElementById('edit_name').value = emp.employee_name;
      document.getElementById('edit_grp').value = emp.group_name;
      document.getElementById('edit_tbl').value = emp.table_name;
      document.getElementById('edit_rm').value = emp.room_name;
      document.getElementById('editModal').classList.remove('hidden');
    }
    function deleteEmp(id, name, num) {
      document.getElementById('del_id').value = id;
      document.getElementById('del_text').innerText = name + " (" + num + ")";
      document.getElementById('deleteModal').classList.remove('hidden');
    }
  </script>
</body>
</html>
