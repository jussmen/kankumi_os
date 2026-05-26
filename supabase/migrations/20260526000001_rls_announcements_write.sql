-- announcements の write ポリシーが未定義だったため追加
create policy "announcements_insert" on announcements for insert
  with check (can_board_write(organization_id));

create policy "announcements_update" on announcements for update
  using (can_board_write(organization_id))
  with check (can_board_write(organization_id));

create policy "announcements_delete" on announcements for delete
  using (can_board_write(organization_id));
