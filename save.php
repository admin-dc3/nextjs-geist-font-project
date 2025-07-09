<?php
$dataDir = "storage/";
if (!is_dir($dataDir)) mkdir($dataDir);

$text = trim($_POST['text'] ?? '');
$image = $_POST['image'] ?? '';
$timestamp = time();
$filename = $timestamp . ".html";

// Determine content type
$hasText = !empty($text);
$hasImage = !empty($image);
$contentType = $hasText && $hasImage ? 'mixed' : ($hasText ? 'text' : 'image');

// Create modern HTML structure
$content = "<div class='saved-item' data-type='$contentType'>";
$content .= "<div class='saved-item-header'>";
$content .= "<div class='saved-item-meta'>";
$content .= "<span class='saved-item-type " . ($contentType === 'text' ? 'text' : 'image') . "'>";
$content .= $contentType === 'text' ? 'Văn bản' : ($contentType === 'image' ? 'Hình ảnh' : 'Hỗn hợp');
$content .= "</span>";
$content .= "<span class='saved-item-date'>" . date('d/m/Y H:i', $timestamp) . "</span>";
$content .= "</div>";
$content .= "<div class='saved-item-actions'>";
if ($hasText) {
    $content .= "<button class='btn btn-secondary copy-btn' onclick='copyToClipboard(\"" . addslashes($text) . "\", \"text\")'><i class='fas fa-copy'></i> Sao chép</button>";
} elseif ($hasImage) {
    $content .= "<button class='btn btn-secondary copy-btn' onclick='copyToClipboard(\"$imagePath\", \"image\")'><i class='fas fa-copy'></i> Sao chép</button>";
}
$content .= "<button class='btn btn-danger' onclick=\"deleteEntry('$filename')\"><i class='fas fa-trash'></i> Xóa</button>";
$content .= "</div>";
$content .= "</div>";

$content .= "<div class='saved-item-content'>";

if ($hasText) {
    // Truncate text for preview
    $previewText = strlen($text) > 200 ? substr($text, 0, 200) . '...' : $text;
    $isLongText = strlen($text) > 200;
    
    $content .= "<div class='content-preview" . ($isLongText ? '' : ' expanded') . "'>";
    $content .= "<p>" . nl2br(htmlspecialchars($previewText)) . "</p>";
    $content .= "</div>";
    
    if ($isLongText) {
        $content .= "<button class='expand-btn'>Xem thêm</button>";
        $content .= "<div class='full-content' style='display: none;'>";
        $content .= "<p>" . nl2br(htmlspecialchars($text)) . "</p>";
        $content .= "</div>";
    }
}

if ($hasImage) {
    $imgName = $timestamp . ".png";
    $imagePath = $dataDir . $imgName;
    $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image));
    file_put_contents($imagePath, $imageData);
    
    $content .= "<div class='image-container'>";
    $content .= "<img src='$imagePath' alt='Clipboard Image' onclick=\"openModal('$imagePath', 'image')\" style='cursor: pointer;' />";
    $content .= "</div>";
}

$content .= "</div>";
$content .= "</div>";

file_put_contents($dataDir . $filename, $content);
?>