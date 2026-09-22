-- Nestlé MEM 2026 - MySQL Schema
-- Updated with client data structure: MEM Group, MEM Priority Group, Tables, Employee Number, Name, Email
-- Room functionality has been completely removed.

CREATE DATABASE IF NOT EXISTS `event_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `event_db`;

DROP TABLE IF EXISTS `employees`;

CREATE TABLE `employees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `employee_number` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `mem_group` VARCHAR(50) NOT NULL,
  `mem_priority_group` VARCHAR(100) NOT NULL,
  `tables` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_emp_num` (`employee_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Verified Client Seed Record
INSERT INTO `employees` (`employee_number`, `name`, `email`, `mem_group`, `mem_priority_group`, `tables`) VALUES
('11248494', 'Donnel Jun Tiedra', 'asd.sas@ph.nestle.com', '5', 'Efficiency', '["Table 3", "Table 6", "Table 8", "Table 9", "Table 12"]');

-- Administrator Credentials Table
DROP TABLE IF EXISTS `admins`;

CREATE TABLE `admins` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Admin Account: admin / admin2026
-- Hash generated via password_hash('admin2026', PASSWORD_BCRYPT)
INSERT INTO `admins` (`username`, `password_hash`) VALUES
('admin', '$2y$10$wTfZM2rYp80N97i9yYn.cO0QGqEwM10pT2XyZ5kUo3j8kP.i2p5Wy');
