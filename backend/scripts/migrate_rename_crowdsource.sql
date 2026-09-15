-- SQL Migration: Rename crowdsource column
-- Note: This should be run on the database to match the codebase changes.

ALTER TABLE ai_crowdsource_context 
RENAME COLUMN crowdsource_report_count_30d TO nearby_report_count_30d_snapshot;
