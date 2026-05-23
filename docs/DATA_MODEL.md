# データモデル設計

## 設計原則

全テーブルに `organization_id` を貫通させ、Supabase Row Level Security（RLS）で「自分の組合のデータしか見えない」を保証する。

---

## テーブル一覧

### テナント・認証

```sql
organizations
  id                    uuid PK
  name                  text          -- マンション名
  address               text
  unit_count            integer
  fiscal_year_start     integer       -- 会計年度開始月 (1-12)
  created_at            timestamptz

organization_members
  id                    uuid PK
  organization_id       uuid FK → organizations
  user_id               uuid FK → auth.users
  role                  text          -- admin | vice_president | treasurer | board_member | auditor | resident
  is_active             boolean
  invited_by            uuid FK → auth.users
  joined_at             timestamptz
```

### 住民・部屋台帳

```sql
units
  id                    uuid PK
  organization_id       uuid FK
  unit_number           text          -- 部屋番号
  floor                 integer
  area_sqm              numeric
  occupancy_status      text          -- occupied | vacant | excluded
  created_at            timestamptz

unit_owners
  id                    uuid PK
  unit_id               uuid FK → units
  organization_id       uuid FK
  user_id               uuid FK → auth.users  -- nullable
  name                  text
  email                 text
  phone                 text
  owner_type            text          -- owner | resident | both
  start_date            date
  end_date              date          -- null = 現在有効
  created_at            timestamptz

household_profiles
  id                    uuid PK
  unit_id               uuid FK → units
  organization_id       uuid FK
  representative_name   text          -- 住民代表者氏名（必須）
  contact               text          -- 連絡先（必須）
  emergency_info        jsonb         -- 緊急時対応情報（任意）
  facility_usage        jsonb         -- 駐車場・バイク置き場利用情報
  custom_fields         jsonb         -- CustomProfileField の値
  updated_at            timestamptz

custom_profile_fields   -- Organization定義のカスタム項目
  id                    uuid PK
  organization_id       uuid FK
  label                 text
  field_type            text          -- text | boolean | select
  purpose               text          -- 取得目的の説明
  is_required           boolean
  options               jsonb         -- select型の選択肢
  sort_order            integer
```

### 入金管理

```sql
payment_profiles        -- 振込情報（住民自己登録 or 管理者入力）
  id                    uuid PK
  unit_id               uuid FK → units
  organization_id       uuid FK
  transfer_name         text          -- 振込名義（カタカナ）
  bank_name             text
  account_last4         text          -- 口座番号下4桁
  source                text          -- user | admin
  effective_from        date
  effective_to          date          -- null = 現在有効
  created_by            uuid FK → auth.users
  created_at            timestamptz

charge_types            -- 請求項目種別（Organizationレベル）
  id                    uuid PK
  organization_id       uuid FK
  type                  text          -- management_fee | reserve_fund | common_fee | parking | bike_parking | other
  alias_name            text          -- nullable（other 用のカスタム名）
  is_active             boolean

unit_charges            -- 部屋別請求設定（有効期間付き）
  id                    uuid PK
  unit_id               uuid FK → units
  organization_id       uuid FK
  charge_type_id        uuid FK → charge_types
  amount                numeric
  effective_from        date
  effective_to          date          -- null = 現在有効
  created_at            timestamptz

bank_csv_mappers        -- 銀行CSVフォーマット設定
  id                    uuid PK
  organization_id       uuid FK
  bank_name             text
  preset_key            text          -- nullable（プリセット銀行の識別子）
  date_column           integer       -- 列インデックス
  amount_column         integer
  description_column    integer
  date_format           text
  encoding              text          -- shift-jis | utf-8
  skip_rows             integer       -- ヘッダー行数

bank_imports
  id                    uuid PK
  organization_id       uuid FK
  mapper_id             uuid FK → bank_csv_mappers
  filename              text
  import_date           date
  record_count          integer
  matched_count         integer
  unmatched_count       integer
  imported_by           uuid FK → auth.users
  created_at            timestamptz

bank_transactions
  id                    uuid PK
  organization_id       uuid FK
  bank_import_id        uuid FK → bank_imports
  transaction_date      date
  description           text          -- 摘要（振込人名義を含む）
  amount                numeric
  balance               numeric
  matched_payment_id    uuid FK → payment_records  -- nullable
  status                text          -- unmatched | matched | ignored
  created_at            timestamptz

payment_records
  id                    uuid PK
  organization_id       uuid FK
  unit_id               uuid FK → units
  year_month            text          -- YYYY-MM
  paid_amount           numeric
  status                text          -- confirmed | missing | irregular | excluded
  has_irregularity_flag boolean       -- ! フラグ
  bank_transaction_id   uuid FK → bank_transactions  -- nullable
  notes                 text
  created_at            timestamptz
```

### 支出・会計

```sql
fiscal_years
  id                    uuid PK
  organization_id       uuid FK
  year                  integer
  start_date            date
  end_date              date
  status                text          -- active | closed

expense_categories
  id                    uuid PK
  organization_id       uuid FK
  name                  text
  account_type          text          -- management | reserve_fund
  parent_id             uuid FK → expense_categories  -- nullable（階層）
  is_template           boolean       -- システム提供テンプレートか
  is_active             boolean

budgets
  id                    uuid PK
  organization_id       uuid FK
  fiscal_year_id        uuid FK → fiscal_years
  category_id           uuid FK → expense_categories
  budgeted_amount       numeric

expenses
  id                    uuid PK
  organization_id       uuid FK
  fiscal_year_id        uuid FK → fiscal_years
  category_id           uuid FK → expense_categories
  amount                numeric
  expense_date          date
  vendor                text
  description           text
  receipt_url           text          -- Supabase Storage（将来OCR対応）
  created_by            uuid FK → auth.users
  created_at            timestamptz
```

### コラボレーション

```sql
topics
  id                    uuid PK
  organization_id       uuid FK
  title                 text
  body                  text          -- Markdown
  type                  text          -- board_meeting | general | issue | notice | task
  status                text          -- open | in_progress | resolved | closed
  visibility            text          -- board_only | all_members
  priority              text          -- low | normal | high | urgent
  due_date              date
  pinned_at             timestamptz
  created_by            uuid FK → auth.users
  created_at            timestamptz
  updated_at            timestamptz

comments
  id                    uuid PK
  topic_id              uuid FK → topics
  organization_id       uuid FK
  author_id             uuid FK → auth.users
  body                  text
  created_at            timestamptz
  updated_at            timestamptz

tasks
  id                    uuid PK
  organization_id       uuid FK
  topic_id              uuid FK → topics  -- nullable
  title                 text
  assignee_id           uuid FK → auth.users  -- nullable
  due_date              date
  status                text          -- todo | in_progress | done
  completed_at          timestamptz
  created_by            uuid FK → auth.users
  created_at            timestamptz

attachments
  id                    uuid PK
  organization_id       uuid FK
  topic_id              uuid FK → topics   -- nullable
  expense_id            uuid FK → expenses  -- nullable
  storage_path          text          -- Supabase Storage
  file_name             text
  file_size             bigint
  content_type          text
  created_by            uuid FK → auth.users
  created_at            timestamptz

announcements
  id                    uuid PK
  organization_id       uuid FK
  title                 text
  body                  text
  visibility            text          -- board_only | all_members
  published_at          timestamptz
  expires_at            timestamptz
  created_by            uuid FK → auth.users
```

### 業務管理

```sql
checklist_templates     -- システム提供の標準ComplianceTask
  id                    uuid PK
  key                   text          -- 識別子（fire_inspection など）
  label                 text          -- 消防設備検査
  default_frequency     text          -- annual | semi_annual | triennial | custom
  legal_basis           text          -- 根拠法（消防法 など）
  notes                 text

annual_checklists
  id                    uuid PK
  organization_id       uuid FK
  fiscal_year_id        uuid FK → fiscal_years
  template_id           uuid FK → checklist_templates  -- nullable（カスタム項目はnull）
  title                 text
  scheduled_date        date
  assignee_id           uuid FK → auth.users  -- nullable
  status                text          -- pending | completed | skipped
  completed_at          timestamptz
  notes                 text
  created_at            timestamptz

operations_calendar_events
  id                    uuid PK
  organization_id       uuid FK
  checklist_id          uuid FK → annual_checklists  -- nullable
  title                 text
  start_date            date
  end_date              date
  is_recurring          boolean
  recurrence_rule       text          -- iCalendar RRULE形式
  created_by            uuid FK → auth.users
  created_at            timestamptz
```

---

## RLSポリシー基本パターン

```sql
-- 全テーブル共通：自分がメンバーの組合のデータのみ参照可能
CREATE POLICY "member_access"
ON {table} FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- board_only コンテンツ：理事以上のみ
CREATE POLICY "board_only_access"
ON topics FOR SELECT
USING (
  visibility = 'all_members'
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
    AND organization_id = topics.organization_id
    AND role IN ('admin','vice_president','treasurer','board_member','auditor')
  )
);

-- 住民：自室の情報のみ編集可能
CREATE POLICY "resident_own_unit"
ON household_profiles FOR UPDATE
USING (
  unit_id IN (
    SELECT id FROM units u
    JOIN unit_owners uo ON uo.unit_id = u.id
    WHERE uo.user_id = auth.uid()
    AND uo.end_date IS NULL
  )
);
```

---

## 有効期間パターン（共通）

`payment_profiles` と `unit_charges` は共通の有効期間パターンを持つ。

```sql
-- 特定月（YYYY-MM）に有効なレコードを取得する共通クエリパターン
WHERE effective_from <= date_trunc('month', target_date)
AND (effective_to IS NULL OR effective_to > date_trunc('month', target_date))
```
