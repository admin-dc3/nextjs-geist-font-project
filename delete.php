<?php
session_start();
header('Content-Type: application/json');

// Chỉ cho phép admin
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xóa.']);
    exit;
}

$file = $_GET['file'] ?? '';
$path = "storage/" . basename($file);

// Validate file path
if (empty($file) || strpos($file, '..') !== false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid file path']);
    exit;
}

// Check if file exists
if (!file_exists($path)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'File not found']);
    exit;
}

// Try to delete the file
if (unlink($path)) {
    // Also try to delete associated image file if it exists
    $imagePath = str_replace('.html', '.png', $path);
    if (file_exists($imagePath)) {
        unlink($imagePath);
    }
    echo json_encode(['success' => true, 'message' => 'File deleted successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to delete file']);
}
?>