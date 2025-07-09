<?php
session_start();
$_SESSION['is_admin'] = false;
session_destroy();
header('Content-Type: application/json');
echo json_encode(['success' => true]); 