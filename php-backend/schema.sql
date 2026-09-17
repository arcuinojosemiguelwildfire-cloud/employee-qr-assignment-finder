-- Employee QR Assignment Finder - MySQL Schema
-- Generated for Sep 24 Event Deployment

CREATE DATABASE IF NOT EXISTS `event_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `event_db`;

DROP TABLE IF EXISTS `employees`;

CREATE TABLE `employees` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `employee_number` VARCHAR(50) NOT NULL UNIQUE,
  `employee_name` VARCHAR(150) NOT NULL,
  `group_name` VARCHAR(100) NOT NULL,
  `table_name` VARCHAR(100) NOT NULL,
  `room_name` VARCHAR(100) NOT NULL,
  `room_details` VARCHAR(150) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_emp_num` (`employee_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Seed Data (matching event attendees)
INSERT INTO `employees` (`employee_number`, `employee_name`, `group_name`, `table_name`, `room_name`, `room_details`, `department`) VALUES
('EMP00123', 'Juan Dela Cruz', 'Group A', 'Table 12', 'Room 3', 'Main Hall • 2nd Floor', 'Commercial Operations'),
('EMP00124', 'Maria Santos', 'Group B', 'Table 4', 'Room 2', 'Synergy Suite • 1st Floor', 'Marketing & Brand'),
('EMP00125', 'Angelo Reyes', 'Group A', 'Table 12', 'Room 3', 'Main Hall • 2nd Floor', 'Customer Solutions'),
('EMP00201', 'Sofia Garcia', 'Group C', 'Table 8', 'Room 1', 'Innovation Hub • Ground Floor', 'People & Culture (HR)'),
('EMP00342', 'Michael Tan', 'Group B', 'Table 5', 'Room 2', 'Synergy Suite • 1st Floor', 'Supply Chain & Logistics'),
('EMP00456', 'Patricia Lim', 'Group D', 'Table 15', 'Room 4', 'Grand Ballroom • 3rd Floor', 'Finance & Strategy'),
('EMP00578', 'Rafael Gonzales', 'Group C', 'Table 9', 'Room 1', 'Innovation Hub • Ground Floor', 'Quality Assurance'),
('EMP00789', 'Elena Bautista', 'Group A', 'Table 11', 'Room 3', 'Main Hall • 2nd Floor', 'Technical & Engineering'),
('EMP00890', 'David Mendoza', 'Group D', 'Table 16', 'Room 4', 'Grand Ballroom • 3rd Floor', 'Information Technology'),
('EMP00999', 'Christine Flores', 'Group VIP', 'Table 1', 'Executive Lounge', 'Penthouse • 5th Floor', 'Executive Leadership');

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

