# 機能仕様・ロードマップ

## プロダクトビジョン

「管理組合の運営OS」——理事会の意思決定ログ・財務データ・住民管理・年間業務が一体化した、組合名義で使えるSaaS。管理会社への依存度を段階的に下げ、出納自主化を支援する。

## ターゲット

- **規模**: 20〜100戸
- **属性**: 現在管理委託中だが、管理会社への依存度と費用を下げたい組合
- **主ユーザー**: 会計担当理事（treasurer）＋複数理事（board_member）
- **価格**: 200円/戸/月、最低4,000円/月、年払い・銀行振込

---

## MVP（6ヶ月）機能一覧

### Phase 0 — 基盤（Month 1）

| 機能 | 概要 |
|------|------|
| マルチテナント設計 | Supabase RLS で Organization ごとに完全データ分離 |
| 認証・ロール管理 | 6ロール：admin / vice_president / treasurer / board_member / auditor / resident |
| オンボーディングウィザード | 組合基本情報・Unit台帳CSVインポート・ChargeType設定・メンバー招待・BankCSVMapper設定を順を追って完了 |
| Unit台帳 | 部屋番号・専有面積・OccupancyStatus（occupied / vacant / excluded） |

### Phase 1 — コラボレーション（Month 2〜3）

| 機能 | 概要 |
|------|------|
| Topic（議題） | 議題DB＋本文（Markdown）＋タグ＋ステータス＋visibility制御（board_only / all_members） |
| Comment | Topic へのスレッドコメント。引き継ぎ資産として蓄積される |
| Task | Topic から生まれるアクションアイテム。担当者・期日・完了管理 |
| OperationsCalendar | 定期業務・イベントのカレンダー管理 |
| AnnualChecklist | 年間業務チェックリスト。標準 ComplianceTask テンプレート＋カスタム追加 |
| Announcement | 住民または理事会向けお知らせ。visibility 制御 |
| メール通知 | Resend 経由。滞納検知・タスク期限・お知らせ配信。アプリ内通知も併用 |

### Phase 2 — 入金管理（Month 3〜4）

| 機能 | 概要 |
|------|------|
| PaymentProfile | 住民自己登録（振込名義・銀行名・口座下4桁）＋管理者上書き。有効期間付き |
| UnitCharge設定 | ChargeType×金額×有効期間。ExpectedAmountを動的計算 |
| 入金ダッシュボード | Data Readiness × 月次PaymentStatusのマトリクス。Color coding（Green/Red/Grey） |
| BankCSVインポート | 汎用CSVマッパー＋りそな銀行プリセット（順次追加）。Shift-JIS対応 |
| 自動マッチング | PaymentProfileをもとにBankTransactionとPaymentRecordを照合。未照合は手動確認キュー |
| 支出管理 | 支出入力・ExpenseCategory科目分類（テンプレート＋カスタム）。領収書ファイル添付 |
| AnnualAccumulation | 年間累計照合。月次irregularでも年度累計一致でGreen判定 |

### Phase 3 — 会計報告（Month 5〜6）

| 機能 | 概要 |
|------|------|
| 収支報告書（PDF） | 月次版（理事会用）・年次版（総会用）。管理費会計・修繕積立金会計を分離 |
| 貸借対照表（PDF） | 期末資産・負債。銀行残高・未収金を含む |
| 次年度予算案（PDF） | 科目別予算額。FinancialReportの予算対比欄に使用 |
| 監査報告書 | auditorロールが全財務データを読み取り専用で確認。AuditReportのPDFアップロード |
| データエクスポート | 住民台帳・収支データ・入金記録をCSV形式でダウンロード |

---

## Phase 4 以降（Post-MVP）

| 機能 | 概要 | 優先度 |
|------|------|--------|
| LINE公式アカウント連携 | 住民への通知配信。招待フロー簡略化 | 高 |
| 領収書OCR | 写真→支出自動入力 | 中 |
| 追加銀行CSVプリセット | 三菱UFJ・三井住友・ゆうちょ等 | 中 |
| 銀行API連携 | CSV→メール解析→API連携の段階的進化 | 将来 |

---

## 住民オンボーディングフロー

1. 管理者が住民メールアドレスを登録 → 招待メール送信（Supabase Auth）
2. 住民が初回ログイン → 同意フロー（個人情報取扱）→ ResidentProfile 入力
3. PaymentProfile（振込名義・銀行名・口座下4桁）を住民が登録
4. 管理者側でDataReadiness確認 → 準備完了でマッチング対象に

管理者は住民の代わりにすべてのフローを代行入力可能。

---

## カスタマージャーニー（認知→有料）

```
SEO / SNS（マンション管理士系インフルエンサー）
  ↓
ランディングページ
  ├─ 自信ある組合 → 5室無料トライアル → 有料転換
  └─ 不安な組合  → 無料相談申込（メールで通知） → デモ → 有料
```

### フリートライアル（5室）で体験できること
1. **住民体験**: ResidentProfile登録・全員共有画面の閲覧
2. **会計支援体験**: CSVインポート（5行）・入金Dashboard・支出管理
3. **業務支援体験**: OperationsCalendar・AnnualChecklist

---

## 非機能要件・制約

| 項目 | 方針 |
|------|------|
| スタック | Next.js / Supabase / Vercel |
| 管理画面 | デスクトップ前提 |
| 住民向け画面 | モバイルファースト |
| 通知（MVP） | メール（Resend）＋アプリ内通知 |
| 通知（Phase 4） | LINE |
| 課金 | 年払い・銀行振込・手動処理。申込時に運営者へメール通知 |
| 個人情報 | リリース80%時点で弁護士監修のプライバシーポリシー・利用規約・委託契約雛形を整備。それまでPlaceholder |
| データエクスポート | いつでも可能（admin / vice_president） |
