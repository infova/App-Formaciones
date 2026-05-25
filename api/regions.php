<?php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $regions = $pdo->query("SELECT * FROM regions ORDER BY sort_order, name")->fetchAll();
        foreach ($regions as &$r) {
            $stmt = $pdo->prepare("SELECT * FROM countries WHERE region_id = ? ORDER BY sort_order, name");
            $stmt->execute([$r['id']]);
            $r['countries'] = $stmt->fetchAll();
        }
        echo json_encode(array_values($regions));
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre obligatorio']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO regions (name, flag_svg, sort_order) VALUES (?, ?, ?)");
            $stmt->execute([$data['name'], $data['flag_svg'] ?? null, $data['sort_order'] ?? 0]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                http_response_code(400);
                echo json_encode(['error' => 'La región ya existe']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        break;

    case 'PUT':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre obligatorio']);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE regions SET name = ?, flag_svg = ? WHERE id = ?");
        $stmt->execute([$data['name'], $data['flag_svg'] ?? null, $id]);
        // Sync region name in users and clients
        $pdo->prepare("UPDATE users SET region = ? WHERE region = (SELECT name FROM regions WHERE id = ?)")->execute([$data['name'], $id]);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM countries WHERE region_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['error' => 'La región tiene países asignados. Elimínalos primero.']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM regions WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}
