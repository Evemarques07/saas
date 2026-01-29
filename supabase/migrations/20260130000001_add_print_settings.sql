-- Add print_settings column to companies table for network printer configuration
-- Phase 4: Network Printing Implementation

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS print_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.print_settings IS 'Network printer configuration: enabled, printer_name, ip, port, paper_width, auto_cut, timeout_ms, last_connected_at';
