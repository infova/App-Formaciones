<?php
require_once 'db.php';

header('Content-Type: application/json');

// Check authentication
$user = checkAuth();
if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Solo administradores pueden migrar datos']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $records = json_decode($input, true);

    if (!is_array($records)) {
        http_response_code(400);
        echo json_encode(['error' => 'Formato de datos inválido']);
        exit;
    }

    $pdo = getDB();

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data)
            VALUES (:id, :fechaAlta, :marca, :nombre, :apellidos, :email, :telefono, :concesionario, :tipoAcceso, :data)
            ON DUPLICATE KEY UPDATE
            fechaAlta=VALUES(fechaAlta), 
            marca=VALUES(marca), 
            nombre=VALUES(nombre),
            apellidos=VALUES(apellidos), 
            email=VALUES(email), 
            telefono=VALUES(telefono),
            concesionario=VALUES(concesionario), 
            tipoAcceso=VALUES(tipoAcceso), 
            data=VALUES(data)
        ");

        foreach ($records as $item) {
            $stmt->execute([
                ':id' => $item['id'] ?? null,
                ':fechaAlta' => $item['fechaAlta'] ?? null,
                ':marca' => $item['marca'] ?? null,
                ':nombre' => $item['nombre'] ?? null,
                ':apellidos' => $item['apellidos'] ?? null,
                ':email' => $item['email'] ?? null,
                ':telefono' => $item['telefono'] ?? '',
                ':concesionario' => $item['concesionario'] ?? null,
                ':tipoAcceso' => $item['tipoAcceso'] ?? null,
                ':data' => json_encode($item)
            ]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'count' => count($records)]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(['error' => 'Error en la migración: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
