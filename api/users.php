<?php
// api/users.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT id, username, role, brands, lastLogin FROM users");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['username']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Faltan datos']);
            exit;
        }
        try {
            $hash = password_hash($data['password'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role, brands) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['username'],
                $hash,
                $data['role'] ?? 'user',
                $data['brands'] ?? 'All'
            ]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                http_response_code(400);
                echo json_encode(['error' => 'El usuario ya existe']);
            } else {
                throw $e;
            }
        }
        break;

    case 'PUT':
        $id = $_GET['id'] ?? null;
        $data = json_decode(file_get_contents('php://input'), true);
        if (!empty($data['password'])) {
            $hash = password_hash($data['password'], PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password = ?, role = ?, brands = ? WHERE id = ?");
            $stmt->execute([$hash, $data['role'] ?? 'user', $data['brands'] ?? 'All', $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET role = ?, brands = ? WHERE id = ?");
            $stmt->execute([$data['role'] ?? 'user', $data['brands'] ?? 'All', $id]);
        }
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}