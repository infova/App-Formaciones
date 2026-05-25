<?php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $region_id = isset($_GET['region_id']) ? (int)$_GET['region_id'] : null;
        if ($region_id) {
            $stmt = $pdo->prepare("SELECT c.*, r.name as region_name FROM countries c JOIN regions r ON c.region_id = r.id WHERE c.region_id = ? ORDER BY c.sort_order, c.name");
            $stmt->execute([$region_id]);
        } else {
            $stmt = $pdo->query("SELECT c.*, r.name as region_name FROM countries c JOIN regions r ON c.region_id = r.id ORDER BY r.sort_order, c.sort_order, c.name");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name']) || empty($data['region_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre y región son obligatorios']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO countries (name, region_id, flag_svg, sort_order) VALUES (?, ?, ?, ?)");
            $stmt->execute([$data['name'], (int)$data['region_id'], $data['flag_svg'] ?? null, $data['sort_order'] ?? 0]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
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
        $fields = "name = ?, flag_svg = ?";
        $params = [$data['name'], $data['flag_svg'] ?? null];
        if (!empty($data['region_id'])) {
            $fields .= ", region_id = ?";
            $params[] = (int)$data['region_id'];
        }
        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE countries SET $fields WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID requerido']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM clients WHERE country_id = ?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['error' => 'El país tiene marcas asignadas. Elimínalas primero.']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM countries WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
}
