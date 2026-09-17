# Employee QR Assignment Finder - PHP/MySQL Backend

This directory contains the lightweight PHP/MySQL backend assets for production deployment on standard cPanel / Apache / Nginx PHP hosting.

## Files
- `schema.sql`: MySQL database schema with indexes and initial sample employees.
- `db.php`: Secure PDO database connection config with environment variable support.
- `lookup.php`: Prepared-statement server endpoint returning employee assignment JSON.

## Quick Setup on cPanel / MySQL Host
1. Import `schema.sql` into your MySQL database using phpMyAdmin or MySQL CLI.
2. In `db.php`, update the database credentials (or define `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` environment variables).
3. Place `lookup.php` and `db.php` in your public web root (e.g. `/api/lookup.php`).
4. Point your frontend build files to this endpoint.
