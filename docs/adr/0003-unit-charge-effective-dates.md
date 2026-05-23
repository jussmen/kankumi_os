# ADR 0003: UnitCharge に有効期間を持たせ年度内の金額変動に対応する

## Status
Accepted

## Context
駐車場使用料・管理費などの固定費は、年度途中に改定されることがある（総会決議による値上げ、施設利用の開始・終了など）。ExpectedAmount を Unit の固定フィールドとして持つと、金額改定のたびに過去月の照合ロジックが破綻する。また駐車場の解約など「ある月から特定の ChargeType が不要になる」ケースも存在する。

## Decision
UnitCharge に `effective_from`（開始日）と `effective_to`（終了日、null = 現在有効）を持たせる。特定月の ExpectedAmount は「その月の初日に有効な UnitCharge の合計」としてクエリ時に動的計算する。金額改定時は既存レコードの `effective_to` を設定し、新レコードを追加する（上書きしない）。

## Consequences
- **メリット**: 過去月の ExpectedAmount が金額改定に影響されない。施設利用の開始・終了を正確に追跡できる。
- **デメリット**: ExpectedAmount が動的計算になるため、クエリに effective_from/effective_to の条件が必要。
- **境界**: IrregularFee（一時的な施設使用料）は UnitCharge ではなく Expense として記録し、月次入金照合の対象外とする。
