-- Perpindahan dana ke Tenant pengganti saat pembeli memilih SUBSTITUSI (FR-7.4).
-- Dibedakan dari REFUND karena pembeli tidak menerima uang — barangnya yang diganti.
ALTER TYPE "EscrowEntryType" ADD VALUE IF NOT EXISTS 'ALIH_SUBSTITUSI';
