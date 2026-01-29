<?php
// api/records.php
header('Content-Type: application/json');
require_once 'db.php';
$pdo = getPDO();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar registros (solo el campo data que contiene el JSON)
        $stmt = $pdo->query("SELECT data FROM records");
        $rows = $stmt->fetchAll();
        $results = [];
        foreach ($rows as $row) {
            $results[] = json_decode($row['data'], true);
        }
        echo json_encode($results);
        break;

    case 'POST':
        $payload = json_decode(file_get_contents('php://input'), true);

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
                        $oldData['serial'] = $r['serial'] ?? ($oldData['serial'] ?? '');
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
        $stmt = $pdo->prepare("INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
            json_encode($record)
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
        $stmt = $pdo->prepare("UPDATE records SET fechaAlta=?, marca=?, nombre=?, apellidos=?, email=?, telefono=?, concesionario=?, tipoAcceso=?, data=? WHERE id=?");
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