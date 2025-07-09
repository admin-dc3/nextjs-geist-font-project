<?php
$file = $_GET['file'] ?? '';
$path = "storage/" . basename($file);
if (file_exists($path)) {
  unlink($path);
}
?>