<?php
// api/users.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

// Auto-migrate: add profile_color column if not exists
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN profile_color VARCHAR(150) NULL");
} catch (PDOException $e) { /* already exists */
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT id, username, role, brands, region, lastLogin, profile_color FROM users");
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
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role, brands, region) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $data['username'],
                $hash,
                $data['role'] ?? 'user',
                $data['brands'] ?? 'All',
                $data['region'] ?? 'España'
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
        $profileColor = isset($data['profile_color']) ? $data['profile_color'] : null;
        // Solo actualizar role/brands/region si vienen explícitamente en el payload
        // (el perfil propio solo envía password y profile_color, no debe tocar el rol)
        $hasRoleData = array_key_exists('role', $data) || array_key_exists('brands', $data) || array_key_exists('region', $data);
        if (!empty($data['password'])) {
            $hash = password_hash($data['password'], PASSWORD_BCRYPT);
            if ($hasRoleData) {
                $stmt = $pdo->prepare("UPDATE users SET password = ?, role = ?, brands = ?, region = ?, profile_color = ? WHERE id = ?");
                $stmt->execute([$hash, $data['role'] ?? 'user', $data['brands'] ?? 'All', $data['region'] ?? 'España', $profileColor, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET password = ?, profile_color = ? WHERE id = ?");
                $stmt->execute([$hash, $profileColor, $id]);
            }
        } else {
            if ($hasRoleData) {
                $stmt = $pdo->prepare("UPDATE users SET role = ?, brands = ?, region = ?, profile_color = ? WHERE id = ?");
                $stmt->execute([$data['role'] ?? 'user', $data['brands'] ?? 'All', $data['region'] ?? 'España', $profileColor, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET profile_color = ? WHERE id = ?");
                $stmt->execute([$profileColor, $id]);
            }
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
