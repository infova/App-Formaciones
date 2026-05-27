<?php
// api/records.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Migración: sincronizar el campo id dentro del JSON con la columna PK
        if (isset($_GET['sync_ids']) && $_GET['sync_ids'] === '1') {
            $stmt = $pdo->query("SELECT id, data FROM records");
            $rows = $stmt->fetchAll();
            $upd = $pdo->prepare("UPDATE records SET data = ? WHERE id = ?");
            $fixed = 0;
            foreach ($rows as $row) {
                $decoded = json_decode($row['data'], true) ?? [];
                if (($decoded['id'] ?? null) !== $row['id']) {
                    $decoded['id'] = $row['id'];
                    $upd->execute([json_encode($decoded), $row['id']]);
                    $fixed++;
                }
            }
            echo json_encode(['success' => true, 'fixed' => $fixed, 'total' => count($rows)]);
            break;
        }

        // Listar registros (solo el campo data que contiene el JSON)
        $stmt = $pdo->query("SELECT id, data FROM records");
        $rows = $stmt->fetchAll();
        $results = [];
        foreach ($rows as $row) {
            $decoded = json_decode($row['data'], true) ?? [];
            $decoded['id'] = $row['id']; // el id de la columna PK es la fuente de verdad
            $results[] = $decoded;
        }
        echo json_encode($results);
        break;

    case 'POST':
        $payload = json_decode(file_get_contents('php://input'), true);

        // Migración masiva: asigna client_id a registros por nombre de marca
        if (isset($_GET['migrate_clients']) && $_GET['migrate_clients'] === '1') {
            $assignments = $payload ?? [];
            $updated = 0;
            $sel = $pdo->prepare("SELECT id, data FROM records WHERE marca = ? AND (client_id IS NULL OR client_id = 0)");
            $upd = $pdo->prepare("UPDATE records SET client_id = ?, data = ? WHERE id = ?");
            foreach ($assignments as $a) {
                if (empty($a['marca']) || empty($a['client_id'])) continue;
                $clientId = (int)$a['client_id'];
                $sel->execute([$a['marca']]);
                foreach ($sel->fetchAll() as $row) {
                    $data = json_decode($row['data'], true) ?? [];
                    $data['client_id'] = $clientId;
                    $upd->execute([$clientId, json_encode($data), $row['id']]);
                    $updated++;
                }
            }
            echo json_encode(['success' => true, 'updated' => $updated]);
            break;
        }

        // Handle Bulk Import
        if (isset($_GET['bulk']) && $_GET['bulk'] === 'true') {
            $type = $payload['type'] ?? 'all';
            $records = $payload['records'] ?? [];

            $pdo->beginTransaction();
            try {
                foreach ($records as $r) {
                    $id = $r['id'];
                    // Check if exists
                    $stmt = $pdo->prepare("SELECT data FROM records WHERE id = ?");
                    $stmt->execute([$id]);
                    $existing = $stmt->fetch();

                    if ($existing) {
                        $oldData = json_decode($existing['data'], true);
                        // Merge all provided fields from unified import
                        $oldData['fechaAlta'] = $r['fechaAlta'] ?? $oldData['fechaAlta'];
                        $oldData['marca'] = $r['marca'] ?? $oldData['marca'];
                        $oldData['year'] = $r['year'] ?? ($oldData['year'] ?? '');
                        $oldData['nombre'] = $r['nombre'] ?? $oldData['nombre'];
                        $oldData['apellidos'] = $r['apellidos'] ?? $oldData['apellidos'];
                        $oldData['telefono'] = $r['telefono'] ?? ($oldData['telefono'] ?? '');
                        $oldData['email'] = $r['email'] ?? $oldData['email'];
                        $oldData['concesionario'] = $r['concesionario'] ?? $oldData['concesionario'];
                        $oldData['tipoAcceso'] = $r['tipoAcceso'] ?? $oldData['tipoAcceso'];
                        $oldData['tabletSN'] = $r['tabletSN'] ?? ($oldData['tabletSN'] ?? '');
                        $oldData['comercialAnterior'] = $r['comercialAnterior'] ?? ($oldData['comercialAnterior'] ?? '');
                        $oldData['reqFormacion'] = $r['reqFormacion'];
                        $oldData['reqConfig'] = $r['reqConfig'];
                        $oldData['observaciones'] = $r['observaciones'] ?? ($oldData['observaciones'] ?? '');

                        $stmt = $pdo->prepare("UPDATE records SET fechaAlta=?, marca=?, nombre=?, apellidos=?, email=?, telefono=?, concesionario=?, tipoAcceso=?, data=? WHERE id=?");
                        $stmt->execute([
                            $oldData['fechaAlta'],
                            $oldData['marca'],
                            $oldData['nombre'],
                            $oldData['apellidos'],
                            $oldData['email'],
                            $oldData['telefono'],
                            $oldData['concesionario'],
                            $oldData['tipoAcceso'],
                            json_encode($oldData),
                            $id
                        ]);
                    } else {
                        // Insert new
                        $stmt = $pdo->prepare("INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $r['id'],
                            $r['fechaAlta'],
                            $r['marca'],
                            $r['nombre'],
                            $r['apellidos'],
                            $r['email'],
                            $r['telefono'] ?? '',
                            $r['concesionario'],
                            $r['tipoAcceso'],
                            json_encode($r)
                        ]);
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true, 'count' => count($records)]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
            break;
        }

        // Standard Single Record POST
        $record = $payload;
        $stmt = $pdo->prepare("INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $record['id'] ?? null,
            $record['fechaAlta'] ?? null,
            $record['marca'] ?? null,
            $record['nombre'] ?? null,
            $record['apellidos'] ?? null,
            $record['email'] ?? null,
            $record['telefono'] ?? '',
            $record['concesionario'] ?? null,
            $record['tipoAcceso'] ?? null,
            json_encode($record),
            isset($record['client_id']) ? (int)$record['client_id'] : null
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID no proporcionado']);
            exit;
        }
        $record = json_decode(file_get_contents('php://input'), true);
        if (!$record) {
            http_response_code(400);
            echo json_encode(['error' => 'JSON inválido o vacío']);
            exit;
        }
        // Verificar existencia real antes de actualizar (rowCount=0 no distingue "no existe" de "sin cambios")
        $check = $pdo->prepare("SELECT id FROM records WHERE id = ?");
        $check->execute([$id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => "Registro '$id' no encontrado"]);
            exit;
        }
        $record['id'] = $id; // garantizar coherencia del id dentro del JSON
        $stmt = $pdo->prepare("UPDATE records SET fechaAlta=?, marca=?, nombre=?, apellidos=?, email=?, telefono=?, concesionario=?, tipoAcceso=?, data=?, client_id=? WHERE id=?");
        $stmt->execute([
            $record['fechaAlta'] ?? null,
            $record['marca'] ?? null,
            $record['nombre'] ?? null,
            $record['apellidos'] ?? null,
            $record['email'] ?? null,
            $record['telefono'] ?? '',
            $record['concesionario'] ?? null,
            $record['tipoAcceso'] ?? null,
            json_encode($record),
            isset($record['client_id']) ? (int)$record['client_id'] : null,
            $id
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $resetAll = $_SERVER['HTTP_X_RESET_ALL'] ?? 'false';
        if ($resetAll === 'true') {
            $pdo->query("DELETE FROM records");
            $pdo->query("DELETE FROM clients");
            // Optional: reset auto-increment index
            $pdo->query("ALTER TABLE records AUTO_INCREMENT = 1");
            echo json_encode(['success' => true, 'reset' => 'full']);
            break;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID no proporcionado']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM records WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
