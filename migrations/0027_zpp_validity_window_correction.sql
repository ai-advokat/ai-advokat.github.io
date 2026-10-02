-- AI Advokat 0027: ZPP pre-2027 validity-window correction.
--
-- Forward-only metadata correction. instrument_versions.valid_to is EXCLUSIVE.
-- The pre-2027 ZPP track remains applicable through 2027-01-17, therefore its
-- exclusive upper bound must be 2027-01-18 so it meets the 151/2026
-- application_from boundary without a one-day gap.
--
-- This migration changes no article text, no Human Gate status, no is_current
-- flag, and does not promote any legal version.

UPDATE instrument_versions
   SET valid_to = '2027-01-18'
 WHERE instrument_id = (
         SELECT id FROM legal_instruments WHERE canonical_key = 'mk:zpp'
       )
   AND version_label = 'applicable-track-79/2005-through-124/2015'
   AND valid_to = '2027-01-17';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('27', 'Correct ZPP pre-2027 exclusive valid_to boundary to 2027-01-18');
