CREATE DATABASE IF NOT EXISTS cityalert_db;
USE cityalert_db;

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Pending', 'Resolved') DEFAULT 'Pending',
    is_notified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users Table (Default: admin / admin123)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2y$10$w8T0s0zX6iX8gXQz6G7y3u4Uj8hA5v9L1a2B3c4D5e6F7g8H9i0Jk')
ON DUPLICATE KEY UPDATE username=username;