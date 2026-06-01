<?php
// api/logs.php — Log de actividad de usuarios
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

// GET — listar o exportar CSV
if ($method === 'GET') {
    // Exportar CSV completo
    if (isset($_GET['export']) && $_GET['export'] === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="actividad_' . date('Y-m-d') . '.csv"');
        $rows = $pdo->query("SELECT username, action, details, created_at FROM activity_log ORDER BY created_at DESC")->fetchAll();
        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM
        fputcsv($out, ['Fecha', 'Usuario', 'Acción', 'Detalle'], ';');
        foreach ($rows as $r) {
            fputcsv($out, [$r['created_at'], $r['username'], $r['action'], $r['details']], ';');
        }
        fclose($out);
        exit;
    }

    // Últimas 200 entradas para la vista
    $limit = intval($_GET['limit'] ?? 200);
    $limit = max(1, min($limit, 1000));
    $stmt = $pdo->prepare("SELECT id, username, action, details, created_at FROM activity_log ORDER BY created_at DESC LIMIT :lim");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

// POST — insertar un log
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (empty($body['username']) || empty($body['action'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan campos obligatorios (username, action)']);
        exit;
    }
    $stmt = $pdo->prepare("INSERT INTO activity_log (username, action, details) VALUES (?, ?, ?)");
    $stmt->execute([
        substr($body['username'], 0, 255),
        substr($body['action'], 0, 100),
        $body['details'] ?? null
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
