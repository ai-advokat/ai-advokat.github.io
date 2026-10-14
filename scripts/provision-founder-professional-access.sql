-- AI Advokat founder professional access
-- Contains only an irreversible SHA-256 access-key hash; never the plaintext key.
-- The plaintext key is delivered privately to the project owner and can be revoked
-- by changing membership_access_keys.status to 'revoked'.

INSERT INTO membership_accounts (id,display_name,email,organization_name,status)
VALUES ('founder-professional','AI Advokat Founder',NULL,'AI Advokat','active')
ON CONFLICT(id) DO UPDATE SET
  display_name=excluded.display_name,
  organization_name=excluded.organization_name,
  status='active',
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO membership_entitlements
  (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at,updated_at)
VALUES
  ('ent-founder-professional','founder-professional','office','active','manual',100000,3,0,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  plan_code='office',
  status='active',
  billing_cycle='manual',
  monthly_quota=100000,
  seat_limit=3,
  price_mkd=0,
  expires_at=NULL,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO membership_access_keys
  (id,account_id,key_hash,key_prefix,label,status,expires_at)
VALUES
  ('key-founder-professional-primary','founder-professional','211fb7d473649562d85ed249b98a027a0b894ad25410f86135a8e61352e56eb5','AIADV-FOUNDER-XzwH','Founder professional access','active',NULL)
ON CONFLICT(id) DO UPDATE SET
  account_id='founder-professional',
  key_hash='211fb7d473649562d85ed249b98a027a0b894ad25410f86135a8e61352e56eb5',
  key_prefix='AIADV-FOUNDER-XzwH',
  label='Founder professional access',
  status='active',
  expires_at=NULL;
