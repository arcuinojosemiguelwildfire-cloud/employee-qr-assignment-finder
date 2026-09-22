<?php
/**
 * Admin Session Guard
 */
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function requireAdminAuth(): void {
    if (empty($_SESSION['admin_user'])) {
        header('Location: login.php');
        exit;
    }
}
