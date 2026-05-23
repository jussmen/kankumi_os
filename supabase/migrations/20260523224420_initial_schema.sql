-- ============================================================
-- Kankumi OS: Initial Schema
-- ============================================================

-- Enable required extensions

-- ============================================================
-- TENANT LAYER
-- ============================================================

create table organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  address               text,
  unit_count            integer not null default 0,
  fiscal_year_start     integer not null default 4 check (fiscal_year_start between 1 and 12),
  created_at            timestamptz not null default now()
);

create type member_role as enum (
  'admin',
  'vice_president',
  'treasurer',
  'board_member',
  'auditor',
  'resident'
);

create table organization_members (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  role                  member_role not null default 'resident',
  is_active             boolean not null default true,
  invited_by            uuid references auth.users(id),
  joined_at             timestamptz not null default now(),
  unique(organization_id, user_id)
);

-- ============================================================
-- RESIDENT LAYER
-- ============================================================

create type occupancy_status as enum ('occupied', 'vacant', 'excluded');

create table units (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  unit_number           text not null,
  floor                 integer,
  area_sqm              numeric(6,2),
  occupancy_status      occupancy_status not null default 'occupied',
  created_at            timestamptz not null default now(),
  unique(organization_id, unit_number)
);

create type owner_type as enum ('owner', 'resident', 'both');

create table unit_owners (
  id                    uuid primary key default gen_random_uuid(),
  unit_id               uuid not null references units(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  user_id               uuid references auth.users(id),
  name                  text not null,
  email                 text,
  phone                 text,
  owner_type            owner_type not null default 'both',
  start_date            date not null default current_date,
  end_date              date,
  created_at            timestamptz not null default now()
);

create table household_profiles (
  id                    uuid primary key default gen_random_uuid(),
  unit_id               uuid not null references units(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  representative_name   text not null,
  contact               text not null,
  emergency_info        jsonb default '{}',
  facility_usage        jsonb default '{}',
  custom_fields         jsonb default '{}',
  updated_at            timestamptz not null default now(),
  unique(unit_id)
);

create table custom_profile_fields (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  label                 text not null,
  field_type            text not null check (field_type in ('text', 'boolean', 'select')),
  purpose               text not null,
  is_required           boolean not null default false,
  options               jsonb,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);

-- ============================================================
-- PAYMENT MANAGEMENT
-- ============================================================

create type charge_type_enum as enum (
  'management_fee',
  'reserve_fund',
  'common_fee',
  'parking',
  'bike_parking',
  'other'
);

create table charge_types (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  type                  charge_type_enum not null,
  alias_name            text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  unique(organization_id, type)
);

create table unit_charges (
  id                    uuid primary key default gen_random_uuid(),
  unit_id               uuid not null references units(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  charge_type_id        uuid not null references charge_types(id) on delete cascade,
  amount                numeric(10,0) not null default 0,
  effective_from        date not null,
  effective_to          date,
  created_at            timestamptz not null default now()
);

create type profile_source as enum ('user', 'admin');

create table payment_profiles (
  id                    uuid primary key default gen_random_uuid(),
  unit_id               uuid not null references units(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  transfer_name         text not null,
  bank_name             text not null,
  account_last4         text not null check (length(account_last4) = 4),
  source                profile_source not null default 'user',
  effective_from        date not null default current_date,
  effective_to          date,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now()
);

create table bank_csv_mappers (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  bank_name             text not null,
  preset_key            text,
  date_column           integer not null,
  amount_column         integer not null,
  description_column    integer not null,
  date_format           text not null default 'YYYY/MM/DD',
  encoding              text not null default 'shift-jis' check (encoding in ('shift-jis', 'utf-8')),
  skip_rows             integer not null default 1,
  created_at            timestamptz not null default now()
);

create table bank_imports (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  mapper_id             uuid references bank_csv_mappers(id),
  filename              text not null,
  import_date           date not null,
  record_count          integer not null default 0,
  matched_count         integer not null default 0,
  unmatched_count       integer not null default 0,
  imported_by           uuid references auth.users(id),
  created_at            timestamptz not null default now()
);

create type transaction_status as enum ('unmatched', 'matched', 'ignored');

create table bank_transactions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  bank_import_id        uuid not null references bank_imports(id) on delete cascade,
  transaction_date      date not null,
  description           text not null,
  amount                numeric(12,0) not null,
  balance               numeric(12,0),
  status                transaction_status not null default 'unmatched',
  created_at            timestamptz not null default now()
);

create type payment_status as enum ('confirmed', 'missing', 'irregular', 'excluded');

create table payment_records (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  unit_id               uuid not null references units(id) on delete cascade,
  year_month            text not null check (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  paid_amount           numeric(12,0) not null default 0,
  status                payment_status not null default 'missing',
  has_irregularity_flag boolean not null default false,
  bank_transaction_id   uuid references bank_transactions(id),
  notes                 text,
  created_at            timestamptz not null default now(),
  unique(organization_id, unit_id, year_month)
);

-- Back-reference from bank_transactions to payment_records
alter table bank_transactions
  add column matched_payment_id uuid references payment_records(id);

-- ============================================================
-- ACCOUNTING
-- ============================================================

create table fiscal_years (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  year                  integer not null,
  start_date            date not null,
  end_date              date not null,
  status                text not null default 'active' check (status in ('active', 'closed')),
  created_at            timestamptz not null default now(),
  unique(organization_id, year)
);

create type account_type as enum ('management', 'reserve_fund');

create table expense_categories (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  account_type          account_type not null,
  parent_id             uuid references expense_categories(id),
  is_template           boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create table budgets (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  fiscal_year_id        uuid not null references fiscal_years(id) on delete cascade,
  category_id           uuid not null references expense_categories(id) on delete cascade,
  budgeted_amount       numeric(12,0) not null default 0,
  created_at            timestamptz not null default now(),
  unique(fiscal_year_id, category_id)
);

create table expenses (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  fiscal_year_id        uuid not null references fiscal_years(id) on delete cascade,
  category_id           uuid not null references expense_categories(id) on delete cascade,
  amount                numeric(12,0) not null,
  expense_date          date not null,
  vendor                text,
  description           text,
  receipt_url           text,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- COLLABORATION
-- ============================================================

create type topic_type as enum ('board_meeting', 'general', 'issue', 'notice', 'task');
create type topic_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type visibility as enum ('board_only', 'all_members');
create type priority as enum ('low', 'normal', 'high', 'urgent');

create table topics (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  title                 text not null,
  body                  text not null default '',
  type                  topic_type not null default 'issue',
  status                topic_status not null default 'open',
  visibility            visibility not null default 'board_only',
  priority              priority not null default 'normal',
  due_date              date,
  pinned_at             timestamptz,
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table comments (
  id                    uuid primary key default gen_random_uuid(),
  topic_id              uuid not null references topics(id) on delete cascade,
  organization_id       uuid not null references organizations(id) on delete cascade,
  author_id             uuid not null references auth.users(id),
  body                  text not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table tasks (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  topic_id              uuid references topics(id) on delete set null,
  title                 text not null,
  assignee_id           uuid references auth.users(id),
  due_date              date,
  status                text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  completed_at          timestamptz,
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now()
);

create table attachments (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  topic_id              uuid references topics(id) on delete cascade,
  expense_id            uuid references expenses(id) on delete cascade,
  storage_path          text not null,
  file_name             text not null,
  file_size             bigint not null,
  content_type          text not null,
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now()
);

create table announcements (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  title                 text not null,
  body                  text not null,
  visibility            visibility not null default 'all_members',
  published_at          timestamptz,
  expires_at            timestamptz,
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- OPERATIONS MANAGEMENT
-- ============================================================

create table checklist_templates (
  id                    uuid primary key default gen_random_uuid(),
  key                   text not null unique,
  label                 text not null,
  default_frequency     text not null check (default_frequency in ('annual', 'semi_annual', 'triennial', 'custom')),
  legal_basis           text,
  notes                 text,
  created_at            timestamptz not null default now()
);

create table annual_checklists (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  fiscal_year_id        uuid not null references fiscal_years(id) on delete cascade,
  template_id           uuid references checklist_templates(id),
  title                 text not null,
  scheduled_date        date,
  assignee_id           uuid references auth.users(id),
  status                text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  completed_at          timestamptz,
  notes                 text,
  created_at            timestamptz not null default now()
);

create table operations_calendar_events (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  checklist_id          uuid references annual_checklists(id) on delete set null,
  title                 text not null,
  start_date            date not null,
  end_date              date,
  is_recurring          boolean not null default false,
  recurrence_rule       text,
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now()
);

-- ============================================================
-- SEED: Checklist Templates（法定点検標準テンプレート）
-- ============================================================

insert into checklist_templates (key, label, default_frequency, legal_basis, notes) values
  ('fire_inspection',        '消防設備検査',           'annual',      '消防法',           '建物規模により年1〜2回'),
  ('building_equipment',     '建築設備定期検査',        'annual',      '建築基準法',        NULL),
  ('elevator_inspection',    'エレベーター定期検査',     'annual',      '建築基準法',        NULL),
  ('water_tank_cleaning',    '貯水槽清掃・水質検査',     'annual',      '水道法',           NULL),
  ('specific_building',      '特定建築物定期調査',       'triennial',   '建築基準法',        '3年ごと'),
  ('drainage_cleaning',      '排水設備清掃',            'semi_annual', NULL,               '年1〜2回（任意）'),
  ('general_assembly',       '管理組合定期総会',         'annual',      '区分所有法',        NULL),
  ('board_meeting',          '理事会',                  'custom',      NULL,               '頻度は組合ごとに設定');

-- ============================================================
-- RLS: Row Level Security
-- ============================================================

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table units enable row level security;
alter table unit_owners enable row level security;
alter table household_profiles enable row level security;
alter table custom_profile_fields enable row level security;
alter table charge_types enable row level security;
alter table unit_charges enable row level security;
alter table payment_profiles enable row level security;
alter table bank_csv_mappers enable row level security;
alter table bank_imports enable row level security;
alter table bank_transactions enable row level security;
alter table payment_records enable row level security;
alter table fiscal_years enable row level security;
alter table expense_categories enable row level security;
alter table budgets enable row level security;
alter table expenses enable row level security;
alter table topics enable row level security;
alter table comments enable row level security;
alter table tasks enable row level security;
alter table attachments enable row level security;
alter table announcements enable row level security;
alter table annual_checklists enable row level security;
alter table operations_calendar_events enable row level security;

-- Helper function: 自分がアクティブメンバーである organization_id の一覧
create or replace function my_organization_ids()
returns setof uuid language sql security definer stable as $$
  select organization_id from organization_members
  where user_id = auth.uid() and is_active = true;
$$;

-- Helper function: 自分のロールを取得
create or replace function my_role(org_id uuid)
returns member_role language sql security definer stable as $$
  select role from organization_members
  where user_id = auth.uid() and organization_id = org_id and is_active = true;
$$;

-- Helper function: 理事以上かどうか
create or replace function is_board_or_above(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid()
    and organization_id = org_id
    and is_active = true
    and role in ('admin', 'vice_president', 'treasurer', 'board_member', 'auditor')
  );
$$;

-- organizations: メンバーのみ閲覧
create policy "org_member_select" on organizations for select
  using (id in (select my_organization_ids()));

-- organization_members: 自組合のメンバー一覧を閲覧
create policy "member_list_select" on organization_members for select
  using (organization_id in (select my_organization_ids()));

-- units: メンバー全員が閲覧可能
create policy "units_select" on units for select
  using (organization_id in (select my_organization_ids()));

-- topics: visibility に基づく制御
create policy "topics_select" on topics for select
  using (
    organization_id in (select my_organization_ids())
    and (
      visibility = 'all_members'
      or is_board_or_above(organization_id)
    )
  );

-- comments: 親 topic が閲覧可能なもののみ
create policy "comments_select" on comments for select
  using (
    organization_id in (select my_organization_ids())
    and exists (
      select 1 from topics t
      where t.id = topic_id
      and (t.visibility = 'all_members' or is_board_or_above(t.organization_id))
    )
  );

-- 財務系テーブル: 理事以上のみ閲覧（auditor含む）
create policy "payment_records_select" on payment_records for select
  using (is_board_or_above(organization_id));

create policy "bank_imports_select" on bank_imports for select
  using (is_board_or_above(organization_id));

create policy "bank_transactions_select" on bank_transactions for select
  using (is_board_or_above(organization_id));

create policy "expenses_select" on expenses for select
  using (is_board_or_above(organization_id));

create policy "fiscal_years_select" on fiscal_years for select
  using (organization_id in (select my_organization_ids()));

create policy "expense_categories_select" on expense_categories for select
  using (organization_id in (select my_organization_ids()));

create policy "budgets_select" on budgets for select
  using (is_board_or_above(organization_id));

-- household_profiles: 理事以上は全室、住民は自室のみ
create policy "household_profiles_select_board" on household_profiles for select
  using (is_board_or_above(organization_id));

create policy "household_profiles_select_resident" on household_profiles for select
  using (
    organization_id in (select my_organization_ids())
    and unit_id in (
      select unit_id from unit_owners
      where user_id = auth.uid() and end_date is null
    )
  );

-- household_profiles: 住民は自室のみ更新
create policy "household_profiles_update_resident" on household_profiles for update
  using (
    unit_id in (
      select unit_id from unit_owners
      where user_id = auth.uid() and end_date is null
    )
  );

-- payment_profiles: 理事以上は全室、住民は自室のみ
create policy "payment_profiles_select_board" on payment_profiles for select
  using (is_board_or_above(organization_id));

create policy "payment_profiles_select_resident" on payment_profiles for select
  using (
    organization_id in (select my_organization_ids())
    and unit_id in (
      select unit_id from unit_owners
      where user_id = auth.uid() and end_date is null
    )
  );

-- annual_checklists / operations_calendar_events: メンバー全員閲覧
create policy "annual_checklists_select" on annual_checklists for select
  using (organization_id in (select my_organization_ids()));

create policy "operations_calendar_events_select" on operations_calendar_events for select
  using (organization_id in (select my_organization_ids()));

-- announcements: visibility に基づく制御
create policy "announcements_select" on announcements for select
  using (
    organization_id in (select my_organization_ids())
    and (
      visibility = 'all_members'
      or is_board_or_above(organization_id)
    )
  );

-- tasks: メンバー全員閲覧（board_onlyのtopicから派生するものは別途制御）
create policy "tasks_select" on tasks for select
  using (organization_id in (select my_organization_ids()));

-- attachments: 親リソースが閲覧可能なもののみ
create policy "attachments_select" on attachments for select
  using (organization_id in (select my_organization_ids()));

-- checklist_templates: 全員閲覧（publicデータ）
create policy "checklist_templates_select" on checklist_templates for select
  using (true);

-- ============================================================
-- INDEXES
-- ============================================================

create index on organization_members(user_id);
create index on organization_members(organization_id);
create index on units(organization_id);
create index on unit_owners(unit_id);
create index on unit_owners(user_id);
create index on payment_profiles(unit_id, effective_from, effective_to);
create index on unit_charges(unit_id, effective_from, effective_to);
create index on payment_records(organization_id, year_month);
create index on payment_records(unit_id, year_month);
create index on bank_transactions(bank_import_id);
create index on bank_transactions(status);
create index on topics(organization_id, visibility);
create index on topics(organization_id, status);
create index on expenses(organization_id, fiscal_year_id);
create index on annual_checklists(organization_id, fiscal_year_id);
