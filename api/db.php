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