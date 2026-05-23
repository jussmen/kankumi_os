# ADR 0002: PaymentProfile に有効期間を持たせ過去データを保持する

## Status
Accepted

## Context
住民が口座変更・名義変更した場合、新しい PaymentProfile に差し替えると、過去にインポート済みの BankTransaction との照合結果が破綻する。たとえば2月に口座情報を変更した場合、1月分のCSVデータは旧名義で記録されており、新しいプロフィールではマッチングできない。

## Decision
PaymentProfile に `effective_from`（開始日）と `effective_to`（終了日、null = 現在有効）を持たせる。プロフィール更新時は既存レコードを削除・上書きせず、`effective_to` に変更日を設定して新レコードを追加する。マッチング時は BankTransaction の取引日に有効な PaymentProfile を参照する。

## Consequences
- **メリット**: 過去CSVのマッチング結果が変更によって破綻しない。変更履歴が追跡可能。
- **デメリット**: クエリが複雑になる（有効期間を考慮した JOIN が必要）。
- **必要なUI対応**: 管理画面で変更履歴を参照できるビューを用意する。
