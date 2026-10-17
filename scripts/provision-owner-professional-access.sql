-- Deprecated credential-bearing provisioning file.
-- Intentionally contains NO key hash, prefix or secret material.
-- Use scripts/provision-owner-professional-access.mjs from the manual
-- owner-professional-access workflow. That renderer computes HMAC-SHA256
-- with MEMBERSHIP_KEY_PEPPER and writes a temporary 0600 SQL file at runtime.
--
-- Keeping this path as a tombstone prevents old automation/documentation from
-- silently reintroducing the previously exposed unsalted owner-key hash.
SELECT 'owner provisioning moved to HMAC v2 runtime renderer' AS status;
