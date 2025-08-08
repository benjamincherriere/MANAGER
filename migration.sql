
ALTER TABLE products ADD COLUMN IF NOT EXISTS live_url_fr TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE TABLE IF NOT EXISTS content_checks (
    product_id UUID PRIMARY KEY,
    score INT,
    seo_ok BOOLEAN,
    images_ok BOOLEAN,
    schema_ok BOOLEAN,
    hreflang_ok BOOLEAN,
    indexable_ok BOOLEAN,
    last_run_at TIMESTAMPTZ,
    details JSONB
);
