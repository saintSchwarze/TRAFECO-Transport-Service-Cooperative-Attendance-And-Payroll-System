<?php

// TRAFECO's semi-monthly policy: 26th–10th pays on the 15th, and
// 11th–25th pays on the 30th or the last day of a shorter month.
function scheduledPayDateForCutoff(string $payPeriod, string $cutoffStart, string $cutoffEnd): ?string {
    $monthStart = DateTime::createFromFormat('!Y-m-d', $payPeriod . '-01');
    if (!$monthStart || $monthStart->format('Y-m') !== $payPeriod) return null;

    $previousMonthStart = (clone $monthStart)->modify('-1 month');
    $month = $monthStart->format('Y-m');
    if ($cutoffStart === $previousMonthStart->format('Y-m') . '-26' && $cutoffEnd === $month . '-10') {
        return $month . '-15';
    }

    $lastDay = (int)$monthStart->format('t');
    if ($cutoffStart === $month . '-11' && $cutoffEnd === $month . '-25') {
        return $month . '-' . str_pad((string)min(30, $lastDay), 2, '0', STR_PAD_LEFT);
    }
    return null;
}
