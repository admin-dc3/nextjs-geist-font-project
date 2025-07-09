<?php
session_start();
$dir = "storage/";
if (!is_dir($dir)) {
    echo '<div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h3>Thư mục lưu trữ chưa được tạo</h3>
            <p>Tạo ghi chú đầu tiên để bắt đầu!</p>
          </div>';
    exit;
}

$files = array_diff(scandir($dir, SCANDIR_SORT_DESCENDING), ['.', '..']);
$is_admin = isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;

if (empty($files)) {
    echo '<div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>Chưa có ghi chú nào</h3>
            <p>Tạo ghi chú đầu tiên của bạn bằng cách nhập nội dung hoặc lấy từ clipboard!</p>
          </div>';
} else {
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'html') {
            $content = file_get_contents($dir . $file);
            if ($content) {
                if (!$is_admin) {
                    // Ẩn nút Xóa nếu không phải admin
                    $content = preg_replace('/<button[^>]*btn-danger[^>]*>.*?<\/button>/si', '', $content);
                }
                echo $content;
            }
        }
    }
}
?>