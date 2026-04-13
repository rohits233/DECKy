-- Add image and chart columns to slides
alter table slides add column if not exists image_url text;
alter table slides add column if not exists chart_data text;
