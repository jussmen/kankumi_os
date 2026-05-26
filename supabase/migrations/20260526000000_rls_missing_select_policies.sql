-- unit_owners の SELECT ポリシーが未定義だったため追加する。
-- unit_charges / charge_types は DB 上では既にポリシーが存在していた。
--
-- 理事以上: 組合内全件
-- 住民: 自分自身のレコードのみ

create policy "unit_owners_select_board" on unit_owners for select
  using (is_board_or_above(organization_id));

create policy "unit_owners_select_resident" on unit_owners for select
  using (user_id = auth.uid());
