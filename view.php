<?php
$dir = "storage/";
$files = array_diff(scandir($dir, SCANDIR_SORT_DESCENDING), ['.', '..']);
foreach ($files as $file) {
  echo file_get_contents($dir . $file);
}
?>