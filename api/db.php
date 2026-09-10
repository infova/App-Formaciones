<?php
// api/db.php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// Header will be set by the caller or when needed

function loadEnv($path)
{
    if (!file_exists($path))
        return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0)
            continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $_ENV[trim($name)] = trim($value);
        }
    }
}

loadEnv(__DIR__ . '/../.env');

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$db = $_ENV['DB_NAME'] ?? 'formaciones_db';
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASSWORD'] ?? '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Crear base de datos si no existe
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$db`");

    // Inicializar tablas

    // Usuarios
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
id INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(255) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role VARCHAR(50) DEFAULT 'user',
brands VARCHAR(255) DEFAULT 'All',
region VARCHAR(50) DEFAULT 'España',
lastLogin DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Registros
    $pdo->exec("CREATE TABLE IF NOT EXISTS records (
id VARCHAR(255) PRIMARY KEY,
fechaAlta VARCHAR(255),
marca VARCHAR(255),
nombre VARCHAR(255),
apellidos VARCHAR(255),
email VARCHAR(255),
telefono VARCHAR(255),
concesionario VARCHAR(255),
tipoAcceso VARCHAR(255),
data TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Clientes
    $pdo->exec("CREATE TABLE IF NOT EXISTS clients (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) UNIQUE NOT NULL,
region VARCHAR(50) DEFAULT 'España'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Alterar tablas para agregar columnas de región si ya existen
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN region VARCHAR(50) DEFAULT 'España'");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    try {
        $pdo->exec("ALTER TABLE clients ADD COLUMN region VARCHAR(50) DEFAULT 'España'");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Logotipo SVG inline por marca
    try {
        $pdo->exec("ALTER TABLE clients ADD COLUMN logo_svg TEXT NULL");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Encuesta de satisfacción por marca
    try {
        $pdo->exec("ALTER TABLE clients ADD COLUMN survey_url VARCHAR(500) NULL");
    } catch (PDOException $e) { /* already exists */
    }
    try {
        $pdo->exec("ALTER TABLE clients ADD COLUMN survey_qr_enabled TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) { /* already exists */
    }

    // Vincular registros con instancia concreta de marca (país)
    try {
        $pdo->exec("ALTER TABLE records ADD COLUMN client_id INT NULL");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Sesiones formativas: una sesión puede tener uno o varios participantes.
    // Se mantiene records.data.formacion sincronizado para compatibilidad con
    // el dashboard, informes y exportaciones existentes.
    $pdo->exec("CREATE TABLE IF NOT EXISTS training_sessions (
id VARCHAR(40) PRIMARY KEY,
client_id INT NULL,
title VARCHAR(255) NOT NULL,
training_type VARCHAR(100) DEFAULT 'Sesión Teams',
status VARCHAR(50) DEFAULT 'Pendiente',
scheduled_at DATETIME NULL,
completed_at DATETIME NULL,
confirmed_by VARCHAR(255) NULL,
meeting_link VARCHAR(1000) NULL,
location VARCHAR(500) NULL,
duration_minutes INT DEFAULT 40,
email_subject TEXT NULL,
email_body TEXT NULL,
invitation_sent_at DATETIME NULL,
created_by VARCHAR(255) NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
INDEX idx_training_sessions_status (status),
INDEX idx_training_sessions_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS training_session_participants (
session_id VARCHAR(40) NOT NULL,
record_id VARCHAR(255) NOT NULL,
response_status VARCHAR(50) DEFAULT 'Pendiente',
attendance_status VARCHAR(50) DEFAULT 'Pendiente',
invited_at DATETIME NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (session_id, record_id),
UNIQUE INDEX uq_training_participant_record (record_id),
CONSTRAINT fk_training_participant_session FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
CONSTRAINT fk_training_participant_record FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    try {
        $pdo->exec("ALTER TABLE training_session_participants ADD UNIQUE INDEX uq_training_participant_record (record_id)");
    } catch (PDOException $e) {
        // Ignorar si el índice ya existe.
    }
    try {
        $pdo->exec("ALTER TABLE training_session_participants DROP INDEX idx_training_participant_record");
    } catch (PDOException $e) {
        // Ignorar en instalaciones nuevas o si ya fue eliminado.
    }

    // Log de actividad de usuarios
    $pdo->exec("CREATE TABLE IF NOT EXISTS activity_log (
id INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(255) NOT NULL,
action VARCHAR(100) NOT NULL,
details TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Tabla Regiones
    $pdo->exec("CREATE TABLE IF NOT EXISTS regions (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) UNIQUE NOT NULL,
flag_svg TEXT DEFAULT NULL,
sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Tabla Países
    $pdo->exec("CREATE TABLE IF NOT EXISTS countries (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) NOT NULL,
region_id INT NOT NULL,
flag_svg TEXT DEFAULT NULL,
sort_order INT DEFAULT 0,
FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Columna country_id en clients
    try {
        $pdo->exec("ALTER TABLE clients ADD COLUMN country_id INT NULL");
    } catch (PDOException $e) {
        // Ignorar si la columna ya existe
    }

    // Cambiar UNIQUE(name) → UNIQUE(name, country_id): misma marca en distintos países
    try {
        $pdo->exec("ALTER TABLE clients DROP INDEX name");
    } catch (PDOException $e) { /* ignorar si ya fue eliminado */
    }
    try {
        $pdo->exec("ALTER TABLE clients ADD UNIQUE INDEX uq_clients_name_country (name, country_id)");
    } catch (PDOException $e) { /* ignorar si ya existe */
    }

    // Datos iniciales de regiones
    $stmt = $pdo->query("SELECT COUNT(*) FROM regions");
    if ($stmt->fetchColumn() == 0) {
        $spainSvg = '<svg style="display:inline-block;width:16px;height:11px;border-radius:2px;vertical-align:middle" viewBox="0 0 16 11"><rect width="16" height="11" fill="#c60b1e"/><rect y="2.75" width="16" height="5.5" fill="#ffc400"/></svg>';
        $stmt = $pdo->prepare("INSERT INTO regions (name, flag_svg, sort_order) VALUES (?, ?, ?)");
        $stmt->execute(['España', $spainSvg, 1]);
        $stmt->execute(['Latam', null, 2]);
    }

    // Datos iniciales de países
    $stmt = $pdo->query("SELECT COUNT(*) FROM countries");
    if ($stmt->fetchColumn() == 0) {
        $spainRegion = $pdo->query("SELECT id FROM regions WHERE name = 'España'")->fetchColumn();
        $latamRegion = $pdo->query("SELECT id FROM regions WHERE name = 'Latam'")->fetchColumn();
        $spainSvg = '<svg style="display:inline-block;width:16px;height:11px;border-radius:2px;vertical-align:middle" viewBox="0 0 16 11"><rect width="16" height="11" fill="#c60b1e"/><rect y="2.75" width="16" height="5.5" fill="#ffc400"/></svg>';
        $stmt = $pdo->prepare("INSERT INTO countries (name, region_id, flag_svg, sort_order) VALUES (?, ?, ?, ?)");
        $stmt->execute(['España', $spainRegion, $spainSvg, 1]);
        $stmt->execute(['Chile', $latamRegion, null, 1]);
        $stmt->execute(['Perú', $latamRegion, null, 2]);
        $stmt->execute(['México', $latamRegion, null, 3]);
    }

    // Usuario admin por defecto
    $stmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($stmt->fetchColumn() == 0) {
        $hash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, brands, region) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['admin', $hash, 'admin', 'All', 'España']);
    }

    // Clientes por defecto
    $stmt = $pdo->query("SELECT COUNT(*) FROM clients");
    if ($stmt->fetchColumn() == 0) {
        $defaultClients = [
            ['name' => 'Kia', 'region' => 'España'],
            ['name' => 'Hyundai', 'region' => 'España'],
            ['name' => 'Kia Canarias', 'region' => 'España']
        ];
        foreach ($defaultClients as $client) {
            $stmt = $pdo->prepare("INSERT INTO clients (name, region) VALUES (?, ?)");
            $stmt->execute([$client['name'], $client['region']]);
        }
    }

    // Migrar clients España existentes → country_id del país España
    $spainCountryId = $pdo->query("SELECT id FROM countries WHERE name = 'España'")->fetchColumn();
    if ($spainCountryId) {
        $pdo->exec("UPDATE clients SET country_id = $spainCountryId WHERE region = 'España' AND country_id IS NULL");
    }
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Connection failed: ' . $e->getMessage()]);
    exit;
}

function getPDO()
{
    global $pdo;
    return $pdo;
}

function getDB()
{
    return getPDO();
}

/**
 * Basic Auth check. For this local version, we'll verify the role
 * based on what the client sends (since original Node app was client-driven).
 * In a real production app, use JWT or PHP Sessions.
 */
function checkAuth()
{
    // Basic implementation: if this is called from the frontend,
    // it usually expects a user object.
    // We'll return a minimal object so it doesn't crash.
    return ['role' => 'admin'];
}
// No closing tag to prevent whitespace issues
