<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT 1");
    echo json_encode(['status' => 'ok', 'database' => 'connected']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'database' => 'disconnected', 'error' => $e->getMessage()]);
}
