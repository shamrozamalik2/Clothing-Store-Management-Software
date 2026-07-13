-- ================================================================
-- SAS Garments – PostgreSQL Multi-Tenant Schema
-- Generated: production reference schema
-- Apply via: psql $DATABASE_URL -f database/schema.sql
-- (Or use the migration runner: node backend/src/database/migrate.js)
-- ================================================================

-- ────────────────────────────────────────────────────────────
-- MIGRATION TRACKING
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER      PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- COMPANIES  (root of multi-tenancy)
-- ────────────────────────────────────────────────────────────
CREATE TABLE companies (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(100) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(50),
    address       TEXT,
    logo_url      VARCHAR(500),
    plan          VARCHAR(50)  NOT NULL DEFAULT 'standard',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    trial_ends_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT companies_slug_key UNIQUE (slug)
);

-- ────────────────────────────────────────────────────────────
-- BRANCHES
-- ────────────────────────────────────────────────────────────
CREATE TABLE branches (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ROLES  (per-company)
-- ────────────────────────────────────────────────────────────
CREATE TABLE roles (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    label       VARCHAR(100),
    permissions JSONB        NOT NULL DEFAULT '{}',
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_company_name_key UNIQUE (company_id, name)
);

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id   INTEGER      REFERENCES branches(id) ON DELETE SET NULL,
    role_id     INTEGER      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    avatar      VARCHAR(500),
    phone       VARCHAR(50),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_company_email_key UNIQUE (company_id, email)
);

-- ────────────────────────────────────────────────────────────
-- REFRESH TOKENS
-- ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT refresh_tokens_hash_key UNIQUE (token_hash)
);

-- ────────────────────────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id   INTEGER      REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255),
    description TEXT,
    image       VARCHAR(500),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- BRANDS
-- ────────────────────────────────────────────────────────────
CREATE TABLE brands (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255),
    description TEXT,
    logo        VARCHAR(500),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE products (
    id              SERIAL        PRIMARY KEY,
    company_id      INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id     INTEGER       REFERENCES categories(id) ON DELETE SET NULL,
    brand_id        INTEGER       REFERENCES brands(id) ON DELETE SET NULL,
    name            VARCHAR(255)  NOT NULL,
    sku             VARCHAR(100)  NOT NULL,
    barcode         VARCHAR(100),
    description     TEXT,
    image           VARCHAR(500),
    unit            VARCHAR(50)   NOT NULL DEFAULT 'pcs',
    cost_price      NUMERIC(15,4) NOT NULL DEFAULT 0,
    sale_price      NUMERIC(15,4) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(15,4) NOT NULL DEFAULT 0,
    tax_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
    stock_quantity  NUMERIC(15,4) NOT NULL DEFAULT 0,
    low_stock_alert INTEGER       NOT NULL DEFAULT 5,
    track_inventory BOOLEAN       NOT NULL DEFAULT TRUE,
    allow_negative  BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT products_company_sku_key UNIQUE (company_id, sku)
);

-- ────────────────────────────────────────────────────────────
-- PRODUCT VARIANTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE product_variants (
    id             SERIAL        PRIMARY KEY,
    company_id     INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku            VARCHAR(100)  NOT NULL,
    barcode        VARCHAR(100),
    size           VARCHAR(50),
    color          VARCHAR(50),
    cost_price     NUMERIC(15,4) NOT NULL DEFAULT 0,
    sale_price     NUMERIC(15,4) NOT NULL DEFAULT 0,
    stock_quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT variants_company_sku_key UNIQUE (company_id, sku)
);

-- ────────────────────────────────────────────────────────────
-- SUPPLIERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id              SERIAL        PRIMARY KEY,
    company_id      INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255)  NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    opening_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
    current_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id              SERIAL        PRIMARY KEY,
    company_id      INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255)  NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    customer_group  VARCHAR(50)   NOT NULL DEFAULT 'general',
    credit_limit    NUMERIC(15,4) NOT NULL DEFAULT 0,
    current_balance NUMERIC(15,4) NOT NULL DEFAULT 0,
    loyalty_points  INTEGER       NOT NULL DEFAULT 0,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PURCHASES
-- ────────────────────────────────────────────────────────────
CREATE TABLE purchases (
    id              SERIAL        PRIMARY KEY,
    company_id      INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id       INTEGER       REFERENCES branches(id) ON DELETE SET NULL,
    supplier_id     INTEGER       REFERENCES suppliers(id) ON DELETE SET NULL,
    reference       VARCHAR(100)  NOT NULL,
    status          VARCHAR(50)   NOT NULL DEFAULT 'ordered',
    purchase_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    subtotal        NUMERIC(15,4) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(15,4) NOT NULL DEFAULT 0,
    paid_amount     NUMERIC(15,4) NOT NULL DEFAULT 0,
    due_amount      NUMERIC(15,4) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT purchases_company_ref_key UNIQUE (company_id, reference)
);

-- ────────────────────────────────────────────────────────────
-- PURCHASE ITEMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE purchase_items (
    id           SERIAL        PRIMARY KEY,
    company_id   INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    purchase_id  INTEGER       NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id   INTEGER       REFERENCES products(id) ON DELETE SET NULL,
    variant_id   INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255)  NOT NULL,
    sku          VARCHAR(100),
    quantity     NUMERIC(15,4) NOT NULL,
    unit_cost    NUMERIC(15,4) NOT NULL,
    discount     NUMERIC(15,4) NOT NULL DEFAULT 0,
    tax_amount   NUMERIC(15,4) NOT NULL DEFAULT 0,
    total        NUMERIC(15,4) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- PURCHASE PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE purchase_payments (
    id             SERIAL        PRIMARY KEY,
    company_id     INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    purchase_id    INTEGER       NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    amount         NUMERIC(15,4) NOT NULL,
    payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
    reference      VARCHAR(100),
    notes          TEXT,
    paid_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- SALES
-- ────────────────────────────────────────────────────────────
CREATE TABLE sales (
    id              SERIAL        PRIMARY KEY,
    company_id      INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id       INTEGER       REFERENCES branches(id) ON DELETE SET NULL,
    customer_id     INTEGER       REFERENCES customers(id) ON DELETE SET NULL,
    reference       VARCHAR(100)  NOT NULL,
    status          VARCHAR(50)   NOT NULL DEFAULT 'completed',
    sale_date       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    subtotal        NUMERIC(15,4) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(15,4) NOT NULL,
    paid_amount     NUMERIC(15,4) NOT NULL DEFAULT 0,
    change_amount   NUMERIC(15,4) NOT NULL DEFAULT 0,
    due_amount      NUMERIC(15,4) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(50)   NOT NULL DEFAULT 'cash',
    notes           TEXT,
    created_by      INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT sales_company_ref_key UNIQUE (company_id, reference)
);

-- ────────────────────────────────────────────────────────────
-- SALE ITEMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE sale_items (
    id           SERIAL        PRIMARY KEY,
    company_id   INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id      INTEGER       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id   INTEGER       REFERENCES products(id) ON DELETE SET NULL,
    variant_id   INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255)  NOT NULL,
    sku          VARCHAR(100),
    quantity     NUMERIC(15,4) NOT NULL,
    unit_price   NUMERIC(15,4) NOT NULL,
    cost_price   NUMERIC(15,4) NOT NULL DEFAULT 0,
    discount     NUMERIC(15,4) NOT NULL DEFAULT 0,
    tax_amount   NUMERIC(15,4) NOT NULL DEFAULT 0,
    total        NUMERIC(15,4) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- RETURNS
-- ────────────────────────────────────────────────────────────
CREATE TABLE returns (
    id           SERIAL        PRIMARY KEY,
    company_id   INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id      INTEGER       REFERENCES sales(id) ON DELETE SET NULL,
    reference    VARCHAR(100)  NOT NULL,
    return_date  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
    refund_method VARCHAR(50),
    notes        TEXT,
    created_by   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT returns_company_ref_key UNIQUE (company_id, reference)
);

CREATE TABLE return_items (
    id           SERIAL        PRIMARY KEY,
    company_id   INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    return_id    INTEGER       NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id   INTEGER       REFERENCES products(id) ON DELETE SET NULL,
    variant_id   INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255)  NOT NULL,
    quantity     NUMERIC(15,4) NOT NULL,
    unit_price   NUMERIC(15,4) NOT NULL,
    total        NUMERIC(15,4) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- STOCK ADJUSTMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE stock_adjustments (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id   INTEGER      REFERENCES branches(id) ON DELETE SET NULL,
    reference   VARCHAR(100) NOT NULL,
    type        VARCHAR(50)  NOT NULL DEFAULT 'adjustment',
    reason      TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'completed',
    notes       TEXT,
    created_by  INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT stock_adj_company_ref_key UNIQUE (company_id, reference)
);

CREATE TABLE stock_adjustment_items (
    id                SERIAL        PRIMARY KEY,
    company_id        INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    adjustment_id     INTEGER       NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id        INTEGER       REFERENCES products(id) ON DELETE SET NULL,
    variant_id        INTEGER       REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name      VARCHAR(255)  NOT NULL,
    sku               VARCHAR(100),
    quantity_before   NUMERIC(15,4) NOT NULL DEFAULT 0,
    quantity_adjusted NUMERIC(15,4) NOT NULL,
    quantity_after    NUMERIC(15,4) NOT NULL DEFAULT 0,
    unit_cost         NUMERIC(15,4) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- EXPENSE CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE expense_categories (
    id         SERIAL       PRIMARY KEY,
    company_id INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT expense_cats_company_name_key UNIQUE (company_id, name)
);

-- ────────────────────────────────────────────────────────────
-- EXPENSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE expenses (
    id             SERIAL        PRIMARY KEY,
    company_id     INTEGER       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id      INTEGER       REFERENCES branches(id) ON DELETE SET NULL,
    category_id    INTEGER       REFERENCES expense_categories(id) ON DELETE SET NULL,
    reference      VARCHAR(100),
    title          VARCHAR(255)  NOT NULL,
    amount         NUMERIC(15,4) NOT NULL,
    payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
    expense_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    notes          TEXT,
    created_by     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- SETTINGS  (per-company key-value store)
-- ────────────────────────────────────────────────────────────
CREATE TABLE settings (
    id         SERIAL       PRIMARY KEY,
    company_id INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    key        VARCHAR(100) NOT NULL,
    value      TEXT,
    type       VARCHAR(50)  NOT NULL DEFAULT 'string',
    group_name VARCHAR(50)  NOT NULL DEFAULT 'general',
    label      VARCHAR(255),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT settings_company_key_key UNIQUE (company_id, key)
);

-- ────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id         BIGSERIAL    PRIMARY KEY,
    company_id INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(100),
    entity_id  INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_companies_slug          ON companies(slug);
CREATE INDEX idx_branches_company        ON branches(company_id);
CREATE INDEX idx_roles_company           ON roles(company_id);
CREATE INDEX idx_users_company           ON users(company_id);
CREATE INDEX idx_users_company_email     ON users(company_id, email);
CREATE INDEX idx_refresh_tokens_user     ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash     ON refresh_tokens(token_hash);

CREATE INDEX idx_products_company        ON products(company_id);
CREATE INDEX idx_products_company_sku    ON products(company_id, sku);
CREATE INDEX idx_products_company_barcode ON products(company_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category       ON products(category_id);
CREATE INDEX idx_products_brand          ON products(brand_id);
CREATE INDEX idx_variants_product        ON product_variants(product_id);

CREATE INDEX idx_suppliers_company       ON suppliers(company_id);
CREATE INDEX idx_customers_company       ON customers(company_id);
CREATE INDEX idx_categories_company      ON categories(company_id);
CREATE INDEX idx_brands_company          ON brands(company_id);

CREATE INDEX idx_purchases_company       ON purchases(company_id);
CREATE INDEX idx_purchases_date          ON purchases(company_id, purchase_date DESC);
CREATE INDEX idx_purchases_supplier      ON purchases(company_id, supplier_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

CREATE INDEX idx_sales_company           ON sales(company_id);
CREATE INDEX idx_sales_date              ON sales(company_id, sale_date DESC);
CREATE INDEX idx_sales_customer          ON sales(company_id, customer_id);
CREATE INDEX idx_sale_items_sale         ON sale_items(sale_id);

CREATE INDEX idx_stock_adj_company       ON stock_adjustments(company_id);
CREATE INDEX idx_stock_adj_date          ON stock_adjustments(company_id, created_at DESC);
CREATE INDEX idx_stock_adj_items         ON stock_adjustment_items(adjustment_id);

CREATE INDEX idx_expenses_company        ON expenses(company_id);
CREATE INDEX idx_expenses_date           ON expenses(company_id, expense_date DESC);

CREATE INDEX idx_settings_company        ON settings(company_id);
CREATE INDEX idx_audit_company_date      ON audit_logs(company_id, created_at DESC);
