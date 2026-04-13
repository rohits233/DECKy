-- Add icon and color columns to slides table
alter table slides add column if not exists icon text;
alter table slides add column if not exists color text;
