-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 08, 2026 at 10:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `trafeco_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `archive_runs`
--

CREATE TABLE `archive_runs` (
  `id` int(10) UNSIGNED NOT NULL,
  `run_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `triggered_by` int(10) UNSIGNED DEFAULT NULL,
  `trigger_type` enum('manual','auto') NOT NULL DEFAULT 'manual',
  `cutoff_date` date NOT NULL,
  `attendance_count` int(10) UNSIGNED DEFAULT 0,
  `leave_count` int(10) UNSIGNED DEFAULT 0,
  `payslip_count` int(10) UNSIGNED DEFAULT 0,
  `csv_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `scan_type` enum('time_in','time_out') NOT NULL,
  `scanned_by` int(10) UNSIGNED DEFAULT NULL,
  `scanned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `qr_token` varchar(100) DEFAULT NULL,
  `status_override` enum('on_time','late') DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_logs`
--

INSERT INTO `attendance_logs` (`id`, `user_id`, `scan_type`, `scanned_by`, `scanned_at`, `qr_token`, `status_override`, `archived_at`) VALUES
(230, 11, 'time_in', 2, '2026-07-01 06:55:00', NULL, NULL, NULL),
(231, 11, 'time_out', 2, '2026-07-01 12:00:00', NULL, NULL, NULL),
(232, 11, 'time_in', 2, '2026-07-01 12:58:00', NULL, NULL, NULL),
(233, 11, 'time_out', 2, '2026-07-01 17:05:00', NULL, NULL, NULL),
(234, 11, 'time_in', 2, '2026-07-02 06:58:00', NULL, NULL, NULL),
(235, 11, 'time_out', 2, '2026-07-02 12:01:00', NULL, NULL, NULL),
(236, 11, 'time_in', 2, '2026-07-02 12:59:00', NULL, NULL, NULL),
(237, 11, 'time_out', 2, '2026-07-02 17:02:00', NULL, NULL, NULL),
(238, 11, 'time_in', 2, '2026-07-03 07:32:00', NULL, NULL, NULL),
(239, 11, 'time_out', 2, '2026-07-03 12:00:00', NULL, NULL, NULL),
(240, 11, 'time_in', 2, '2026-07-03 12:57:00', NULL, NULL, NULL),
(241, 11, 'time_out', 2, '2026-07-03 17:05:00', NULL, NULL, NULL),
(242, 11, 'time_in', 2, '2026-07-06 06:57:00', NULL, NULL, NULL),
(243, 11, 'time_out', 2, '2026-07-06 12:00:00', NULL, NULL, NULL),
(244, 11, 'time_in', 2, '2026-07-06 12:58:00', NULL, NULL, NULL),
(245, 11, 'time_out', 2, '2026-07-06 17:00:00', NULL, NULL, NULL),
(246, 11, 'time_in', 2, '2026-07-07 06:54:00', NULL, NULL, NULL),
(247, 11, 'time_out', 2, '2026-07-07 12:00:00', NULL, NULL, NULL),
(248, 11, 'time_in', 2, '2026-07-07 12:55:00', NULL, NULL, NULL),
(249, 11, 'time_out', 2, '2026-07-07 17:04:00', NULL, NULL, NULL),
(250, 11, 'time_in', 2, '2026-07-09 06:59:00', NULL, NULL, NULL),
(251, 11, 'time_out', 2, '2026-07-09 12:00:00', NULL, NULL, NULL),
(252, 11, 'time_in', 2, '2026-07-09 12:59:00', NULL, NULL, NULL),
(253, 11, 'time_out', 2, '2026-07-09 17:01:00', NULL, NULL, NULL),
(254, 11, 'time_in', 2, '2026-07-10 06:56:00', NULL, NULL, NULL),
(255, 11, 'time_out', 2, '2026-07-10 12:00:00', NULL, NULL, NULL),
(256, 11, 'time_in', 2, '2026-07-10 12:58:00', NULL, NULL, NULL),
(257, 11, 'time_out', 2, '2026-07-10 17:00:00', NULL, NULL, NULL),
(258, 11, 'time_in', 2, '2026-07-14 07:35:00', NULL, 'on_time', NULL),
(259, 11, 'time_out', 2, '2026-07-14 12:00:00', NULL, NULL, NULL),
(260, 11, 'time_in', 2, '2026-07-14 12:58:00', NULL, NULL, NULL),
(261, 11, 'time_out', 2, '2026-07-14 17:05:00', NULL, NULL, NULL),
(262, 11, 'time_in', 2, '2026-07-15 06:58:00', NULL, NULL, NULL),
(263, 11, 'time_out', 2, '2026-07-15 12:00:00', NULL, NULL, NULL),
(264, 11, 'time_in', 2, '2026-07-15 12:59:00', NULL, NULL, NULL),
(265, 11, 'time_out', 2, '2026-07-15 17:03:00', NULL, NULL, NULL),
(266, 11, 'time_in', 2, '2026-07-16 06:55:00', NULL, NULL, NULL),
(267, 11, 'time_out', 2, '2026-07-16 12:00:00', NULL, NULL, NULL),
(268, 11, 'time_in', 2, '2026-07-16 12:58:00', NULL, NULL, NULL),
(269, 11, 'time_out', 2, '2026-07-16 17:02:00', NULL, NULL, NULL),
(270, 11, 'time_in', 2, '2026-07-17 06:57:00', NULL, NULL, NULL),
(271, 11, 'time_out', 2, '2026-07-17 12:00:00', NULL, NULL, NULL),
(272, 11, 'time_in', 2, '2026-07-17 12:56:00', NULL, NULL, NULL),
(273, 11, 'time_out', 2, '2026-07-17 17:00:00', NULL, NULL, NULL),
(274, 11, 'time_in', 2, '2026-07-20 07:31:00', NULL, 'on_time', NULL),
(275, 11, 'time_out', 2, '2026-07-20 12:00:00', NULL, NULL, NULL),
(276, 11, 'time_in', 2, '2026-07-20 12:59:00', NULL, NULL, NULL),
(277, 11, 'time_out', 2, '2026-07-20 17:05:00', NULL, NULL, NULL),
(278, 11, 'time_in', 2, '2026-07-21 06:58:00', NULL, NULL, NULL),
(279, 11, 'time_out', 2, '2026-07-21 12:00:00', NULL, NULL, NULL),
(280, 11, 'time_in', 2, '2026-07-21 12:57:00', NULL, NULL, NULL),
(281, 11, 'time_out', 2, '2026-07-21 17:01:00', NULL, NULL, NULL),
(282, 11, 'time_in', 2, '2026-07-22 06:56:00', NULL, NULL, NULL),
(283, 11, 'time_out', 2, '2026-07-22 12:00:00', NULL, NULL, NULL),
(284, 11, 'time_in', 2, '2026-07-22 12:58:00', NULL, NULL, NULL),
(285, 11, 'time_out', 2, '2026-07-22 17:03:00', NULL, NULL, NULL),
(286, 11, 'time_in', 2, '2026-07-24 06:59:00', NULL, NULL, NULL),
(287, 11, 'time_out', 2, '2026-07-24 12:00:00', NULL, NULL, NULL),
(288, 11, 'time_in', 2, '2026-07-24 12:58:00', NULL, NULL, NULL),
(289, 11, 'time_out', 2, '2026-07-24 17:00:00', NULL, NULL, NULL),
(290, 11, 'time_in', 2, '2026-07-27 06:55:00', NULL, NULL, NULL),
(291, 11, 'time_out', 2, '2026-07-27 12:00:00', NULL, NULL, NULL),
(292, 11, 'time_in', 2, '2026-07-27 12:59:00', NULL, NULL, NULL),
(293, 11, 'time_out', 2, '2026-07-27 17:04:00', NULL, NULL, NULL),
(294, 11, 'time_in', 2, '2026-07-29 06:57:00', NULL, NULL, NULL),
(295, 11, 'time_out', 2, '2026-07-29 12:00:00', NULL, NULL, NULL),
(296, 11, 'time_in', 2, '2026-07-29 12:58:00', NULL, NULL, NULL),
(297, 11, 'time_out', 2, '2026-07-29 17:02:00', NULL, NULL, NULL),
(298, 11, 'time_in', 2, '2026-07-30 07:40:00', NULL, NULL, NULL),
(299, 11, 'time_out', 2, '2026-07-30 12:00:00', NULL, NULL, NULL),
(300, 11, 'time_in', 2, '2026-07-30 12:56:00', NULL, NULL, NULL),
(301, 11, 'time_out', 2, '2026-07-30 17:00:00', NULL, NULL, NULL),
(302, 11, 'time_in', 2, '2026-07-31 06:58:00', NULL, NULL, NULL),
(303, 11, 'time_out', 2, '2026-07-31 12:00:00', NULL, NULL, NULL),
(304, 11, 'time_in', 2, '2026-07-31 12:59:00', NULL, NULL, NULL),
(305, 11, 'time_out', 2, '2026-07-31 17:05:00', NULL, NULL, NULL),
(306, 14, 'time_in', 2, '2026-07-01 07:58:00', NULL, NULL, NULL),
(307, 14, 'time_out', 2, '2026-07-01 13:02:00', NULL, NULL, NULL),
(308, 14, 'time_in', 2, '2026-07-02 08:00:00', NULL, NULL, NULL),
(309, 14, 'time_out', 2, '2026-07-02 13:00:00', NULL, NULL, NULL),
(310, 14, 'time_in', 2, '2026-07-03 09:05:00', NULL, NULL, NULL),
(311, 14, 'time_out', 2, '2026-07-03 13:00:00', NULL, NULL, NULL),
(312, 14, 'time_in', 2, '2026-07-06 07:59:00', NULL, NULL, NULL),
(313, 14, 'time_out', 2, '2026-07-06 13:01:00', NULL, NULL, NULL),
(314, 14, 'time_in', 2, '2026-07-07 07:57:00', NULL, NULL, NULL),
(315, 14, 'time_out', 2, '2026-07-07 13:00:00', NULL, NULL, NULL),
(316, 14, 'time_in', 2, '2026-07-09 08:01:00', NULL, NULL, NULL),
(317, 14, 'time_out', 2, '2026-07-09 13:00:00', NULL, NULL, NULL),
(318, 14, 'time_in', 2, '2026-07-10 07:58:00', NULL, NULL, NULL),
(319, 14, 'time_out', 2, '2026-07-10 13:03:00', NULL, NULL, NULL),
(320, 14, 'time_in', 2, '2026-07-14 09:10:00', NULL, NULL, NULL),
(321, 14, 'time_out', 2, '2026-07-14 13:00:00', NULL, NULL, NULL),
(322, 14, 'time_in', 2, '2026-07-15 07:59:00', NULL, NULL, NULL),
(323, 14, 'time_out', 2, '2026-07-15 13:02:00', NULL, NULL, NULL),
(324, 14, 'time_in', 2, '2026-07-16 07:58:00', NULL, NULL, NULL),
(325, 14, 'time_out', 2, '2026-07-16 13:00:00', NULL, NULL, NULL),
(326, 14, 'time_in', 2, '2026-07-17 08:00:00', NULL, NULL, NULL),
(327, 14, 'time_out', 2, '2026-07-17 13:01:00', NULL, NULL, NULL),
(328, 14, 'time_in', 2, '2026-07-20 09:00:00', NULL, NULL, NULL),
(329, 14, 'time_out', 2, '2026-07-20 13:00:00', NULL, NULL, NULL),
(330, 14, 'time_in', 2, '2026-07-21 07:57:00', NULL, NULL, NULL),
(331, 14, 'time_out', 2, '2026-07-21 13:02:00', NULL, NULL, NULL),
(332, 14, 'time_in', 2, '2026-07-22 07:59:00', NULL, NULL, NULL),
(333, 14, 'time_out', 2, '2026-07-22 13:00:00', NULL, NULL, NULL),
(334, 14, 'time_in', 2, '2026-07-24 08:00:00', NULL, NULL, NULL),
(335, 14, 'time_out', 2, '2026-07-24 13:03:00', NULL, NULL, NULL),
(336, 14, 'time_in', 2, '2026-07-27 07:58:00', NULL, NULL, NULL),
(337, 14, 'time_out', 2, '2026-07-27 13:00:00', NULL, NULL, NULL),
(338, 14, 'time_in', 2, '2026-07-29 07:59:00', NULL, NULL, NULL),
(339, 14, 'time_out', 2, '2026-07-29 13:01:00', NULL, NULL, NULL),
(340, 14, 'time_in', 2, '2026-07-30 09:15:00', NULL, NULL, NULL),
(341, 14, 'time_out', 2, '2026-07-30 13:00:00', NULL, NULL, NULL),
(342, 14, 'time_in', 2, '2026-07-31 07:58:00', NULL, NULL, NULL),
(343, 14, 'time_out', 2, '2026-07-31 13:02:00', NULL, NULL, NULL),
(344, 3, 'time_in', 2, '2026-08-18 15:48:51', '92085a74362e28e47da39fbb1b1b1a0b', NULL, NULL),
(345, 3, 'time_in', 2, '2026-08-18 15:48:51', '92085a74362e28e47da39fbb1b1b1a0b', NULL, NULL),
(346, 2, 'time_in', 2, '2026-08-29 11:29:49', '3b2d43f1703eec2056defac2c350794c', NULL, NULL),
(347, 10, 'time_in', 2, '2026-08-29 11:31:54', '2f8acefb265f662033fb4b24a61c14c6', NULL, NULL),
(348, 3, 'time_in', 2, '2026-08-29 11:33:30', 'fc07f0c9a14360b0614f51ffa7e14d8b', NULL, NULL),
(349, 3, 'time_in', 2, '2026-08-29 11:33:30', 'fc07f0c9a14360b0614f51ffa7e14d8b', NULL, NULL),
(350, 3, 'time_in', 2, '2026-08-29 11:33:30', 'fc07f0c9a14360b0614f51ffa7e14d8b', NULL, NULL),
(351, 3, 'time_in', 2, '2026-08-29 11:33:30', 'fc07f0c9a14360b0614f51ffa7e14d8b', NULL, NULL),
(352, 11, 'time_in', 2, '2026-09-22 17:19:01', 'c324f07fb71daf6507d9a9baeb1a0321', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(60) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `module`, `details`, `ip_address`, `created_at`) VALUES
(1, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-27 05:42:11'),
(2, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-07-27 05:43:57'),
(3, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-07-27 05:43:59'),
(4, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=1', '::1', '2026-07-27 05:44:00'),
(5, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=1', '::1', '2026-07-27 05:44:03'),
(6, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=1', '::1', '2026-07-27 05:44:03'),
(7, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 03:25:34'),
(8, 2, 'create_employee', 'employees', 'Created employee James Oliver Emano (staff: EMP002)', '::1', '2026-07-28 03:27:16'),
(9, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=10', '::1', '2026-07-28 03:27:35'),
(10, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 06:17:08'),
(11, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:13'),
(12, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:14'),
(13, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:15'),
(14, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:17'),
(15, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:20'),
(16, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:22'),
(17, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:23'),
(18, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:24'),
(19, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:24'),
(20, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:25'),
(21, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 06:17:40'),
(22, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 06:17:42'),
(23, 2, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 06:19:14'),
(24, 10, 'login', 'auth', 'User logged in', '::1', '2026-07-28 06:19:19'),
(25, 10, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 06:20:00'),
(26, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 09:55:05'),
(27, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 09:55:17'),
(28, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 09:55:20'),
(29, 2, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 10:17:48'),
(30, 10, 'login', 'auth', 'User logged in', '::1', '2026-07-28 10:17:53'),
(31, 10, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 10:18:05'),
(32, 10, 'login', 'auth', 'User logged in', '::1', '2026-07-28 10:18:15'),
(33, 10, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 10:18:30'),
(34, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 10:18:35'),
(35, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 10:56:22'),
(36, 10, 'login', 'auth', 'User logged in', '::1', '2026-07-28 11:00:02'),
(37, 10, 'login', 'auth', 'User logged in', '::1', '2026-07-28 11:00:45'),
(38, 10, 'request_leave', 'leave', 'Submitted Sick Leave request for 2026-07-28 to 2026-07-29', '::1', '2026-07-28 11:01:25'),
(39, 10, 'logout', 'auth', 'User logged out', '::1', '2026-07-28 11:01:29'),
(40, 2, 'login', 'auth', 'User logged in', '::1', '2026-07-28 11:01:34'),
(41, 2, 'approve_leave', 'leave', 'Approved leave request id=1', '::1', '2026-07-28 11:01:42'),
(42, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 12:06:59'),
(43, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 12:07:00'),
(44, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to on_time', '::1', '2026-07-28 13:08:58'),
(45, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=1 to late', '::1', '2026-07-28 13:09:00'),
(46, 2, 'clear_attendance_logs', 'qr_attendance', 'All attendance logs cleared', '::1', '2026-07-28 16:31:43'),
(47, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 07:35:59'),
(48, 2, 'clear_attendance_logs', 'qr_attendance', 'All attendance logs cleared', '::1', '2026-08-02 07:36:29'),
(49, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-02 13:49:07'),
(50, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-02 13:56:25'),
(51, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 13:56:32'),
(52, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-02 13:56:34'),
(53, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 13:57:08'),
(54, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 13:58:36'),
(55, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-08-02 13:59:35'),
(56, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 14:04:21'),
(57, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-02 18:24:05'),
(58, 2, 'clear_leave_requests', 'leave', 'All leave requests cleared', '::1', '2026-08-02 18:25:02'),
(59, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-02 18:25:23'),
(60, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-02 18:25:28'),
(61, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-02 18:27:02'),
(62, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-06 03:06:48'),
(63, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 03:07:51'),
(64, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-06 03:07:58'),
(65, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 03:09:18'),
(66, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-06 15:45:44'),
(67, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-08-06 15:46:23'),
(68, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=14', '::1', '2026-08-06 15:46:28'),
(69, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 15:47:16'),
(70, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-06 15:47:21'),
(71, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 15:48:23'),
(72, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-06 15:48:52'),
(73, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 15:50:08'),
(74, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-06 16:16:26'),
(75, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 16:19:52'),
(76, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-06 16:19:57'),
(77, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-08-06 16:20:00'),
(78, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-08-06 16:20:00'),
(79, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-06 16:20:29'),
(80, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-08-06 16:20:33'),
(81, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-08-06 16:20:33'),
(82, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-06 16:20:35'),
(83, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-06 16:20:39'),
(84, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 01:37:53'),
(85, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 01:38:42'),
(86, 3, 'generate_payslip', 'payslips', 'Generated payslip id=1 for employee=11, cutoff=2026-07-01 to 2026-07-15', '::1', '2026-08-07 01:41:26'),
(87, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 01:41:50'),
(88, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 01:41:54'),
(89, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 01:42:45'),
(90, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 01:42:50'),
(91, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:01:29'),
(92, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:01:33'),
(93, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:01:37'),
(94, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:02:42'),
(95, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:03:11'),
(96, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:07:36'),
(97, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:07:43'),
(98, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:08:26'),
(99, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:13:36'),
(100, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:13:48'),
(101, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:13:54'),
(102, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:14:12'),
(103, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:14:17'),
(104, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:15:12'),
(105, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:15:17'),
(106, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:17:52'),
(107, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:17:56'),
(108, 1, 'decline_payslip', 'payslips', 'Declined payslip id=1', '::1', '2026-08-07 02:18:03'),
(109, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:34:15'),
(110, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:36:23'),
(111, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:40:25'),
(112, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:47:59'),
(113, 3, 'generate_payslip', 'payslips', 'Generated payslip id=2 for employee=11, cutoff=2026-07-01 to 2026-07-15', '::1', '2026-08-07 02:49:04'),
(114, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 02:52:30'),
(115, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 02:52:39'),
(116, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:06:02'),
(117, 1, 'decline_payslip', 'payslips', 'Declined payslip id=2', '::1', '2026-08-07 03:06:21'),
(118, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:07:01'),
(119, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:07:10'),
(120, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:19:02'),
(121, 3, 'generate_payslip', 'payslips', 'Generated payslip id=3 for employee=11, cutoff=2026-07-01 to 2026-07-15', '::1', '2026-08-07 03:20:33'),
(122, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:20:35'),
(123, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:20:40'),
(124, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:21:10'),
(125, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:21:15'),
(126, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:21:42'),
(127, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:21:47'),
(128, 1, 'approve_payslip', 'payslips', 'Approved payslip id=3', '::1', '2026-08-07 03:21:52'),
(129, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:22:49'),
(130, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:22:54'),
(131, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:24:23'),
(132, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:24:30'),
(133, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:25:49'),
(134, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-07 03:38:37'),
(135, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-07 03:40:51'),
(136, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-07 12:19:23'),
(137, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-10 02:08:39'),
(138, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-10 03:27:38'),
(139, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-10 03:27:43'),
(140, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-10 06:41:49'),
(141, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-10 06:41:54'),
(142, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-10 06:42:01'),
(143, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-10 06:42:02'),
(144, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-10 06:42:04'),
(145, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-10 06:42:05'),
(146, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-10 06:59:00'),
(147, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-10 06:59:04'),
(148, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-10 07:21:01'),
(149, 3, 'generate_payroll', 'payslips', 'Generated payroll batch id=1, 5 payslip(s), cutoff 2026-07-01 to 2026-07-15', '::1', '2026-08-10 07:21:09'),
(150, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-10 07:21:33'),
(151, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-10 07:21:41'),
(152, 1, 'approve_payroll', 'payslips', 'Approved payroll batch id=1', '::1', '2026-08-10 07:22:14'),
(153, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-10 07:54:23'),
(154, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-10 08:20:30'),
(155, 10, 'login', 'auth', 'User logged in', '::1', '2026-08-10 08:20:37'),
(156, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-11 02:31:48'),
(157, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-11 03:04:19'),
(158, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-11 03:04:22'),
(159, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-11 03:11:27'),
(160, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-11 03:11:32'),
(161, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-11 03:14:51'),
(162, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-11 03:14:57'),
(163, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 00:36:13'),
(164, 3, 'generate_payroll', 'payslips', 'Generated payroll batch id=2, 6 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-13 01:53:21'),
(165, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 01:54:43'),
(166, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-13 01:54:51'),
(167, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 01:57:43'),
(168, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 01:57:50'),
(169, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 02:06:34'),
(170, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-13 02:06:47'),
(171, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 02:12:17'),
(172, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 02:12:22'),
(173, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 02:13:34'),
(174, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-13 02:13:45'),
(175, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=258 to on_time', '::1', '2026-08-13 02:14:01'),
(176, 2, 'override_attendance_status', 'qr_attendance', 'Set log id=274 to on_time', '::1', '2026-08-13 02:14:03'),
(177, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 02:14:37'),
(178, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-13 07:54:39'),
(179, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 10:48:29'),
(180, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 10:52:45'),
(181, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-13 10:52:49'),
(182, 2, 'deactivate_employee', 'employees', 'Deactivated employee id=10', '::1', '2026-08-13 10:53:35'),
(183, 2, 'update_employee', 'employees', 'Updated employee id=10', '::1', '2026-08-13 10:54:00'),
(184, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 11:02:23'),
(185, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 11:04:29'),
(186, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 11:09:34'),
(187, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 15:44:45'),
(188, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-13 15:53:07'),
(189, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-13 15:53:13'),
(190, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-13 15:54:37'),
(191, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 02:36:37'),
(192, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 02:44:25'),
(193, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-14 02:44:30'),
(194, 1, 'decline_payroll', 'payslips', 'Declined payroll batch id=2', '::1', '2026-08-14 02:45:17'),
(195, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 02:45:21'),
(196, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 02:45:27'),
(197, 3, 'generate_payroll', 'payslips', 'Generated payroll batch id=3, 5 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-14 02:45:41'),
(198, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:04:30'),
(199, 1, 'decline_payroll', 'payslips', 'Sent payroll batch id=3 back for revision', '::1', '2026-08-14 05:04:49'),
(200, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 05:04:52'),
(201, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:04:57'),
(202, 3, 'generate_payroll', 'payslips', 'Generated payroll batch id=4, 5 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-14 05:05:26'),
(203, 3, 'change_password', 'auth', 'Password changed', '::1', '2026-08-14 05:08:17'),
(204, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 05:08:24'),
(205, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:08:29'),
(206, 3, 'change_password', 'auth', 'Password changed', '::1', '2026-08-14 05:08:47'),
(207, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 05:15:54'),
(208, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:15:58'),
(209, 1, 'decline_payroll', 'payslips', 'Sent payroll batch id=4 back for revision', '::1', '2026-08-14 05:16:58'),
(210, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 05:17:00'),
(211, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:17:04'),
(212, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 05:25:50'),
(213, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-14 05:25:58'),
(214, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 07:07:24'),
(215, 3, 'regenerate_payroll', 'payslips', 'Regenerated payroll batch id=2, 5 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-14 07:10:05'),
(216, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 07:10:26'),
(217, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-14 07:10:30'),
(218, 1, 'decline_payroll', 'payslips', 'Sent payroll batch id=2 back for revision', '::1', '2026-08-14 07:10:41'),
(219, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-14 07:10:43'),
(220, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-14 07:10:47'),
(221, 3, 'regenerate_payroll', 'payslips', 'Regenerated payroll batch id=2, 5 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-14 07:11:15'),
(222, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 03:59:17'),
(223, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 03:59:24'),
(224, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-18 03:59:32'),
(225, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 04:01:14'),
(226, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:29:56'),
(227, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:30:36'),
(228, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:39:32'),
(229, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:39:41'),
(230, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-18 07:43:10'),
(231, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-18 07:43:10'),
(232, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:46:36'),
(233, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:47:38'),
(234, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:49:56'),
(235, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:50:03'),
(236, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:50:15'),
(237, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:50:20'),
(238, 1, 'decline_payroll', 'payslips', 'Sent payroll batch id=2 back for revision', '::1', '2026-08-18 07:51:25'),
(239, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:51:35'),
(240, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:51:41'),
(241, 3, 'regenerate_payroll', 'payslips', 'Regenerated payroll batch id=2, 5 payslip(s), cutoff 2026-07-16 to 2026-07-31', '::1', '2026-08-18 07:52:07'),
(242, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:52:32'),
(243, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:52:36'),
(244, 1, 'approve_payroll', 'payslips', 'Approved payroll batch id=2', '::1', '2026-08-18 07:52:45'),
(245, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:53:01'),
(246, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:53:27'),
(247, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-18 07:54:41'),
(248, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-18 07:54:46'),
(249, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:51:44'),
(250, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 04:52:41'),
(251, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:52:46'),
(252, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:55:39'),
(253, 2, 'set_user_active', 'system', 'User id=10 set to active', '::1', '2026-08-25 04:56:08'),
(254, 2, 'set_user_inactive', 'system', 'User id=10 set to inactive', '::1', '2026-08-25 04:56:14'),
(255, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 04:56:17'),
(256, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:56:26'),
(257, 2, 'set_user_active', 'system', 'User id=10 set to active', '::1', '2026-08-25 04:56:36'),
(258, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 04:56:37'),
(259, 10, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:56:43'),
(260, 10, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 04:56:47'),
(261, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 04:56:51'),
(262, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-08-25 05:18:25'),
(263, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 05:18:57'),
(264, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-25 05:19:03'),
(265, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 05:23:50'),
(266, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-25 05:24:01'),
(267, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 05:24:46'),
(268, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-25 05:25:00'),
(269, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 05:25:09'),
(270, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 09:26:07'),
(271, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 09:26:22'),
(272, 10, 'login', 'auth', 'User logged in', '::1', '2026-08-25 09:49:45'),
(273, 10, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 12:56:14'),
(274, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 12:56:20'),
(275, 2, 'update_employee', 'employees', 'Updated employee id=2', '::1', '2026-08-25 13:29:51'),
(276, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 13:30:09'),
(277, 2, 'update_employee', 'employees', 'Updated employee id=10', '::1', '2026-08-25 13:30:29'),
(278, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 13:30:32'),
(279, 10, 'login', 'auth', 'User logged in', '::1', '2026-08-25 13:30:37'),
(280, 10, 'logout', 'auth', 'User logged out', '::1', '2026-08-25 13:31:03'),
(281, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-25 13:31:07'),
(282, 10, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:03:20'),
(283, 10, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:03:48'),
(284, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:03:52'),
(285, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:04:18'),
(286, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:04:22'),
(287, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:05:00'),
(288, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:05:07'),
(289, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:16:02'),
(290, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:16:06'),
(291, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:16:53'),
(292, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:17:01'),
(293, 11, 'request_leave', 'leave', 'Submitted Sick Leave request for 2026-08-26 to 2026-08-29', '::1', '2026-08-26 08:17:31'),
(294, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:17:38'),
(295, 1, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:17:44'),
(296, 1, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:17:54'),
(297, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:17:58'),
(298, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-26 08:22:40'),
(299, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-26 08:22:40'),
(300, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-26 08:22:57'),
(301, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-26 08:22:57'),
(302, 2, 'update_employee', 'employees', 'Updated employee id=14', '::1', '2026-08-26 08:44:23'),
(303, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 08:44:30'),
(304, 14, 'login', 'auth', 'User logged in', '::1', '2026-08-26 08:44:45'),
(305, 14, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 09:45:17'),
(306, 14, 'logout', 'auth', 'User logged out', '::1', '2026-08-26 09:45:17'),
(307, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 09:45:22'),
(308, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 09:48:18'),
(309, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 10:03:41'),
(310, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 10:15:02'),
(311, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 10:23:11'),
(312, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-26 14:40:48'),
(313, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 03:25:02'),
(314, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:07'),
(315, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:07'),
(316, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-29 03:25:11'),
(317, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-29 03:25:11'),
(318, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:13'),
(319, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:13'),
(320, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:16'),
(321, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:25:16'),
(322, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-29 03:25:32'),
(323, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-29 03:25:32'),
(324, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=2', '::1', '2026-08-29 03:26:50'),
(325, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=3', '::1', '2026-08-29 03:26:51'),
(326, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=1', '::1', '2026-08-29 03:26:52'),
(327, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=10', '::1', '2026-08-29 03:26:54'),
(328, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=11', '::1', '2026-08-29 03:26:56'),
(329, 2, 'delete_qr', 'qr_attendance', 'Deleted QR for user_id=14', '::1', '2026-08-29 03:26:57'),
(330, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:27:41'),
(331, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:27:44'),
(332, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-08-29 03:27:44'),
(333, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 03:30:12'),
(334, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 03:30:25'),
(335, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=10', '::1', '2026-08-29 03:30:42'),
(336, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=3', '::1', '2026-08-29 03:32:18'),
(337, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 03:32:43'),
(338, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-29 03:32:51'),
(339, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 03:33:04'),
(340, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 03:33:07'),
(341, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:22:43'),
(342, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:36:24'),
(343, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:41:25'),
(344, 11, 'update_own_contact', 'employees', 'Updated own contact information', '::1', '2026-08-29 07:42:20'),
(345, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 07:42:29'),
(346, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:42:34'),
(347, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:55:58'),
(348, 2, 'change_username', 'auth', 'Changed username to manager2', '::1', '2026-08-29 07:56:27'),
(349, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 07:56:31'),
(350, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:56:37'),
(351, 2, 'change_username', 'auth', 'Changed username to manager', '::1', '2026-08-29 07:56:46'),
(352, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 07:57:10'),
(353, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-29 07:57:16'),
(354, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 07:59:00'),
(355, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-29 08:46:13'),
(356, 11, 'update_profile_picture', 'employees', 'Uploaded a new profile picture', '::1', '2026-08-29 08:46:26'),
(357, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 08:46:46'),
(358, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-29 08:46:57'),
(359, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 08:47:32'),
(360, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-29 08:49:39'),
(361, 2, 'update_profile_picture', 'employees', 'Uploaded a new profile picture', '::1', '2026-08-29 08:50:05'),
(362, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 08:50:51'),
(363, 3, 'login', 'auth', 'User logged in', '::1', '2026-08-29 08:55:44'),
(364, 3, 'logout', 'auth', 'User logged out', '::1', '2026-08-29 09:00:08'),
(365, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-30 05:31:05'),
(366, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-30 05:59:52'),
(367, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-30 06:42:20'),
(368, 2, 'logout', 'auth', 'User logged out', '::1', '2026-08-30 06:43:01'),
(369, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-30 06:43:08'),
(370, 11, 'update_profile_picture', 'employees', 'Uploaded a new profile picture', '::1', '2026-08-30 06:45:32'),
(371, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-30 06:46:04'),
(372, 11, 'login', 'auth', 'User logged in', '::1', '2026-08-30 06:46:09'),
(373, 11, 'logout', 'auth', 'User logged out', '::1', '2026-08-30 06:46:12'),
(374, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-30 06:46:16'),
(375, 2, 'login', 'auth', 'User logged in', '::1', '2026-08-30 15:57:47'),
(376, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-06 10:13:42'),
(377, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-06 17:02:32'),
(378, 2, 'login', 'auth', 'User logged in', '127.0.0.1', '2026-09-07 05:22:51'),
(379, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-07 05:36:13'),
(380, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-07 05:37:50'),
(381, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-07 05:37:50'),
(382, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-07 05:41:28'),
(383, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-08 08:24:29'),
(384, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 08:24:48'),
(385, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-08 08:25:10'),
(386, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 08:25:44'),
(387, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 08:27:51'),
(388, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-08 08:27:54'),
(389, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-08 08:27:58'),
(390, 2, 'decline_leave', 'leave', 'Declined leave request id=14', '::1', '2026-09-08 08:32:08'),
(391, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-08 19:27:20'),
(392, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 19:28:14'),
(393, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 19:28:17'),
(394, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-08 19:28:18'),
(395, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-10 10:02:37'),
(396, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-10 10:05:41'),
(397, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-19 12:03:05'),
(398, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-19 14:15:11'),
(399, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-19 14:15:16'),
(400, 3, 'generate_payroll', 'payslips', 'Generated payroll batch id=5, 6 payslip(s), cutoff 2026-09-01 to 2026-09-15', '::1', '2026-09-19 14:17:29'),
(401, 3, 'request_leave', 'leave', 'Submitted Vacation Leave request for 2026-09-20 to 2026-09-24', '::1', '2026-09-19 14:17:56'),
(402, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-19 14:18:00'),
(403, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-19 14:18:05'),
(404, 1, 'decline_leave', 'leave', 'Declined leave request id=15', '::1', '2026-09-19 14:20:39'),
(405, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-19 14:20:55'),
(406, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-19 14:21:01'),
(407, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-19 14:21:06'),
(408, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 05:03:12'),
(409, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 05:04:30'),
(410, 2, 'update_employee', 'employees', 'Updated employee id=2', '::1', '2026-09-20 07:54:31'),
(411, 2, 'update_employee', 'employees', 'Updated employee id=2', '::1', '2026-09-20 07:54:31'),
(412, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 07:54:39'),
(413, 10, 'login', 'auth', 'User logged in', '::1', '2026-09-20 07:54:45'),
(414, 10, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 07:55:01'),
(415, 10, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 07:55:01'),
(416, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 07:55:06'),
(417, 2, 'update_employee', 'employees', 'Updated employee id=10', '::1', '2026-09-20 07:55:24'),
(418, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 07:55:26'),
(419, 10, 'login', 'auth', 'User logged in', '::1', '2026-09-20 07:55:32'),
(420, 10, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 07:56:01'),
(421, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 09:56:28'),
(422, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 10:03:58'),
(423, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 10:04:03'),
(424, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 10:20:04'),
(425, 2, 'update_settings', 'system', 'System settings updated', '::1', '2026-09-20 10:22:36'),
(426, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 10:22:56'),
(427, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=1', '::1', '2026-09-20 10:25:19'),
(428, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 10:38:47'),
(429, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-20 10:38:55'),
(430, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 10:41:39'),
(431, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-20 10:41:44'),
(432, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 10:43:08'),
(433, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 17:28:52'),
(434, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 17:29:01'),
(435, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-20 17:29:05'),
(436, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 17:29:08'),
(437, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-20 17:29:13'),
(438, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 17:29:16'),
(439, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-20 17:29:25'),
(440, 11, 'update_profile_picture', 'employees', 'Uploaded a new profile picture', '::1', '2026-09-20 17:29:57'),
(441, 11, 'logout', 'auth', 'User logged out', '::1', '2026-09-20 17:30:16'),
(442, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-20 17:30:23'),
(443, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:40:19'),
(444, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-21 03:40:51'),
(445, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:40:54'),
(446, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-21 03:41:28'),
(447, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:41:33'),
(448, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-21 03:41:40'),
(449, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:41:47'),
(450, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-21 03:44:45'),
(451, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:44:50'),
(452, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-21 03:51:01'),
(453, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-21 04:47:04'),
(454, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 03:53:05'),
(455, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 03:53:08'),
(456, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 05:13:44'),
(457, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:11:38'),
(458, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:13:00'),
(459, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:16:57'),
(460, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:17:05'),
(461, 11, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:17:09'),
(462, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:17:14'),
(463, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=11', '::1', '2026-09-22 09:17:21'),
(464, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:17:45'),
(465, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:17:59'),
(466, 11, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:18:20'),
(467, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:18:37'),
(468, 2, 'request_leave', 'leave', 'Submitted Vacation Leave request for 2026-09-23 to 2026-09-26', '::1', '2026-09-22 09:22:56'),
(469, 2, 'create_employee', 'employees', 'Created employee John Dela Cruz (staff: EMP005)', '::1', '2026-09-22 09:29:27'),
(470, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:31:31'),
(471, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:31:45'),
(472, 11, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:32:55'),
(473, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:33:04'),
(474, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:33:18'),
(475, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:33:24'),
(476, 1, 'approve_payroll', 'payslips', 'Approved payroll batch id=5', '::1', '2026-09-22 09:33:52'),
(477, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:34:25'),
(478, 3, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:34:36'),
(479, 3, 'generate_13th_month', 'payslips', 'Generated 13th month pay id=46 for employee=11, year=2026, amount=904.73', '::1', '2026-09-22 09:35:34'),
(480, 3, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:35:39'),
(481, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:35:46'),
(482, 1, 'approve_payslip', 'payslips', 'Approved payslip id=46', '::1', '2026-09-22 09:36:04'),
(483, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:41:10'),
(484, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:41:16'),
(485, 2, 'create_employee', 'employees', 'Created employee Juan Santos (staff: EMP006)', '::1', '2026-09-22 09:45:25'),
(486, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:45:46'),
(487, 16, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:45:59'),
(488, 16, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:48:25'),
(489, 16, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:48:36'),
(490, 16, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:48:48'),
(491, 16, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:49:00'),
(492, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:49:05'),
(493, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=16', '::1', '2026-09-22 09:49:12'),
(494, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:49:20'),
(495, 16, 'login', 'auth', 'User logged in', '::1', '2026-09-22 09:49:30'),
(496, 16, 'logout', 'auth', 'User logged out', '::1', '2026-09-22 09:52:48'),
(497, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-22 17:07:34'),
(498, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-22 17:11:49'),
(499, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-22 17:11:49'),
(500, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-22 17:12:06'),
(501, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-22 17:12:06'),
(502, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=15', '::1', '2026-09-22 17:12:26'),
(503, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=15', '::1', '2026-09-22 17:12:42'),
(504, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=15', '::1', '2026-09-22 17:12:42'),
(505, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 01:00:16'),
(506, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-23 01:00:21'),
(507, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-09-23 01:00:21'),
(508, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 01:48:44'),
(509, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 01:52:43'),
(510, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 01:55:28'),
(511, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 01:58:32'),
(512, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 02:01:58'),
(513, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 02:02:59'),
(514, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 10:49:52'),
(515, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 10:55:38'),
(516, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:10:24'),
(517, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:15:35'),
(518, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:19:54'),
(519, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:22:21'),
(520, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-23 11:22:51'),
(521, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:22:56'),
(522, 11, 'request_leave', 'leave', 'Submitted Emergency Leave request for 2026-09-23 to 2026-09-25', '::1', '2026-09-23 11:23:10'),
(523, 11, 'logout', 'auth', 'User logged out', '::1', '2026-09-23 11:23:12'),
(524, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:23:18'),
(525, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-23 11:24:20'),
(526, 1, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:24:24'),
(527, 1, 'decline_leave', 'leave', 'Declined leave request id=17', '::1', '2026-09-23 11:24:56'),
(528, 1, 'decline_leave', 'leave', 'Declined leave request id=16', '::1', '2026-09-23 11:25:03'),
(529, 1, 'logout', 'auth', 'User logged out', '::1', '2026-09-23 11:25:04'),
(530, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:25:08'),
(531, 2, 'logout', 'auth', 'User logged out', '::1', '2026-09-23 11:25:22'),
(532, 11, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:25:27'),
(533, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:27:29'),
(534, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:32:57'),
(535, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:37:06'),
(536, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-23 11:38:02'),
(537, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-27 14:19:19'),
(538, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-27 14:25:30'),
(539, 2, 'login', 'auth', 'User logged in', '::1', '2026-09-27 14:51:12'),
(540, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 12:30:09'),
(541, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:14:53'),
(542, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:17:05'),
(543, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:18:38'),
(544, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:19:28'),
(545, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:25:58'),
(546, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:26:24'),
(547, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-04 18:31:12'),
(548, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:24:54'),
(549, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:26:17'),
(550, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:27:19'),
(551, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:29:41'),
(552, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:31:08'),
(553, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:32:48'),
(554, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:37:48'),
(555, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:40:29'),
(556, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-05 05:42:25'),
(557, 11, 'login', 'auth', 'User logged in', '::1', '2026-10-05 05:42:29'),
(558, 11, 'logout', 'auth', 'User logged out', '::1', '2026-10-05 05:43:22'),
(559, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 10:54:40'),
(560, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 10:57:07'),
(561, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 11:30:21'),
(562, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 18:36:36'),
(563, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 18:40:47'),
(564, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 18:43:30'),
(565, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-05 18:46:19'),
(566, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:01'),
(567, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:01'),
(568, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:04'),
(569, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:04'),
(570, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:11'),
(571, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:11'),
(572, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:32'),
(573, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:32'),
(574, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:42'),
(575, 2, 'generate_qr', 'qr_attendance', 'Generated QR for user_id=2', '::1', '2026-10-05 18:48:42'),
(576, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-06 03:48:03'),
(577, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 04:20:38'),
(578, 1, 'login', 'auth', 'User logged in', '::1', '2026-10-06 04:20:42'),
(579, 1, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 04:21:07'),
(580, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-06 04:24:24'),
(581, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 04:25:30'),
(582, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-06 10:00:46'),
(583, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 10:04:16'),
(584, 3, 'login', 'auth', 'User logged in', '::1', '2026-10-06 10:04:22'),
(585, 11, 'login', 'auth', 'User logged in', '::1', '2026-10-06 10:05:25'),
(586, 11, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 10:07:25'),
(587, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-06 15:11:50'),
(588, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 15:15:59'),
(589, 11, 'login', 'auth', 'User logged in', '::1', '2026-10-06 15:16:03'),
(590, 11, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 15:49:03'),
(591, 1, 'login', 'auth', 'User logged in', '::1', '2026-10-06 15:49:17'),
(592, 1, 'logout', 'auth', 'User logged out', '::1', '2026-10-06 18:22:52'),
(593, 3, 'login', 'auth', 'User logged in', '::1', '2026-10-06 18:23:11'),
(594, 3, 'login', 'auth', 'User logged in', '::1', '2026-10-06 18:25:11'),
(595, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:05:38'),
(596, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 18:05:50'),
(597, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:05:54'),
(598, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 18:06:09'),
(599, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:06:20'),
(600, 10, 'change_email', 'auth', 'Changed email to jamesoliveremano12@gmail.com', '::1', '2026-10-07 18:06:38'),
(601, 10, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 18:06:44'),
(602, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:07:37'),
(603, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:08:09'),
(604, 10, 'change_email', 'auth', 'Changed email to jama.emano.coc@phinmaed.com', '::1', '2026-10-07 18:08:22'),
(605, 10, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 18:08:24'),
(606, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:10:04'),
(607, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 18:10:11');
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `module`, `details`, `ip_address`, `created_at`) VALUES
(608, 10, 'reset_password', 'auth', 'Password reset by email', '::1', '2026-10-07 18:18:15'),
(609, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:18:23'),
(610, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:19:29'),
(611, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:45:47'),
(612, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:46:00'),
(613, 11, 'login', 'auth', 'User logged in', '::1', '2026-10-07 18:46:38'),
(614, 11, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:06:21'),
(615, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 19:06:26'),
(616, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:06:36'),
(617, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 19:06:55'),
(618, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:07:03'),
(619, 11, 'login', 'auth', 'User logged in', '::1', '2026-10-07 19:07:14'),
(620, 11, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:10:04'),
(621, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-07 19:11:39'),
(622, 10, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:11:54'),
(623, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-07 19:31:14'),
(624, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-07 19:35:52'),
(625, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-08 04:20:36'),
(626, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-08 04:21:03'),
(627, 10, 'login', 'auth', 'User logged in', '::1', '2026-10-08 04:26:14'),
(628, 10, 'logout', 'auth', 'User logged out', '::1', '2026-10-08 04:26:21'),
(629, 2, 'login', 'auth', 'User logged in', '::1', '2026-10-08 05:07:08'),
(630, 2, 'logout', 'auth', 'User logged out', '::1', '2026-10-08 05:07:10');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `created_at`) VALUES
(1, 'Executive', '2026-07-27 05:39:22'),
(2, 'Operations', '2026-07-27 05:39:22'),
(3, 'Finance', '2026-07-27 05:39:22'),
(4, 'HR', '2026-07-27 05:39:22'),
(5, 'IT', '2026-07-27 05:39:22'),
(6, 'Admin', '2026-07-27 05:39:22');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) NOT NULL,
  `department` varchar(100) NOT NULL,
  `position` varchar(100) NOT NULL,
  `employment_type` enum('Full-time','Part-time') NOT NULL DEFAULT 'Full-time',
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `hourly_rate` decimal(10,2) DEFAULT 0.00,
  `phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact_name` varchar(120) DEFAULT NULL,
  `emergency_contact_phone` varchar(30) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `status` enum('active','inactive','on_leave') NOT NULL DEFAULT 'active',
  `gov_sss` varchar(30) DEFAULT NULL,
  `gov_philhealth` varchar(30) DEFAULT NULL,
  `gov_pagibig` varchar(30) DEFAULT NULL,
  `gov_tin` varchar(30) DEFAULT NULL,
  `sss_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `philhealth_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `pagibig_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `user_id`, `first_name`, `last_name`, `department`, `position`, `employment_type`, `basic_salary`, `hourly_rate`, `phone`, `address`, `emergency_contact_name`, `emergency_contact_phone`, `profile_picture`, `hire_date`, `status`, `gov_sss`, `gov_philhealth`, `gov_pagibig`, `gov_tin`, `sss_enabled`, `philhealth_enabled`, `pagibig_enabled`, `created_by`, `created_at`) VALUES
(1, 10, 'James Oliver M', 'Emano', 'Operations', 'Bus Driver', 'Full-time', 1000.00, 0.00, '09062542654', 'Macanhan', '', '', NULL, '2026-07-28', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, 2, '2026-07-28 03:27:16'),
(2, 11, 'Juan', 'Dela Cruz', 'Operations', 'Field Technician', 'Full-time', 575.00, 0.00, '09177654321', 'Barangay 31, Cagayan de Oro', 'Maria Santos', '09897624521', 'uploads/profile_pictures/user_11_1789925397.jpg', '2025-01-15', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, 2, '2026-08-06 15:42:13'),
(5, 14, 'Maria', 'Santos', 'Operations', 'Conductor', 'Part-time', 0.00, 100.00, '09179876543', '', '', '', NULL, '2025-03-01', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, 2, '2026-08-06 15:45:11'),
(6, 1, 'Robert', 'Smith', 'Executive', 'Chairman', 'Full-time', 1000.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-07-27', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, NULL, '2026-08-07 02:31:58'),
(7, 2, 'Oliver', 'Fox', 'Operations', 'Manager', 'Full-time', 1000.00, 0.00, '', '', '', '', 'uploads/profile_pictures/user_2_1787993405.jpg', '2026-07-27', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, NULL, '2026-08-07 02:31:58'),
(8, 3, 'Sarah', 'Johnson', 'Finance', 'Treasurer', 'Full-time', 1000.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-07-27', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, NULL, '2026-08-07 02:31:58'),
(9, 15, 'John', 'Dela Cruz', 'Operations', 'Bus Driver', 'Full-time', 527.00, 0.00, '09584796517', 'Barangay 31, Cagayan de Oro', 'Maria Santos', '09897624521', NULL, '2026-09-22', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, 2, '2026-09-22 09:29:27'),
(10, 16, 'Juan', 'Santos', 'Operations', 'Bus Driver', 'Part-time', 0.00, 100.00, '09584796515', 'Barangay 31, Cagayan de Oro', 'Maria Santos', '09897624521', NULL, '2026-09-22', 'active', NULL, NULL, NULL, NULL, 1, 1, 1, 2, '2026-09-22 09:45:25');

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `leave_type` varchar(60) NOT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `days` decimal(5,1) NOT NULL DEFAULT 1.0,
  `reason` text NOT NULL,
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_requests`
--

INSERT INTO `leave_requests` (`id`, `user_id`, `leave_type`, `date_from`, `date_to`, `days`, `reason`, `status`, `reviewed_by`, `reviewed_at`, `remarks`, `created_at`, `archived_at`) VALUES
(10, 11, 'Sick Leave', '2026-07-13', '2026-07-13', 1.0, 'Fever, advised bed rest by clinic.', 'approved', 2, '2026-07-12 09:00:00', 'Approved', '2026-08-06 15:45:11', NULL),
(11, 11, 'Vacation Leave', '2026-07-28', '2026-07-28', 1.0, 'Family matter.', 'approved', 2, '2026-07-25 09:00:00', 'Approved', '2026-08-06 15:45:11', NULL),
(12, 14, 'Sick Leave', '2026-07-13', '2026-07-13', 1.0, 'Migraine.', 'approved', 2, '2026-07-12 10:00:00', 'Approved', '2026-08-06 15:45:11', NULL),
(13, 14, 'Vacation Leave', '2026-07-28', '2026-07-28', 1.0, 'Personal errand.', 'approved', 2, '2026-07-25 10:00:00', 'Approved', '2026-08-06 15:45:11', NULL),
(14, 11, 'Sick Leave', '2026-08-26', '2026-08-29', 4.0, 'Dengue', 'declined', 2, '2026-09-08 16:32:08', '', '2026-08-26 08:17:31', NULL),
(15, 3, 'Vacation Leave', '2026-09-20', '2026-09-24', 5.0, 'Test Test', 'declined', 1, '2026-09-19 22:20:39', '', '2026-09-19 14:17:56', NULL),
(16, 2, 'Vacation Leave', '2026-09-23', '2026-09-26', 4.0, 'Test', 'declined', 1, '2026-09-23 19:25:03', 'no', '2026-09-22 09:22:56', NULL),
(17, 11, 'Emergency Leave', '2026-09-23', '2026-09-25', 3.0, 'Test Leave', 'declined', 1, '2026-09-23 19:24:56', 'Declined', '2026-09-23 11:23:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` varchar(500) NOT NULL,
  `link_page` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_batches`
--

CREATE TABLE `payroll_batches` (
  `id` int(10) UNSIGNED NOT NULL,
  `pay_period` varchar(20) NOT NULL,
  `cutoff_start` date NOT NULL,
  `cutoff_end` date NOT NULL,
  `pay_date` date DEFAULT NULL,
  `employee_count` int(10) UNSIGNED DEFAULT 0,
  `total_gross` decimal(14,2) DEFAULT 0.00,
  `total_deductions` decimal(14,2) DEFAULT 0.00,
  `total_net` decimal(14,2) DEFAULT 0.00,
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  `generated_by` int(10) UNSIGNED NOT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll_batches`
--

INSERT INTO `payroll_batches` (`id`, `pay_period`, `cutoff_start`, `cutoff_end`, `pay_date`, `employee_count`, `total_gross`, `total_deductions`, `total_net`, `status`, `generated_by`, `approved_by`, `approved_at`, `remarks`, `created_at`) VALUES
(1, '2026-07', '2026-07-01', '2026-07-15', '2026-07-30', 5, 4301.00, 3700.00, 601.00, 'approved', 3, 1, '2026-08-10 15:22:14', '', '2026-08-10 07:21:09'),
(2, '2026-07', '2026-07-16', '2026-07-31', '2026-08-15', 5, 10534.04, 3349.38, 7184.66, 'approved', 3, 1, '2026-08-18 15:52:45', '', '2026-08-13 01:53:21'),
(3, '2026-07', '2026-07-16', '2026-07-31', '2026-08-15', 5, 10534.04, 3349.38, 7184.66, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41'),
(4, '2026-07', '2026-07-16', '2026-07-31', '2026-08-15', 5, 10534.04, 3349.38, 7184.66, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26'),
(5, '2026-09', '2026-09-01', '2026-09-15', '2026-09-30', 6, 0.00, 4274.38, -4274.38, 'approved', 3, 1, '2026-09-22 17:33:52', '', '2026-09-19 14:17:29');

-- --------------------------------------------------------

--
-- Table structure for table `payslips`
--

CREATE TABLE `payslips` (
  `id` int(10) UNSIGNED NOT NULL,
  `employee_user_id` int(10) UNSIGNED NOT NULL,
  `pay_period` varchar(20) NOT NULL,
  `payslip_type` enum('regular','13th_month') NOT NULL DEFAULT 'regular',
  `payroll_batch_id` int(10) UNSIGNED DEFAULT NULL,
  `cutoff_start` date DEFAULT NULL,
  `cutoff_end` date DEFAULT NULL,
  `pay_date` date DEFAULT NULL,
  `employment_type` varchar(30) DEFAULT 'private',
  `days_present` decimal(5,2) DEFAULT 0.00,
  `days_absent` decimal(5,2) DEFAULT 0.00,
  `days_leave` decimal(5,2) DEFAULT 0.00,
  `hours_rendered` decimal(6,2) DEFAULT 0.00,
  `hourly_rate_used` decimal(10,2) DEFAULT 0.00,
  `rate_per_hour` decimal(10,2) DEFAULT 0.00,
  `late_deduction` decimal(12,2) DEFAULT 0.00,
  `absence_deduction` decimal(12,2) DEFAULT 0.00,
  `basic_pay` decimal(12,2) DEFAULT 0.00,
  `taxable_allow` decimal(12,2) DEFAULT 0.00,
  `non_tax_allow` decimal(12,2) DEFAULT 0.00,
  `nd_pay` decimal(12,2) DEFAULT 0.00,
  `ot_pay` decimal(12,2) DEFAULT 0.00,
  `gross_pay` decimal(12,2) DEFAULT 0.00,
  `withholding_tax` decimal(12,2) DEFAULT 0.00,
  `sss_gsis` decimal(12,2) DEFAULT 0.00,
  `philhealth` decimal(12,2) DEFAULT 0.00,
  `pagibig` decimal(12,2) DEFAULT 0.00,
  `total_deductions` decimal(12,2) DEFAULT 0.00,
  `unpaid_deduction_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_pay` decimal(12,2) DEFAULT 0.00,
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  `generated_by` int(10) UNSIGNED NOT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payslips`
--

INSERT INTO `payslips` (`id`, `employee_user_id`, `pay_period`, `payslip_type`, `payroll_batch_id`, `cutoff_start`, `cutoff_end`, `pay_date`, `employment_type`, `days_present`, `days_absent`, `days_leave`, `hours_rendered`, `hourly_rate_used`, `rate_per_hour`, `late_deduction`, `absence_deduction`, `basic_pay`, `taxable_allow`, `non_tax_allow`, `nd_pay`, `ot_pay`, `gross_pay`, `withholding_tax`, `sss_gsis`, `philhealth`, `pagibig`, `total_deductions`, `net_pay`, `status`, `generated_by`, `approved_by`, `approved_at`, `remarks`, `created_at`, `archived_at`) VALUES
(1, 11, '2026-07', 'regular', NULL, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 9.00, 1.00, 1.00, 0.00, 0.00, 0.00, 77.09, 1000.00, 8922.91, 0.00, 0.00, 0.00, 0.00, 8922.91, 0.00, 550.00, 275.00, 100.00, 925.00, 7997.91, 'declined', 3, 1, '2026-08-07 10:18:03', 'Test', '2026-08-07 01:41:26', NULL),
(2, 11, '2026-07', 'regular', NULL, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 9.00, 1.00, 1.00, 0.00, 0.00, 0.00, 44.33, 575.00, 5130.67, 0.00, 0.00, 0.00, 0.00, 5130.67, 0.00, 316.25, 158.13, 100.00, 574.38, 4556.29, 'declined', 3, 1, '2026-08-07 11:06:21', '', '2026-08-07 02:49:04', NULL),
(3, 11, '2026-07', 'regular', NULL, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 9.00, 1.00, 1.00, 0.00, 0.00, 0.00, 44.33, 575.00, 5130.67, 0.00, 0.00, 0.00, 0.00, 5130.67, 0.00, 316.25, 158.13, 100.00, 574.38, 4556.29, 'approved', 3, 1, '2026-08-07 11:21:52', NULL, '2026-08-07 03:20:33', NULL),
(4, 1, '2026-07', 'regular', 1, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 0.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-10 15:22:14', NULL, '2026-08-10 07:21:09', NULL),
(5, 2, '2026-07', 'regular', 1, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 0.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-10 15:22:14', NULL, '2026-08-10 07:21:09', NULL),
(6, 3, '2026-07', 'regular', 1, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 0.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-10 15:22:14', NULL, '2026-08-10 07:21:09', NULL),
(7, 10, '2026-07', 'regular', 1, '2026-07-01', '2026-07-15', '2026-07-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 0.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-10 15:22:14', NULL, '2026-08-10 07:21:09', NULL),
(8, 14, '2026-07', 'regular', 1, '2026-07-01', '2026-07-15', '2026-07-30', 'Part-time', 9.00, 1.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 4301.00, 0.00, 0.00, 0.00, 0.00, 4301.00, 0.00, 0.00, 0.00, 0.00, 0.00, 4301.00, 'approved', 3, 1, '2026-08-10 15:22:14', NULL, '2026-08-10 07:21:09', NULL),
(15, 1, '2026-07', 'regular', 3, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41', NULL),
(16, 2, '2026-07', 'regular', 3, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41', NULL),
(17, 3, '2026-07', 'regular', 3, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41', NULL),
(18, 11, '2026-07', 'regular', 3, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 10.00, 1.00, 1.00, 89.61, 57.50, 0.00, 23.96, 575.00, 5726.04, 0.00, 0.00, 0.00, 0.00, 5726.04, 0.00, 316.25, 158.13, 100.00, 574.38, 5151.66, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41', NULL),
(19, 14, '2026-07', 'regular', 3, '2026-07-16', '2026-07-31', '2026-08-15', 'Part-time', 10.00, 1.00, 1.00, 48.08, 100.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 'declined', 3, 1, '2026-08-14 13:04:49', '', '2026-08-14 02:45:41', NULL),
(20, 1, '2026-07', 'regular', 4, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26', NULL),
(21, 2, '2026-07', 'regular', 4, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26', NULL),
(22, 3, '2026-07', 'regular', 4, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26', NULL),
(23, 11, '2026-07', 'regular', 4, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 10.00, 1.00, 1.00, 89.61, 57.50, 0.00, 23.96, 575.00, 5726.04, 0.00, 0.00, 0.00, 0.00, 5726.04, 0.00, 316.25, 158.13, 100.00, 574.38, 5151.66, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26', NULL),
(24, 14, '2026-07', 'regular', 4, '2026-07-16', '2026-07-31', '2026-08-15', 'Part-time', 10.00, 1.00, 1.00, 48.08, 100.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 'declined', 3, 1, '2026-08-14 13:16:58', 'test', '2026-08-14 05:05:26', NULL),
(35, 1, '2026-07', 'regular', 2, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-18 15:52:45', NULL, '2026-08-18 07:52:07', NULL),
(36, 2, '2026-07', 'regular', 2, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-18 15:52:45', NULL, '2026-08-18 07:52:07', NULL),
(37, 3, '2026-07', 'regular', 2, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 0.00, 12.00, 0.00, 0.00, 100.00, 0.00, 0.00, 12000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-08-18 15:52:45', NULL, '2026-08-18 07:52:07', NULL),
(38, 11, '2026-07', 'regular', 2, '2026-07-16', '2026-07-31', '2026-08-15', 'Full-time', 10.00, 1.00, 1.00, 89.61, 57.50, 0.00, 23.96, 575.00, 5726.04, 0.00, 0.00, 0.00, 0.00, 5726.04, 0.00, 316.25, 158.13, 100.00, 574.38, 5151.66, 'approved', 3, 1, '2026-08-18 15:52:45', NULL, '2026-08-18 07:52:07', NULL),
(39, 14, '2026-07', 'regular', 2, '2026-07-16', '2026-07-31', '2026-08-15', 'Part-time', 10.00, 1.00, 1.00, 48.08, 100.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 0.00, 0.00, 0.00, 0.00, 0.00, 4808.00, 'approved', 3, 1, '2026-08-18 15:52:45', NULL, '2026-08-18 07:52:07', NULL),
(40, 1, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 100.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(41, 2, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 100.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(42, 3, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 100.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(43, 10, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 100.00, 0.00, 0.00, 11000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 550.00, 275.00, 100.00, 925.00, -925.00, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(44, 11, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Full-time', 0.00, 11.00, 0.00, 0.00, 57.50, 0.00, 0.00, 6325.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 316.25, 158.13, 100.00, 574.38, -574.38, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(45, 14, '2026-09', 'regular', 5, '2026-09-01', '2026-09-15', '2026-09-30', 'Part-time', 0.00, 11.00, 0.00, 0.00, 100.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'approved', 3, 1, '2026-09-22 17:33:52', NULL, '2026-09-19 14:17:29', NULL),
(46, 11, '13th Month Pay 2026', '13th_month', NULL, '2026-01-01', '2026-12-31', '2026-12-24', 'Full-time', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 904.73, 0.00, 0.00, 0.00, 0.00, 904.73, 0.00, 0.00, 0.00, 0.00, 0.00, 904.73, 'approved', 3, 1, '2026-09-22 17:36:04', NULL, '2026-09-22 09:35:34', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `qr_tokens`
--

CREATE TABLE `qr_tokens` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `token` varchar(100) NOT NULL,
  `qr_data` text NOT NULL,
  `generated_by` int(10) UNSIGNED NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `qr_tokens`
--

INSERT INTO `qr_tokens` (`id`, `user_id`, `token`, `qr_data`, `generated_by`, `generated_at`, `is_active`) VALUES
(1, 2, 'bff039f12f74b535739bbf6b68e16a61', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"bff039f12f74b535739bbf6b68e16a61\"}', 2, '2026-07-27 05:43:57', 0),
(2, 3, '4de89975ae58313f33ff52b1e45f43e1', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"4de89975ae58313f33ff52b1e45f43e1\"}', 2, '2026-07-27 05:43:59', 0),
(3, 1, 'e17f37dbb85d5440801996a5a9b52f74', '{\"trafeco_qr\":true,\"userId\":1,\"staffId\":\"CHR001\",\"name\":\"Robert Smith\",\"role\":\"Chairman\",\"dept\":\"Executive\",\"token\":\"e17f37dbb85d5440801996a5a9b52f74\"}', 2, '2026-07-27 05:44:00', 0),
(4, 1, 'cadfc58dc59aa82bbb8485c660daabb0', '{\"trafeco_qr\":true,\"userId\":1,\"staffId\":\"CHR001\",\"name\":\"Robert Smith\",\"role\":\"Chairman\",\"dept\":\"Executive\",\"token\":\"cadfc58dc59aa82bbb8485c660daabb0\"}', 2, '2026-07-27 05:44:03', 0),
(5, 1, '60cda98060c35eeadad8a591ba9e945e', '{\"trafeco_qr\":true,\"userId\":1,\"staffId\":\"CHR001\",\"name\":\"Robert Smith\",\"role\":\"Chairman\",\"dept\":\"Executive\",\"token\":\"60cda98060c35eeadad8a591ba9e945e\"}', 2, '2026-07-27 05:44:03', 0),
(6, 10, '271b97edd5ccb7fa10cf51ab4ddbf761', '{\"trafeco_qr\":true,\"userId\":10,\"staffId\":\"EMP002\",\"name\":\"James Oliver Emano\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"271b97edd5ccb7fa10cf51ab4ddbf761\"}', 2, '2026-07-28 03:27:35', 0),
(7, 11, '90ea5921d2dcc35cd1dbff6c5317e4a6', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"90ea5921d2dcc35cd1dbff6c5317e4a6\"}', 2, '2026-08-06 15:46:23', 0),
(8, 14, 'c2e984e7430f01b6903a25658acb4916', '{\"trafeco_qr\":true,\"userId\":14,\"staffId\":\"EMP003\",\"name\":\"Maria Santos\",\"role\":\"Employee\",\"dept\":\"Admin\",\"token\":\"c2e984e7430f01b6903a25658acb4916\"}', 2, '2026-08-06 15:46:28', 0),
(9, 11, '04b8c6c71fbea457c15d4b75f0a3f605', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"04b8c6c71fbea457c15d4b75f0a3f605\"}', 2, '2026-08-06 16:20:00', 0),
(10, 11, '73a44f7779351e0b7a3133e79e938d31', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"73a44f7779351e0b7a3133e79e938d31\"}', 2, '2026-08-06 16:20:00', 0),
(11, 11, '757c612d027357fa7381e67b7ad05653', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"757c612d027357fa7381e67b7ad05653\"}', 2, '2026-08-06 16:20:33', 0),
(12, 11, '83a413ac1c5d5a15e519349401064998', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"83a413ac1c5d5a15e519349401064998\"}', 2, '2026-08-06 16:20:33', 0),
(13, 2, '26b5f886b856dff44f593b0c59b1edd4', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"26b5f886b856dff44f593b0c59b1edd4\"}', 2, '2026-08-10 06:42:01', 0),
(14, 2, '019f5c68f5e5f1411265f2e6e7065286', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"019f5c68f5e5f1411265f2e6e7065286\"}', 2, '2026-08-10 06:42:02', 0),
(15, 2, '37591a84dc454bfb246730338f092349', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"37591a84dc454bfb246730338f092349\"}', 2, '2026-08-10 06:42:04', 0),
(16, 2, 'b852177ec30513f24bd1d38460276dca', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"b852177ec30513f24bd1d38460276dca\"}', 2, '2026-08-10 06:42:05', 0),
(17, 3, 'b6b889ef01b1cc2576c70ee4da5e2fe1', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"b6b889ef01b1cc2576c70ee4da5e2fe1\"}', 2, '2026-08-18 07:43:10', 0),
(18, 3, '92085a74362e28e47da39fbb1b1b1a0b', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"92085a74362e28e47da39fbb1b1b1a0b\"}', 2, '2026-08-18 07:43:10', 0),
(19, 2, '1c81f9f971bb7ffb66a476c3edb3839e', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"1c81f9f971bb7ffb66a476c3edb3839e\"}', 2, '2026-08-26 08:22:40', 0),
(20, 2, '86ee7b36b77867023b46a85115af1740', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"86ee7b36b77867023b46a85115af1740\"}', 2, '2026-08-26 08:22:40', 0),
(21, 2, '0e70632942785f9932c61dc7f9946561', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"0e70632942785f9932c61dc7f9946561\"}', 2, '2026-08-26 08:22:57', 0),
(22, 2, '6527260ed523be07ff0dbed32bbc3c1d', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"6527260ed523be07ff0dbed32bbc3c1d\"}', 2, '2026-08-26 08:22:57', 0),
(23, 2, 'b1d44b68a04551ed6fa2bc61be2253ee', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"b1d44b68a04551ed6fa2bc61be2253ee\"}', 2, '2026-08-29 03:25:07', 0),
(24, 2, 'd9ace65b0d10761bfaa58c2fe0438d74', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"d9ace65b0d10761bfaa58c2fe0438d74\"}', 2, '2026-08-29 03:25:07', 0),
(25, 3, '1e90d4f427c2ecd1b19c53f739258f92', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"1e90d4f427c2ecd1b19c53f739258f92\"}', 2, '2026-08-29 03:25:11', 0),
(26, 3, '3fc43e73006c3090431f06852b712004', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"3fc43e73006c3090431f06852b712004\"}', 2, '2026-08-29 03:25:11', 0),
(27, 2, '90b1b77babc03b51c702da2ca771563c', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"90b1b77babc03b51c702da2ca771563c\"}', 2, '2026-08-29 03:25:13', 0),
(28, 2, '9b5dceddfa006b61916e97d3e10cf69b', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"9b5dceddfa006b61916e97d3e10cf69b\"}', 2, '2026-08-29 03:25:13', 0),
(29, 2, '6cc47ea1b9abe74a7ee80387dd1b1431', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"6cc47ea1b9abe74a7ee80387dd1b1431\"}', 2, '2026-08-29 03:25:16', 0),
(30, 2, '9ac91c3f1efb384e3d771df614c658dd', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"9ac91c3f1efb384e3d771df614c658dd\"}', 2, '2026-08-29 03:25:16', 0),
(31, 3, 'b59e0d15ab4832f8b3836f59b06af74a', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"b59e0d15ab4832f8b3836f59b06af74a\"}', 2, '2026-08-29 03:25:32', 0),
(32, 3, '08f747ad3588ca89d711cf3cf41d18e5', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"08f747ad3588ca89d711cf3cf41d18e5\"}', 2, '2026-08-29 03:25:32', 0),
(33, 2, '1587379d8c71153d44cbb230595b23d6', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"1587379d8c71153d44cbb230595b23d6\"}', 2, '2026-08-29 03:27:41', 0),
(34, 2, '891e6304ba89405efaba1fbce08f2774', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"891e6304ba89405efaba1fbce08f2774\"}', 2, '2026-08-29 03:27:44', 0),
(35, 2, '3b2d43f1703eec2056defac2c350794c', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"3b2d43f1703eec2056defac2c350794c\"}', 2, '2026-08-29 03:27:44', 0),
(36, 10, '2f8acefb265f662033fb4b24a61c14c6', '{\"trafeco_qr\":true,\"userId\":10,\"staffId\":\"EMP002\",\"name\":\"James Oliver Emano\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"2f8acefb265f662033fb4b24a61c14c6\"}', 2, '2026-08-29 03:30:42', 1),
(37, 3, 'fc07f0c9a14360b0614f51ffa7e14d8b', '{\"trafeco_qr\":true,\"userId\":3,\"staffId\":\"TRS001\",\"name\":\"Sarah Johnson\",\"role\":\"Treasurer\",\"dept\":\"Finance\",\"token\":\"fc07f0c9a14360b0614f51ffa7e14d8b\"}', 2, '2026-08-29 03:32:18', 1),
(38, 2, 'ccba101fe505320ae455e9b9a2d5200a', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"ccba101fe505320ae455e9b9a2d5200a\"}', 2, '2026-09-07 05:37:50', 0),
(39, 2, '01d891a68ebd53c7f27daaa0680f605a', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"John Doe\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"01d891a68ebd53c7f27daaa0680f605a\"}', 2, '2026-09-07 05:37:50', 0),
(40, 1, '3e5048969277489a1cc5e85548bb7ec3', '{\"trafeco_qr\":true,\"userId\":1,\"staffId\":\"CHR001\",\"name\":\"Robert Smith\",\"role\":\"Chairman\",\"dept\":\"Executive\",\"token\":\"3e5048969277489a1cc5e85548bb7ec3\"}', 2, '2026-09-20 10:25:19', 1),
(41, 11, 'c324f07fb71daf6507d9a9baeb1a0321', '{\"trafeco_qr\":true,\"userId\":11,\"staffId\":\"EMP001\",\"name\":\"Juan Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"c324f07fb71daf6507d9a9baeb1a0321\"}', 2, '2026-09-22 09:17:21', 1),
(42, 16, '396711a2050f30e9fdce168ccfe111a3', '{\"trafeco_qr\":true,\"userId\":16,\"staffId\":\"EMP006\",\"name\":\"Juan Santos\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"396711a2050f30e9fdce168ccfe111a3\"}', 2, '2026-09-22 09:49:12', 1),
(43, 2, 'd07de0e7d2a728d25085bacf3f8ead20', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"d07de0e7d2a728d25085bacf3f8ead20\"}', 2, '2026-09-22 17:11:49', 0),
(44, 2, '9571941ac8214913a97c7cf504b2ec5f', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"9571941ac8214913a97c7cf504b2ec5f\"}', 2, '2026-09-22 17:11:49', 0),
(45, 2, '23690577b83e18ba0f6ed0f6ff330255', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"23690577b83e18ba0f6ed0f6ff330255\"}', 2, '2026-09-22 17:12:06', 0),
(46, 2, 'd6566fe9a5fa074f231a94aa2e99e328', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"d6566fe9a5fa074f231a94aa2e99e328\"}', 2, '2026-09-22 17:12:06', 0),
(47, 15, '614b02c5e57ee183697e46a40a9d7acc', '{\"trafeco_qr\":true,\"userId\":15,\"staffId\":\"EMP005\",\"name\":\"John Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"614b02c5e57ee183697e46a40a9d7acc\"}', 2, '2026-09-22 17:12:26', 0),
(48, 15, '9da2d553a222705feb43197630d0bcf2', '{\"trafeco_qr\":true,\"userId\":15,\"staffId\":\"EMP005\",\"name\":\"John Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"9da2d553a222705feb43197630d0bcf2\"}', 2, '2026-09-22 17:12:42', 0),
(49, 15, 'bb91c189c1d7bf04502579f92eafda98', '{\"trafeco_qr\":true,\"userId\":15,\"staffId\":\"EMP005\",\"name\":\"John Dela Cruz\",\"role\":\"Employee\",\"dept\":\"Operations\",\"token\":\"bb91c189c1d7bf04502579f92eafda98\"}', 2, '2026-09-22 17:12:42', 1),
(50, 2, '9b3f127ca56686545422d51b40285c80', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"9b3f127ca56686545422d51b40285c80\"}', 2, '2026-09-23 01:00:21', 0),
(51, 2, 'ce0e609246341c44933091e0c387f19e', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"ce0e609246341c44933091e0c387f19e\"}', 2, '2026-09-23 01:00:21', 0),
(52, 2, '501b5c6d73c6246341a3dc228aaa2b0f', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"501b5c6d73c6246341a3dc228aaa2b0f\"}', 2, '2026-10-05 18:48:01', 0),
(53, 2, 'c754c8033afecd1080eee8b5ad96ae84', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"c754c8033afecd1080eee8b5ad96ae84\"}', 2, '2026-10-05 18:48:01', 0),
(54, 2, 'c5eb126441344328416f2dc8ab689bf8', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"c5eb126441344328416f2dc8ab689bf8\"}', 2, '2026-10-05 18:48:04', 0),
(55, 2, 'b34120ac2281edba4083e9a03c2f4166', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"b34120ac2281edba4083e9a03c2f4166\"}', 2, '2026-10-05 18:48:04', 0),
(56, 2, '1313d960176f017afb11d73d6664f483', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"1313d960176f017afb11d73d6664f483\"}', 2, '2026-10-05 18:48:11', 0),
(57, 2, 'df70e30f4a061cc848c14cd1ef07a9c2', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"df70e30f4a061cc848c14cd1ef07a9c2\"}', 2, '2026-10-05 18:48:11', 0),
(58, 2, 'ffbc0596a1882f4e4f0f53252558b7ef', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"ffbc0596a1882f4e4f0f53252558b7ef\"}', 2, '2026-10-05 18:48:32', 0),
(59, 2, '02f79c43ea12e80544b611c68dd0fb71', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"02f79c43ea12e80544b611c68dd0fb71\"}', 2, '2026-10-05 18:48:32', 0),
(60, 2, '7bd6feac41ebe4c299703a13cea36d8b', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"7bd6feac41ebe4c299703a13cea36d8b\"}', 2, '2026-10-05 18:48:42', 0),
(61, 2, 'b61c1ed6c4b717c7d03309d10c343e50', '{\"trafeco_qr\":true,\"userId\":2,\"staffId\":\"MGR001\",\"name\":\"Oliver Fox\",\"role\":\"Manager\",\"dept\":\"Operations\",\"token\":\"b61c1ed6c4b717c7d03309d10c343e50\"}', 2, '2026-10-05 18:48:42', 1);

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `setting_key` varchar(80) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `updated_by`, `updated_at`) VALUES
(1, 'company_name', 'TRAFECO', 2, '2026-09-08 08:24:48'),
(2, 'company_address', 'Carinugan, Balulang, Cagayan de Oro, Misamis Oriental, Philippines', 2, '2026-09-20 10:22:36'),
(3, 'company_phone', '09933300337', 2, '2026-09-20 10:22:36'),
(4, 'company_email', 'info@trafeco.com', 2, '2026-09-08 08:24:48'),
(5, 'pay_frequency', 'Semi-Monthly', NULL, '2026-07-27 05:39:22'),
(6, 'work_hours_day', '8', NULL, '2026-07-27 05:39:22'),
(14, 'sss_rate', '5', NULL, '2026-09-06 16:58:52'),
(15, 'philhealth_rate', '2.5', NULL, '2026-09-06 16:58:52'),
(16, 'pagibig_rate', '2', NULL, '2026-09-06 16:58:52'),
(17, 'pagibig_cap', '200', NULL, '2026-09-06 16:58:52'),
(18, 'tax_brackets', '[{\"threshold\":0,\"rate\":0},{\"threshold\":20833,\"rate\":15},{\"threshold\":33333,\"rate\":20},{\"threshold\":66667,\"rate\":25},{\"threshold\":166667,\"rate\":30},{\"threshold\":666667,\"rate\":35}]', NULL, '2026-09-06 16:58:52'),
(19, 'work_hours_per_day', '10', NULL, '2026-09-08 07:29:11');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(60) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `role` enum('manager','treasurer','chairman','employee') NOT NULL DEFAULT 'employee',
  `staff_id` varchar(20) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `email`, `role`, `staff_id`, `department`, `status`, `last_login`, `created_at`) VALUES
(1, 'chairman', '$2y$10$OySVNRk.mJ7PxmefNp/5i.UgbaiZKi2fy/.OeBZXfWI6F9k1vOZkW', 'Robert Smith', 'chairman@trafeco.com', 'chairman', 'CHR001', 'Executive', 'active', '2026-10-06 23:49:17', '2026-07-27 05:39:22'),
(2, 'manager', '$2y$10$OySVNRk.mJ7PxmefNp/5i.UgbaiZKi2fy/.OeBZXfWI6F9k1vOZkW', 'Oliver Fox', 'manager@trafeco.com', 'manager', 'MGR001', 'Operations', 'active', '2026-10-08 13:07:08', '2026-07-27 05:39:22'),
(3, 'treasurer', '$2y$10$kkbgdlYCgjdj4muX.RkWrOKsgFIe5Wl4SP5OttxSkhE3XQbXUJw1u', 'Sarah Johnson', 'treasurer@trafeco.com', 'treasurer', 'TRS001', 'Finance', 'active', '2026-10-07 02:25:11', '2026-07-27 05:39:22'),
(10, 'jamesemano', '$2y$10$hWSk4jH2idLRI7ItGQJ98OLyl4ktpNYemufOY/k4rNHkDSwTuiYBO', 'James Oliver M Emano', 'jama.emano.coc@phinmaed.com', 'employee', 'EMP002', 'Operations', 'active', '2026-10-08 12:26:14', '2026-07-28 03:27:16'),
(11, 'jdelacruz', '$2y$10$OySVNRk.mJ7PxmefNp/5i.UgbaiZKi2fy/.OeBZXfWI6F9k1vOZkW', 'Juan Dela Cruz', 'jdelacruz@trafeco.com', 'employee', 'EMP001', 'Operations', 'active', '2026-10-08 03:07:14', '2026-08-06 15:42:13'),
(14, 'msantos', '$2y$10$OySVNRk.mJ7PxmefNp/5i.UgbaiZKi2fy/.OeBZXfWI6F9k1vOZkW', 'Maria Santos', 'msantos@trafeco.com', 'employee', 'EMP003', 'Operations', 'active', '2026-08-26 16:44:45', '2026-08-06 15:45:11'),
(15, 'johndelacruz', '$2y$10$ZSUfyzWYBMmuRYbYiivdte6H85eFJsbUy5QWSInh.Jj.Kteyy0Zva', 'John Dela Cruz', 'test@gmail.com', 'employee', 'EMP005', 'Operations', 'active', NULL, '2026-09-22 09:29:27'),
(16, 'jsantos', '$2y$10$BzOxM2PgBNXGm2AfEoNbq.uQFZOFlRCWmx.9H2XyeqBmO6Vh0mVpa', 'Juan Santos', 'admin@company.com', 'employee', 'EMP006', 'Operations', 'active', '2026-09-22 17:49:30', '2026-09-22 09:45:25');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `archive_runs`
--
ALTER TABLE `archive_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `triggered_by` (`triggered_by`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `scanned_by` (`scanned_by`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_unread` (`user_id`,`is_read`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `token_hash` (`token_hash`),
  ADD KEY `expires_at` (`expires_at`);

--
-- Indexes for table `payroll_batches`
--
ALTER TABLE `payroll_batches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `payslips`
--
ALTER TABLE `payslips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_user_id` (`employee_user_id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `payroll_batch_id` (`payroll_batch_id`);

--
-- Indexes for table `qr_tokens`
--
ALTER TABLE `qr_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `staff_id` (`staff_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `archive_runs`
--
ALTER TABLE `archive_runs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=353;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=631;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payroll_batches`
--
ALTER TABLE `payroll_batches`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `payslips`
--
ALTER TABLE `payslips`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `qr_tokens`
--
ALTER TABLE `qr_tokens`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `archive_runs`
--
ALTER TABLE `archive_runs`
  ADD CONSTRAINT `archive_runs_ibfk_1` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_logs_ibfk_2` FOREIGN KEY (`scanned_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `leave_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_requests_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payroll_batches`
--
ALTER TABLE `payroll_batches`
  ADD CONSTRAINT `payroll_batches_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `payroll_batches_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payslips`
--
ALTER TABLE `payslips`
  ADD CONSTRAINT `payslips_ibfk_1` FOREIGN KEY (`employee_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `payslips_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `payslips_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `payslips_ibfk_4` FOREIGN KEY (`payroll_batch_id`) REFERENCES `payroll_batches` (`id`);

--
-- Constraints for table `qr_tokens`
--
ALTER TABLE `qr_tokens`
  ADD CONSTRAINT `qr_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- Cap all payslips at zero payable and record the uncollected amount.
-- Existing approval statuses and approval fields are preserved.
UPDATE `payslips`
SET `unpaid_deduction_amount` = GREATEST(COALESCE(`total_deductions`, 0) - GREATEST(COALESCE(`gross_pay`, 0), 0), 0),
    `net_pay` = GREATEST(COALESCE(`gross_pay`, 0) - COALESCE(`total_deductions`, 0), 0);

UPDATE `payroll_batches`
SET `total_net` = (
  SELECT COALESCE(SUM(p.`net_pay`), 0)
  FROM `payslips` p
  WHERE p.`payroll_batch_id` = `payroll_batches`.`id`
);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
