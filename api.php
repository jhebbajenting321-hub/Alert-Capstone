<?php
session_start();
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';

// 1. Submit a Hazard Report (Public)
if ($action === 'submit_report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($input['name'] ?? '');
    $category = trim($input['category'] ?? '');
    $location = trim($input['location'] ?? '');
    $desc = trim($input['desc'] ?? '');

    if (empty($name) || empty($category) || empty($location) || empty($desc)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required.']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO reports (reporter_name, category, location, description) VALUES (?, ?, ?, ?)");
    if ($stmt->execute([$name, $category, $location, $desc])) {
        echo json_encode(['success' => true, 'message' => 'Report submitted successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save report.']);
    }
    exit;
}

// 2. Fetch Public Community Feed & Stats
if ($action === 'get_public_feed') {
    $stmt = $pdo->query("SELECT category, location, description, status, DATE_FORMAT(created_at, '%m/%d/%Y') as date FROM reports ORDER BY id DESC");
    $reports = $stmt->fetchAll();

    $statsStmt = $pdo->query("SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM reports");
    $stats = $statsStmt->fetch();

    echo json_encode([
        'success' => true,
        'reports' => $reports,
        'stats' => [
            'total' => (int)$stats['total'],
            'pending' => (int)($stats['pending'] ?? 0),
            'resolved' => (int)($stats['resolved'] ?? 0)
        ]
    ]);
    exit;
}

// 3. Admin Login
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = trim($input['user'] ?? '');
    $pass = trim($input['pass'] ?? '');

    // Default Credentials check (admin / admin123)
    if ($user === 'admin' && $pass === 'admin123') {
        $_SESSION['is_admin'] = true;
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
    exit;
}

// 4. Admin Logout
if ($action === 'logout') {
    unset($_SESSION['is_admin']);
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// -------------------------------------------------------------
// SECURE ADMIN-ONLY ENDPOINTS (Requires Active Admin Session)
// -------------------------------------------------------------
function checkAdminAuth() {
    if (empty($_SESSION['is_admin'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
}

// 5. Fetch Admin Dashboard & Notifications
if ($action === 'get_admin_data') {
    checkAdminAuth();

    $stmt = $pdo->query("SELECT id, reporter_name as name, category, location, description as desc, status, DATE_FORMAT(created_at, '%m/%d/%Y %h:%i %p') as date FROM reports ORDER BY id DESC");
    $reports = $stmt->fetchAll();

    // Unnotified new reports for admin bell
    $notifStmt = $pdo->query("SELECT id, reporter_name, category, DATE_FORMAT(created_at, '%h:%i %p') as time FROM reports WHERE is_notified = 0 ORDER BY id DESC");
    $notifications = $notifStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'reports' => $reports,
        'notifications' => $notifications
    ]);
    exit;
}

// 6. Clear Admin Notifications
if ($action === 'clear_notifs' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    checkAdminAuth();
    $pdo->query("UPDATE reports SET is_notified = 1 WHERE is_notified = 0");
    echo json_encode(['success' => true]);
    exit;
}

// 7. Update Report Status (Mark Resolved)
if ($action === 'resolve_report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    checkAdminAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    $stmt = $pdo->prepare("UPDATE reports SET status = 'Resolved' WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

// 8. Delete Report
if ($action === 'delete_report' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    checkAdminAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);

    $stmt = $pdo->prepare("DELETE FROM reports WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['error' => 'Invalid API route']);
?>