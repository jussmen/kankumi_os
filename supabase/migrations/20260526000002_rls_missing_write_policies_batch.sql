-- ────────────────────────────────────────────────────────────────
-- topics: 理事以上が作成・編集・削除
-- ────────────────────────────────────────────────────────────────
create policy "topics_insert" on topics for insert
  with check (can_board_write(organization_id));

create policy "topics_update" on topics for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "topics_delete" on topics for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- bank_csv_mappers: 組合メンバーが閲覧、理事以上が書き込み
-- ────────────────────────────────────────────────────────────────
create policy "bank_csv_mappers_select" on bank_csv_mappers for select
  using (organization_id in (select my_organization_ids()));

create policy "bank_csv_mappers_insert" on bank_csv_mappers for insert
  with check (can_board_write(organization_id));

create policy "bank_csv_mappers_update" on bank_csv_mappers for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- charge_types: DELETE ポリシーを追加
-- ────────────────────────────────────────────────────────────────
create policy "charge_types_delete" on charge_types for delete
  using (can_board_write(organization_id));

-- ────────────────────────────────────────────────────────────────
-- organizations: admin が更新
-- ────────────────────────────────────────────────────────────────
create policy "organizations_update" on organizations for update
  using (
    exists (
      select 1 from organization_members
      where user_id = auth.uid()
        and organization_id = organizations.id
        and is_active = true
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from organization_members
      where user_id = auth.uid()
        and organization_id = organizations.id
        and is_active = true
        and role = 'admin'
    )
  );
