-- AI Advokat owner professional access
-- Contains only an irreversible SHA-256 access-key hash; never the plaintext key.
-- The plaintext key is delivered privately to the project owner and can be revoked
-- by changing membership_access_keys.status to 'revoked'.

INSERT INTO membership_accounts (id,display_name,email,organization_name,status)
VALUES ('owner-professional','AI Advokat Owner',NULL,'AI Advokat','active')
ON CONFLICT(id) DO UPDATE SET
  display_name=excluded.display_name,
  organization_name=excluded.organization_name,
  status='active',
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO membership_entitlements
  (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at,updated_at)
VALUES
  ('ent-owner-professional','owner-professional','office','active','manual',1000000,3,0,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  plan_code='office',
  status='active',
  billing_cycle='manual',
  monthly_quota=1000000,
  seat_limit=3,
  price_mkd=0,
  expires_at=NULL,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO membership_access_keys
  (id,account_id,key_hash,key_prefix,label,status,expires_at)
VALUES
  ('key-owner-professional-primary','owner-professional','99526f8c3323b80545346a6f5dad2732a8a916fc6ed65174ccba0333de21c4e9','AIADV-OWNER-QP4yvx','Owner professional access','active',NULL)
ON CONFLICT(id) DO UPDATE SET
  account_id='owner-professional',
  key_hash='99526f8c3323b80545346a6f5dad2732a8a916fc6ed65174ccba0333de21c4e9',
  key_prefix='AIADV-OWNER-QP4yvx',
  label='Owner professional access',
  status='active',
  expires_at=NULL;
