-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/jhkxxqivgwhuyjiwwxqi/sql

-- ── PROSPECTS (Outreach leads) ─────────────────────────────────────────────
create table if not exists prospects (
  "id" text primary key,
  "name" text not null default '',
  "brand" text not null default '',
  "website" text not null default '',
  "instagram" text not null default '',
  "market" text not null default '',
  "segment" text not null default 'Ecom',
  "email" text not null default '',
  "status" text not null default 'Identified',
  "dateContacted" text not null default '',
  "adNotes" text not null default '',
  "emailNotes" text not null default '',
  "competitor" text not null default '',
  "angle" text not null default '',
  "notes" text not null default ''
);
alter table prospects disable row level security;

-- ── CRM PIPELINE LEADS ────────────────────────────────────────────────────
create table if not exists crm_leads (
  "id" text primary key,
  "name" text not null default '',
  "company" text not null default '',
  "market" text not null default '',
  "value" text not null default '',
  "stage" text not null default 'Lead',
  "email" text not null default '',
  "phone" text not null default '',
  "website" text not null default '',
  "social" text not null default '',
  "setup" text not null default '',
  "notes" text not null default '',
  "lastContacted" text not null default ''
);
alter table crm_leads disable row level security;

-- ── CRM CLIENTS ───────────────────────────────────────────────────────────
create table if not exists crm_clients (
  "id" text primary key,
  "name" text not null default '',
  "type" text not null default 'performance',
  "category" text not null default 'external',
  "baseFee" numeric not null default 0,
  "revSharePct" numeric not null default 0,
  "status" text not null default 'Active'
);
alter table crm_clients disable row level security;

-- ── CRM MONTHLY ENTRIES ───────────────────────────────────────────────────
create table if not exists crm_monthly (
  "clientId" text not null references crm_clients("id") on delete cascade,
  "month" text not null,
  "adSpend" numeric not null default 0,
  "revenueGenerated" numeric not null default 0,
  primary key ("clientId", "month")
);
alter table crm_monthly disable row level security;

-- ── STAFF ─────────────────────────────────────────────────────────────────
create table if not exists staff (
  "id" text primary key,
  "name" text not null default '',
  "role" text not null default '',
  "department" text not null default 'Other',
  "type" text not null default 'Full-time',
  "salary" numeric not null default 0,
  "startDate" text not null default '',
  "status" text not null default 'Active',
  "notes" text not null default ''
);
alter table staff disable row level security;

-- ── CANDIDATES (Hiring pipeline) ──────────────────────────────────────────
create table if not exists candidates (
  "id" text primary key,
  "name" text not null default '',
  "role" text not null default '',
  "source" text not null default '',
  "notes" text not null default '',
  "stage" text not null default 'Identified',
  "dateAdded" text not null default ''
);
alter table candidates disable row level security;
