-- RLS write policies
-- 初期スキーマでは SELECT ポリシーのみ定義されていたため、
-- INSERT / UPDATE / DELETE ポリシーを追加する。
--
-- ロール方針:
--   board_write: admin / vice_president / treasurer / board_member
--   (auditor は読み取り専用)

create or replace function can_board_write(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where user_id = auth.uid()
      and organization_id = org_id
      and is_active = true
      and role in ('admin', 'vice_president', 'treasurer', 'board_member')
  );
$$;

-- ────────────────────────────────────────────────────────────────
-- units
-- ────────────────────────────────────────────────────────────────
create policy "units_insert" on units for insert
  with check (can_board_write(organization_id));

create policy "units_update" on units for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "units_delete" on units for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- unit_charges
-- ────────────────────────────────────────────────────────────────
create policy "unit_charges_insert" on unit_charges for insert
  with check (can_board_write(organization_id));

create policy "unit_charges_update" on unit_charges for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "unit_charges_delete" on unit_charges for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- unit_owners
-- ────────────────────────────────────────────────────────────────
create policy "unit_owners_insert" on unit_owners for insert
  with check (can_board_write(organization_id));

create policy "unit_owners_update" on unit_owners for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "unit_owners_delete" on unit_owners for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- payment_profiles
-- ────────────────────────────────────────────────────────────────
create policy "payment_profiles_insert" on payment_profiles for insert
  with check (can_board_write(organization_id));

create policy "payment_profiles_update" on payment_profiles for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- payment_records
-- ────────────────────────────────────────────────────────────────
create policy "payment_records_insert" on payment_records for insert
  with check (can_board_write(organization_id));

create policy "payment_records_update" on payment_records for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- bank_transactions / bank_imports
-- ────────────────────────────────────────────────────────────────
create policy "bank_transactions_insert" on bank_transactions for insert
  with check (can_board_write(organization_id));

create policy "bank_transactions_update" on bank_transactions for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "bank_imports_insert" on bank_imports for insert
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- expenses / expense_categories
-- ────────────────────────────────────────────────────────────────
create policy "expenses_insert" on expenses for insert
  with check (can_board_write(organization_id));

create policy "expenses_update" on expenses for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "expenses_delete" on expenses for delete
  using (can_board_write(organization_id));

create policy "expense_categories_insert" on expense_categories for insert
  with check (can_board_write(organization_id));

create policy "expense_categories_update" on expense_categories for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "expense_categories_delete" on expense_categories for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- fiscal_years
-- ────────────────────────────────────────────────────────────────
create policy "fiscal_years_insert" on fiscal_years for insert
  with check (can_board_write(organization_id));

create policy "fiscal_years_update" on fiscal_years for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- budgets
-- ────────────────────────────────────────────────────────────────
create policy "budgets_insert" on budgets for insert
  with check (can_board_write(organization_id));

create policy "budgets_update" on budgets for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- annual_checklists / tasks
-- ────────────────────────────────────────────────────────────────
create policy "annual_checklists_insert" on annual_checklists for insert
  with check (can_board_write(organization_id));

create policy "annual_checklists_update" on annual_checklists for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "annual_checklists_delete" on annual_checklists for delete
  using (can_board_write(organization_id));

create policy "tasks_insert" on tasks for insert
  with check (can_board_write(organization_id));

create policy "tasks_update" on tasks for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "tasks_delete" on tasks for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- comments (全メンバーが投稿可)
-- ────────────────────────────────────────────────────────────────
create policy "comments_insert" on comments for insert
  with check (organization_id in (select my_organization_ids()));

create policy "comments_delete" on comments for delete
  using (
    organization_id in (select my_organization_ids())
    and (author_id = auth.uid() or can_board_write(organization_id))
  );

-- ────────────────────────────────────────────────────────────────
-- household_profiles (理事以上は全室挿入、住民は自室更新のみ)
-- ────────────────────────────────────────────────────────────────
create policy "household_profiles_insert_board" on household_profiles for insert
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- organization_members (admin のみ招待・更新)
-- ────────────────────────────────────────────────────────────────
create policy "organization_members_insert" on organization_members for insert
  with check (
    exists (
      select 1 from organization_members om2
      where om2.user_id = auth.uid()
        and om2.organization_id = organization_members.organization_id
        and om2.is_active = true
        and om2.role = 'admin'
    )
  );

create policy "organization_members_update" on organization_members for update
  using (
    exists (
      select 1 from organization_members om2
      where om2.user_id = auth.uid()
        and om2.organization_id = organization_members.organization_id
        and om2.is_active = true
        and om2.role = 'admin'
    )
  );
