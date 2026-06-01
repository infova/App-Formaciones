<?php
// api/clients.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

// Auto-migrate: add brand_color column if not exists
try {
    $pdo->exec("ALTER TABLE clients ADD COLUMN brand_color VARCHAR(20) NULL");
} catch (PDOException $e) { /* already exists */
}
try {
    $pdo->exec("ALTER TABLE clients ADD COLUMN survey_url VARCHAR(500) NULL");
} catch (PDOException $e) { /* already exists */
}
try {
    $pdo->exec("ALTER TABLE clients ADD COLUMN survey_qr_enabled TINYINT(1) DEFAULT 0");
} catch (PDOException $e) { /* already exists */
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("
            SELECT c.id, c.name, c.region, c.country_id, c.logo_svg, c.brand_color, c.survey_url, c.survey_qr_enabled,
                   co.name AS country_name, r.id AS region_id, r.name AS region_name
            FROM clients c
            LEFT JOIN countries co ON co.id = c.country_id
            LEFT JOIN regions r ON r.id = co.region_id
            ORDER BY c.name
        ");
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre obligatorio']);
            exit;
        }
        $countryId = !empty($data['country_id']) ? (int)$data['country_id'] : null;
        $region = $data['region'] ?? 'España';
        // Derive region from country if country_id provided
        if ($countryId) {
            $r = $pdo->prepare("SELECT r.name FROM countries co JOIN regions r ON r.id = co.region_id WHERE co.id = ?");
            $r->execute([$countryId]);
            $region = $r->fetchColumn() ?: $region;
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO clients (name, region, country_id, logo_svg, brand_color, survey_url, survey_qr_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['name'], $region, $countryId, $data['logo_svg'] ?? null, $data['brand_color'] ?? null, $data['survey_url'] ?? null, isset($data['survey_qr_enabled']) ? (int)$data['survey_qr_enabled'] : 0]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                http_response_code(400);
                echo json_encode(['error' => 'Esta marca ya existe en este país']);
            } else {
                throw $e;
            }
        }
        break;

    case 'PUT':
        $id = (int)($_GET['id'] ?? 0);
        $data = json_decode(file_get_contents('php://input'), true);
        $countryId = !empty($data['country_id']) ? (int)$data['country_id'] : null;
        $region = $data['region'] ?? 'España';
        if ($countryId) {
            $r = $pdo->prepare("SELECT r.name FROM countries co JOIN regions r ON r.id = co.region_id WHERE co.id = ?");
            $r->execute([$countryId]);
            $region = $r->fetchColumn() ?: $region;
        }
        $stmt = $pdo->prepare("UPDATE clients SET name = ?, region = ?, country_id = ?, logo_svg = ?, brand_color = ?, survey_url = ?, survey_qr_enabled = ? WHERE id = ?");
        $stmt->execute([$data['name'], $region, $countryId, $data['logo_svg'] ?? null, $data['brand_color'] ?? null, $data['survey_url'] ?? null, isset($data['survey_qr_enabled']) ? (int)$data['survey_qr_enabled'] : 0, $id]);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
