<?php
session_start();
header('Content-Type: application/json');
$data = json_decode(file_get_contents('php://input'), true);
$user = $data['user'] ?? '';
$pass = $data['pass'] ?? '';
if ($user === 'laohacbancho37' && $pass === 'Laohacbancho37@') {
    $_SESSION['is_admin'] = true;
    echo json_encode(['success' => true]);
} else {
    $_SESSION['is_admin'] = false;
    echo json_encode(['success' => false, 'message' => 'Sai tài khoản hoặc mật khẩu!']);
} 