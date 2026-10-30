-- AI ADVOKAT 4 PRIVATE ZOKI STAGING UAT
-- TEMPLATE ONLY. Replace placeholders locally. Never commit a real key or key hash.
-- Target MUST be dedicated staging D1 only:
-- ai-advokat-staging-db / 309f72b8-8711-47fc-bea7-fbd1d649561d
-- Human Gate: APPROVE_PRIVATE_ZOKI_STAGING_UAT

BEGIN TRANSACTION;

INSERT INTO membership_accounts
  (id,display_name,email,organization_name,status)
VALUES
  ('<UAT_ACCOUNT_ID>','Private Zoki UAT',NULL,'AI ADVOKAT 4 staging UAT','active');

INSERT INTO membership_entitlements
  (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at)
VALUES
  ('<UAT_ENTITLEMENT_ID>','<UAT_ACCOUNT_ID>','office','active','manual',40,1,0,'<STARTS_AT_ISO>','<EXPIRES_AT_ISO>');

INSERT INTO membership_access_keys
  (id,account_id,key_hash,key_prefix,label,status,expires_at)
VALUES
  ('<UAT_KEY_ID>','<UAT_ACCOUNT_ID>','<SHA256_HASH_ONLY>','<KEY_PREFIX_ONLY>','Private Zoki UAT temporary key','active','<EXPIRES_AT_ISO>');

COMMIT;

-- CLEANUP after UAT:
-- BEGIN TRANSACTION;
-- DELETE FROM membership_usage_monthly WHERE subject_key='account:<UAT_ACCOUNT_ID>';
-- DELETE FROM membership_access_keys WHERE account_id='<UAT_ACCOUNT_ID>';
-- DELETE FROM membership_entitlements WHERE account_id='<UAT_ACCOUNT_ID>';
-- DELETE FROM membership_accounts WHERE id='<UAT_ACCOUNT_ID>';
-- COMMIT;
