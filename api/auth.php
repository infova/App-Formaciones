<?php
// api/auth.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Usuario y contraseña obligatorios']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuario no encontrado']);
        exit;
    }

    if (password_verify($password, $user['password'])) {
        // Actualizar último login
        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare("UPDATE users SET lastLogin = ? WHERE id = ?");
        $upd->execute([$now, $user['id']]);

        // Quitar password de la respuesta
        unset($user['password']);
        $user['lastLogin'] = $now;

        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Contraseña incorrecta']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}