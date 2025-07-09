<?php
$dataDir = "storage/";
if (!is_dir($dataDir)) mkdir($dataDir);

$text = trim($_POST['text'] ?? '');
$image = $_POST['image'] ?? '';
$timestamp = time();
$filename = $timestamp . ".html";
$content = "<div class='saved-block'>";
if (!empty($text)) {
  $content .= "<p>" . nl2br(htmlspecialchars($text)) . "</p>";
}
if (!empty($image)) {
  $imgName = $timestamp . ".png";
  $imagePath = $dataDir . $imgName;
  $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image));
  file_put_contents($imagePath, $imageData);
  $content .= "<img src='$imagePath' alt='Clipboard Image' />";
}
$content .= "<button onclick=\"deleteEntry('$filename')\">🗑 Xóa</button>";
$content .= "</div>";
file_put_contents($dataDir . $filename, $content);
?>