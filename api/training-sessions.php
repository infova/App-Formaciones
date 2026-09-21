<?php
// api/training-sessions.php — CRUD transaccional de formaciones grupales
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

class TrainingSessionApiException extends RuntimeException
{
    public $httpStatus;

    public function __construct($message, $httpStatus)
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }
}

function jsonResponse($payload, $status = 200)
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestPayload()
{
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        jsonResponse(['error' => 'JSON inválido o vacío'], 400);
    }
    return $payload;
}

function normalizeDateTime($value)
{
    if ($value === null || trim((string)$value) === '') return null;
    $value = trim((string)$value);
    $value = str_replace('T', ' ', $value);
    $value = substr($value, 0, 19);
    if (strlen($value) === 16) $value .= ':00';
    $date = DateTime::createFromFormat('Y-m-d H:i:s', $value);
    if (!$date || $date->format('Y-m-d H:i:s') !== $value) {
        jsonResponse(['error' => 'La fecha y hora no tienen un formato válido'], 422);
    }
    return $value;
}

function toIsoDateTime($value)
{
    if (!$value) return null;
    return str_replace(' ', 'T', substr($value, 0, 16));
}

function participantTrainingStatus($sessionStatus, $attendanceStatus = null)
{
    if ($sessionStatus === 'Realizada') {
        return $attendanceStatus === 'Asistió' ? 'Realizada' : 'No Realizada';
    }
    if ($sessionStatus === 'No Realizada') return 'No Realizada';
    return $sessionStatus;
}

function sessionParticipants($pdo, $sessionId)
{
    $stmt = $pdo->prepare("SELECT tsp.record_id, tsp.response_status, tsp.attendance_status, tsp.invited_at
        FROM training_session_participants tsp
        WHERE tsp.session_id = ?
        ORDER BY tsp.created_at, tsp.record_id");
    $stmt->execute([$sessionId]);
    return array_map(function ($row) {
        return [
            'recordId' => (string)$row['record_id'],
            'responseStatus' => $row['response_status'] ?: 'Pendiente',
            'attendanceStatus' => $row['attendance_status'] ?: 'Pendiente',
            'invitedAt' => toIsoDateTime($row['invited_at'])
        ];
    }, $stmt->fetchAll());
}

function mapSession($pdo, $row)
{
    return [
        'id' => $row['id'],
        'clientId' => $row['client_id'] !== null ? (int)$row['client_id'] : null,
        'title' => $row['title'],
        'trainingType' => $row['training_type'],
        'status' => $row['status'],
        'scheduledAt' => toIsoDateTime($row['scheduled_at']),
        'completedAt' => toIsoDateTime($row['completed_at']),
        'confirmedBy' => $row['confirmed_by'],
        'meetingLink' => $row['meeting_link'] ?: '',
        'location' => $row['location'] ?: '',
        'durationMinutes' => (int)$row['duration_minutes'],
        'emailSubject' => $row['email_subject'] ?: '',
        'emailBody' => $row['email_body'] ?: '',
        'invitationSentAt' => toIsoDateTime($row['invitation_sent_at']),
        'createdBy' => $row['created_by'],
        'createdAt' => toIsoDateTime($row['created_at']),
        'participants' => sessionParticipants($pdo, $row['id'])
    ];
}

function findSession($pdo, $id)
{
    $stmt = $pdo->prepare("SELECT * FROM training_sessions WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? mapSession($pdo, $row) : null;
}

function syncParticipantRecord($pdo, $recordId, $session, $participantStatus = null)
{
    $stmt = $pdo->prepare("SELECT data FROM records WHERE id = ? FOR UPDATE");
    $stmt->execute([$recordId]);
    $row = $stmt->fetch();
    if (!$row) throw new RuntimeException("El asesor '$recordId' ya no existe");

    $data = json_decode($row['data'], true) ?: [];
    $formation = isset($data['formacion']) && is_array($data['formacion']) ? $data['formacion'] : [];
    $formation['groupId'] = $session['id'];
    $formation['groupTitle'] = $session['title'];
    $formation['date'] = $session['scheduledAt'] ?: '';
    $formation['confirmedBy'] = $session['confirmedBy'] ?: null;

    $formation['status'] = participantTrainingStatus($session['status'], $participantStatus);
    if ($formation['status'] === 'Realizada') {
        $formation['dateCompleted'] = $session['completedAt']
            ? substr($session['completedAt'], 0, 10)
            : date('Y-m-d');
    } else {
        unset($formation['dateCompleted']);
    }

    $data['formacion'] = $formation;
    $data['tipoFormacion'] = $session['trainingType'];
    $upd = $pdo->prepare("UPDATE records SET data = ? WHERE id = ?");
    $upd->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $recordId]);
}

function syncIndividualTrainingRecord($pdo, $recordId, $status, $scheduledAt, $confirmedBy, $trainingType)
{
    $stmt = $pdo->prepare("SELECT data FROM records WHERE id = ? FOR UPDATE");
    $stmt->execute([$recordId]);
    $row = $stmt->fetch();
    if (!$row) throw new TrainingSessionApiException("El asesor '$recordId' ya no existe", 409);

    $data = json_decode($row['data'], true) ?: [];
    $formation = isset($data['formacion']) && is_array($data['formacion']) ? $data['formacion'] : [];
    unset($formation['groupId'], $formation['groupTitle'], $formation['dateCompleted']);
    $formation['status'] = $status;
    $formation['date'] = $scheduledAt ?: '';
    $formation['confirmedBy'] = $confirmedBy ?: null;
    $data['formacion'] = $formation;
    if ($trainingType !== '') $data['tipoFormacion'] = $trainingType;

    $upd = $pdo->prepare("UPDATE records SET data = ? WHERE id = ?");
    $upd->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $recordId]);
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM training_sessions ORDER BY COALESCE(scheduled_at, '9999-12-31 23:59:59'), created_at");
        $sessions = [];
        foreach ($stmt->fetchAll() as $row) $sessions[] = mapSession($pdo, $row);
        jsonResponse($sessions);
    }

    if ($method === 'POST') {
        $payload = requestPayload();
        $participantIds = array_values(array_unique(array_filter(array_map('strval', $payload['participantIds'] ?? []))));
        if (count($participantIds) < 2) {
            jsonResponse(['error' => 'Selecciona al menos dos asesores'], 422);
        }

        $placeholders = implode(',', array_fill(0, count($participantIds), '?'));
        $stmt = $pdo->prepare("SELECT id, client_id, marca, data FROM records WHERE id IN ($placeholders)");
        $stmt->execute($participantIds);
        $records = $stmt->fetchAll();
        if (count($records) !== count($participantIds)) {
            jsonResponse(['error' => 'Uno o varios asesores ya no existen. Actualiza el tablero.'], 409);
        }

        $clientIds = [];
        $brands = [];
        $recordsById = [];
        foreach ($records as $record) {
            $data = json_decode($record['data'], true) ?: [];
            $formation = $data['formacion'] ?? [];
            if (!empty($formation['groupId'])) {
                jsonResponse(['error' => 'Uno de los asesores ya pertenece a otra formación grupal'], 409);
            }
            if (($formation['status'] ?? 'Pendiente') !== 'Pendiente') {
                jsonResponse(['error' => 'Solo se pueden agrupar asesores pendientes'], 409);
            }
            if ($record['client_id'] !== null) $clientIds[(string)$record['client_id']] = true;
            $brand = trim((string)($record['marca'] ?: ($data['marca'] ?? '')));
            if ($brand !== '') $brands[mb_strtolower($brand)] = true;
            $recordsById[(string)$record['id']] = $record;
        }
        if (count($clientIds) > 1 || count($brands) > 1) {
            jsonResponse(['error' => 'Los asesores deben pertenecer a la misma marca y país'], 422);
        }

        $title = trim((string)($payload['title'] ?? ''));
        if ($title === '') jsonResponse(['error' => 'Indica un nombre para la formación'], 422);
        $scheduledAt = normalizeDateTime($payload['scheduledAt'] ?? null);
        if (!$scheduledAt) jsonResponse(['error' => 'Indica la fecha y hora de la formación'], 422);

        $sessionId = 'grp_' . bin2hex(random_bytes(12));
        $session = [
            'id' => $sessionId,
            'clientId' => count($clientIds) === 1 ? (int)array_key_first($clientIds) : null,
            'title' => $title,
            'trainingType' => trim((string)($payload['trainingType'] ?? 'Sesión Teams')) ?: 'Sesión Teams',
            'status' => 'Pendiente',
            'scheduledAt' => toIsoDateTime($scheduledAt),
            'completedAt' => null,
            'confirmedBy' => trim((string)($payload['confirmedBy'] ?? '')) ?: null,
            'meetingLink' => trim((string)($payload['meetingLink'] ?? '')),
            'location' => trim((string)($payload['location'] ?? '')),
            'durationMinutes' => max(10, min(480, (int)($payload['durationMinutes'] ?? 40))),
            'emailSubject' => trim((string)($payload['emailSubject'] ?? '')),
            'emailBody' => trim((string)($payload['emailBody'] ?? '')),
            'createdBy' => trim((string)($payload['createdBy'] ?? '')) ?: null
        ];

        $pdo->beginTransaction();
        $insert = $pdo->prepare("INSERT INTO training_sessions
            (id, client_id, title, training_type, status, scheduled_at, confirmed_by, meeting_link, location, duration_minutes, email_subject, email_body, created_by)
            VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?, ?, ?)");
        $insert->execute([
            $session['id'], $session['clientId'], $session['title'], $session['trainingType'],
            $scheduledAt, $session['confirmedBy'], $session['meetingLink'] ?: null,
            $session['location'] ?: null, $session['durationMinutes'],
            $session['emailSubject'] ?: null, $session['emailBody'] ?: null, $session['createdBy']
        ]);

        $insertParticipant = $pdo->prepare("INSERT INTO training_session_participants (session_id, record_id) VALUES (?, ?)");
        foreach ($participantIds as $recordId) {
            $insertParticipant->execute([$sessionId, $recordId]);
            syncParticipantRecord($pdo, $recordId, $session);
        }
        $pdo->commit();
        jsonResponse(findSession($pdo, $sessionId), 201);
    }

    if ($method === 'PUT') {
        $id = trim((string)($_GET['id'] ?? ''));
        if ($id === '') jsonResponse(['error' => 'ID de sesión no proporcionado'], 400);
        $existing = findSession($pdo, $id);
        if (!$existing) jsonResponse(['error' => 'La formación grupal no existe'], 404);
        $payload = requestPayload();

        $participantActions = [];
        $seenParticipantActions = [];
        $rawParticipantActions = $payload['participantActions'] ?? [];
        if (!is_array($rawParticipantActions)) jsonResponse(['error' => 'Las acciones de participantes no son válidas'], 422);
        $existingParticipantIds = array_map(fn($participant) => (string)$participant['recordId'], $existing['participants']);
        foreach ($rawParticipantActions as $rawAction) {
            if (!is_array($rawAction)) jsonResponse(['error' => 'Una acción de participante no es válida'], 422);
            $recordId = trim((string)($rawAction['recordId'] ?? ''));
            $action = trim((string)($rawAction['action'] ?? ''));
            if ($recordId === '' || !in_array($recordId, $existingParticipantIds, true)) {
                jsonResponse(['error' => 'Uno de los asesores ya no pertenece a esta formación'], 409);
            }
            if (isset($seenParticipantActions[$recordId])) {
                jsonResponse(['error' => 'No se puede desvincular dos veces al mismo asesor'], 422);
            }
            if (!in_array($action, ['pending', 'reschedule'], true)) {
                jsonResponse(['error' => 'El destino elegido para el asesor no es válido'], 422);
            }
            $normalizedAction = ['recordId' => $recordId, 'action' => $action];
            if ($action === 'reschedule') {
                $scheduledAt = normalizeDateTime($rawAction['scheduledAt'] ?? null);
                $confirmedBy = trim((string)($rawAction['confirmedBy'] ?? ''));
                if (!$scheduledAt || $confirmedBy === '') {
                    jsonResponse(['error' => 'Indica la nueva fecha, hora y responsable del asesor reagendado'], 422);
                }
                $normalizedAction['scheduledAt'] = toIsoDateTime($scheduledAt);
                $normalizedAction['confirmedBy'] = $confirmedBy;
            }
            $participantActions['record:' . $recordId] = $normalizedAction;
            $seenParticipantActions[$recordId] = true;
        }
        if ($participantActions && in_array($existing['status'], ['Realizada', 'No Realizada'], true)) {
            jsonResponse(['error' => 'No se pueden desvincular asesores de una formación finalizada'], 409);
        }

        $participantIdsToAdd = [];
        $seenParticipantIdsToAdd = [];
        $rawParticipantIdsToAdd = $payload['participantIdsToAdd'] ?? [];
        if (!is_array($rawParticipantIdsToAdd)) jsonResponse(['error' => 'Los asesores que se van a añadir no son válidos'], 422);
        foreach ($rawParticipantIdsToAdd as $rawRecordId) {
            $recordId = trim((string)$rawRecordId);
            if ($recordId === '') jsonResponse(['error' => 'Uno de los asesores seleccionados no es válido'], 422);
            if (isset($seenParticipantIdsToAdd[$recordId])) jsonResponse(['error' => 'No se puede añadir dos veces al mismo asesor'], 422);
            if (in_array($recordId, $existingParticipantIds, true)) jsonResponse(['error' => 'Uno de los asesores ya pertenece a esta formación'], 409);
            $participantIdsToAdd[] = $recordId;
            $seenParticipantIdsToAdd[$recordId] = true;
        }
        if ($participantIdsToAdd && in_array($existing['status'], ['Realizada', 'No Realizada'], true)) {
            jsonResponse(['error' => 'No se pueden añadir asesores a una formación finalizada'], 409);
        }

        $allowedStatuses = ['Pendiente', 'Convocada', 'Confirmada', 'Realizada', 'No Realizada'];
        $status = $payload['status'] ?? $existing['status'];
        if (!in_array($status, $allowedStatuses, true)) jsonResponse(['error' => 'Estado de formación no válido'], 422);
        if (($participantActions || $participantIdsToAdd) && in_array($status, ['Realizada', 'No Realizada'], true)) {
            jsonResponse(['error' => 'Modifica los participantes antes de finalizar la formación'], 409);
        }

        $session = $existing;
        foreach (['title', 'trainingType', 'confirmedBy', 'meetingLink', 'location', 'emailSubject', 'emailBody'] as $field) {
            if (array_key_exists($field, $payload)) $session[$field] = trim((string)$payload[$field]);
        }
        if ($session['title'] === '') jsonResponse(['error' => 'Indica un nombre para la formación'], 422);
        $session['status'] = $status;
        if (array_key_exists('scheduledAt', $payload)) {
            $dbDate = normalizeDateTime($payload['scheduledAt']);
            $session['scheduledAt'] = toIsoDateTime($dbDate);
        }
        if (array_key_exists('durationMinutes', $payload)) {
            $session['durationMinutes'] = max(10, min(480, (int)$payload['durationMinutes']));
        }

        $attendance = is_array($payload['attendance'] ?? null) ? $payload['attendance'] : [];
        if ($status === 'Realizada') {
            foreach ($existing['participants'] as $participant) {
                $value = $attendance[$participant['recordId']] ?? null;
                if (!in_array($value, ['Asistió', 'No presentado'], true)) {
                    jsonResponse(['error' => 'Debes indicar la asistencia de todos los participantes'], 422);
                }
            }
            $attended = count(array_filter($attendance, fn($value) => $value === 'Asistió'));
            if ($attended === 0) $session['status'] = 'No Realizada';
            $session['completedAt'] = date('Y-m-d\TH:i');
        } elseif ($status === 'No Realizada') {
            foreach ($existing['participants'] as $participant) $attendance[$participant['recordId']] = 'No presentado';
            $session['completedAt'] = date('Y-m-d\TH:i');
        } else {
            $session['completedAt'] = null;
        }

        $markInvited = !empty($payload['markInvited']);
        $resetInvitation = !empty($participantIdsToAdd);
        $scheduledDb = normalizeDateTime($session['scheduledAt']);
        $completedDb = normalizeDateTime($session['completedAt']);

        $pdo->beginTransaction();
        $lockSession = $pdo->prepare("SELECT status, client_id FROM training_sessions WHERE id = ? FOR UPDATE");
        $lockSession->execute([$id]);
        $lockedSession = $lockSession->fetch();
        if (!$lockedSession) throw new TrainingSessionApiException('La formación grupal ya no existe', 404);
        if (($participantActions || $participantIdsToAdd) && in_array($lockedSession['status'], ['Realizada', 'No Realizada'], true)) {
            throw new TrainingSessionApiException('No se pueden modificar los participantes de una formación finalizada', 409);
        }

        $lockParticipants = $pdo->prepare("SELECT record_id, response_status, attendance_status, invited_at FROM training_session_participants WHERE session_id = ? ORDER BY created_at, record_id FOR UPDATE");
        $lockParticipants->execute([$id]);
        $lockedParticipantRows = $lockParticipants->fetchAll();
        $lockedParticipantIds = array_map('strval', array_column($lockedParticipantRows, 'record_id'));
        foreach ($participantActions as $participantAction) {
            $recordId = $participantAction['recordId'];
            if (!in_array($recordId, $lockedParticipantIds, true)) {
                throw new TrainingSessionApiException('Uno de los asesores ya no pertenece a esta formación', 409);
            }
        }
        foreach ($participantIdsToAdd as $recordId) {
            if (in_array($recordId, $lockedParticipantIds, true)) {
                throw new TrainingSessionApiException('Uno de los asesores ya pertenece a esta formación', 409);
            }
        }

        $detachedParticipantIds = array_map(fn($participantAction) => $participantAction['recordId'], array_values($participantActions));
        $finalParticipantIds = array_values(array_unique(array_merge(
            array_values(array_diff($lockedParticipantIds, $detachedParticipantIds)),
            $participantIdsToAdd
        )));

        if ($participantIdsToAdd) {
            $recordIdsToLock = array_values(array_unique(array_merge($lockedParticipantIds, $participantIdsToAdd)));
            sort($recordIdsToLock, SORT_STRING);
            $recordPlaceholders = implode(',', array_fill(0, count($recordIdsToLock), '?'));
            $recordStmt = $pdo->prepare("SELECT id, client_id, marca, email, data FROM records WHERE id IN ($recordPlaceholders) ORDER BY id FOR UPDATE");
            $recordStmt->execute($recordIdsToLock);
            $recordsById = [];
            foreach ($recordStmt->fetchAll() as $record) $recordsById[(string)$record['id']] = $record;

            foreach ($participantIdsToAdd as $recordId) {
                if (!isset($recordsById[$recordId])) {
                    throw new TrainingSessionApiException('Uno de los asesores seleccionados ya no existe', 409);
                }
                $recordData = json_decode($recordsById[$recordId]['data'], true) ?: [];
                $formation = isset($recordData['formacion']) && is_array($recordData['formacion']) ? $recordData['formacion'] : [];
                if (!empty($formation['groupId'])) {
                    throw new TrainingSessionApiException('Uno de los asesores ya pertenece a otra formación grupal', 409);
                }
                if (($formation['status'] ?? 'Pendiente') !== 'Pendiente' || empty($recordData['reqFormacion'])) {
                    throw new TrainingSessionApiException('Solo se pueden añadir asesores pendientes de formación', 409);
                }
            }

            $clientIds = [];
            $brands = [];
            foreach ($finalParticipantIds as $recordId) {
                if (!isset($recordsById[$recordId])) {
                    throw new TrainingSessionApiException('No se pudo validar la composición final del grupo', 409);
                }
                $record = $recordsById[$recordId];
                $recordData = json_decode($record['data'], true) ?: [];
                if ($record['client_id'] !== null) $clientIds[(string)$record['client_id']] = true;
                $brand = trim((string)($record['marca'] ?: ($recordData['marca'] ?? '')));
                if ($brand !== '') $brands[mb_strtolower($brand)] = true;
            }
            if (count($clientIds) > 1 || count($brands) > 1) {
                throw new TrainingSessionApiException('Los asesores deben pertenecer a la misma marca y país', 422);
            }
        }
        if ($session['status'] === 'Realizada') {
            foreach ($lockedParticipantIds as $recordId) {
                $value = $attendance[$recordId] ?? null;
                if (!in_array($value, ['Asistió', 'No presentado'], true)) {
                    throw new TrainingSessionApiException('Debes indicar la asistencia de todos los participantes', 422);
                }
            }
        }

        $stmt = $pdo->prepare("UPDATE training_sessions SET
            title=?, training_type=?, status=?, scheduled_at=?, completed_at=?, confirmed_by=?, meeting_link=?, location=?,
            duration_minutes=?, email_subject=?, email_body=?, invitation_sent_at=CASE WHEN ? = 1 THEN NULL WHEN ? = 1 THEN NOW() ELSE invitation_sent_at END
            WHERE id=?");
        $stmt->execute([
            $session['title'], $session['trainingType'], $session['status'], $scheduledDb, $completedDb,
            $session['confirmedBy'] ?: null, $session['meetingLink'] ?: null, $session['location'] ?: null,
            $session['durationMinutes'], $session['emailSubject'] ?: null, $session['emailBody'] ?: null,
            $resetInvitation ? 1 : 0, $markInvited ? 1 : 0, $id
        ]);

        $updateParticipant = $pdo->prepare("UPDATE training_session_participants SET response_status=?, attendance_status=?, invited_at=CASE WHEN ? = 1 THEN NULL WHEN ? = 1 THEN NOW() ELSE invited_at END WHERE session_id=? AND record_id=?");
        foreach ($lockedParticipantRows as $participantRow) {
            $participant = [
                'recordId' => (string)$participantRow['record_id'],
                'attendanceStatus' => $participantRow['attendance_status'] ?: 'Pendiente'
            ];
            if (isset($participantActions['record:' . $participant['recordId']])) continue;
            $participantStatus = in_array($session['status'], ['Realizada', 'No Realizada'], true)
                ? ($attendance[$participant['recordId']] ?? $participant['attendanceStatus'])
                : 'Pendiente';
            if (!in_array($participantStatus, ['Asistió', 'No presentado'], true)) $participantStatus = 'Pendiente';
            $trainingStatus = participantTrainingStatus($session['status'], $participantStatus);
            $updateParticipant->execute([$trainingStatus, $participantStatus, $resetInvitation ? 1 : 0, $markInvited ? 1 : 0, $id, $participant['recordId']]);
            syncParticipantRecord($pdo, $participant['recordId'], $session, $participantStatus);
        }

        $detached = [];
        $deleteParticipant = $pdo->prepare("DELETE FROM training_session_participants WHERE session_id = ? AND record_id = ?");
        foreach ($participantActions as $participantAction) {
            $recordId = $participantAction['recordId'];
            if ($participantAction['action'] === 'pending') {
                syncIndividualTrainingRecord($pdo, $recordId, 'Pendiente', '', null, $session['trainingType']);
            } else {
                syncIndividualTrainingRecord(
                    $pdo,
                    $recordId,
                    'Convocada',
                    $participantAction['scheduledAt'],
                    $participantAction['confirmedBy'],
                    $session['trainingType']
                );
            }
            $deleteParticipant->execute([$id, $recordId]);
            $detached[] = $participantAction;
        }

        $insertParticipant = $pdo->prepare("INSERT INTO training_session_participants
            (session_id, record_id, response_status, attendance_status, invited_at)
            VALUES (?, ?, ?, 'Pendiente', NULL)");
        foreach ($participantIdsToAdd as $recordId) {
            try {
                $insertParticipant->execute([
                    $id,
                    $recordId,
                    participantTrainingStatus($session['status'], 'Pendiente')
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') {
                    throw new TrainingSessionApiException('Uno de los asesores ya pertenece a otra formación grupal', 409);
                }
                throw $e;
            }
            syncParticipantRecord($pdo, $recordId, $session, 'Pendiente');
        }

        $membershipChanged = !empty($participantActions) || !empty($participantIdsToAdd);
        $remainingParticipantIds = $finalParticipantIds;
        $convertedRecordId = null;
        $sessionDissolved = false;
        if (count($remainingParticipantIds) === 1 && $membershipChanged) {
            $convertedRecordId = $remainingParticipantIds[0];
            syncIndividualTrainingRecord(
                $pdo,
                $convertedRecordId,
                $session['status'],
                $session['scheduledAt'],
                $session['confirmedBy'],
                $session['trainingType']
            );
            $deleteSession = $pdo->prepare("DELETE FROM training_sessions WHERE id = ?");
            $deleteSession->execute([$id]);
            $sessionDissolved = true;
        } elseif (count($remainingParticipantIds) === 0 && $membershipChanged) {
            $deleteSession = $pdo->prepare("DELETE FROM training_sessions WHERE id = ?");
            $deleteSession->execute([$id]);
            $sessionDissolved = true;
        }
        $pdo->commit();
        jsonResponse([
            'session' => $sessionDissolved ? null : findSession($pdo, $id),
            'detached' => $detached,
            'addedRecordIds' => $participantIdsToAdd,
            'convertedRecordId' => $convertedRecordId
        ]);
    }

    if ($method === 'DELETE') {
        $id = trim((string)($_GET['id'] ?? ''));
        if ($id === '') jsonResponse(['error' => 'ID de sesión no proporcionado'], 400);
        $session = findSession($pdo, $id);
        if (!$session) jsonResponse(['error' => 'La formación grupal no existe'], 404);
        if (in_array($session['status'], ['Realizada', 'No Realizada'], true)) {
            jsonResponse(['error' => 'Una formación finalizada no se puede disolver'], 409);
        }

        $pdo->beginTransaction();
        foreach ($session['participants'] as $participant) {
            $stmt = $pdo->prepare("SELECT data FROM records WHERE id = ? FOR UPDATE");
            $stmt->execute([$participant['recordId']]);
            $row = $stmt->fetch();
            if (!$row) continue;
            $data = json_decode($row['data'], true) ?: [];
            $formation = isset($data['formacion']) && is_array($data['formacion']) ? $data['formacion'] : [];
            unset($formation['groupId'], $formation['groupTitle'], $formation['dateCompleted']);
            $formation['status'] = 'Pendiente';
            $formation['date'] = '';
            $formation['confirmedBy'] = null;
            $data['formacion'] = $formation;
            $upd = $pdo->prepare("UPDATE records SET data = ? WHERE id = ?");
            $upd->execute([json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $participant['recordId']]);
        }
        $stmt = $pdo->prepare("DELETE FROM training_sessions WHERE id = ?");
        $stmt->execute([$id]);
        $pdo->commit();
        jsonResponse(['success' => true]);
    }

    jsonResponse(['error' => 'Método no permitido'], 405);
} catch (TrainingSessionApiException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['error' => $e->getMessage()], $e->httpStatus);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['error' => $e->getMessage()], 500);
}
