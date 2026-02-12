# Labola Alarm 実装計画メモ

更新日: 2026-02-12

## 目的
- `alarm` から Labola(代々木) 予約を安全に実行する。
- 失敗分類を明確化し、`5xx/通信障害` は Durable Object alarm で再試行する。
- 実装は小さく分割し、`t-wada流 + 古典学派TDD` で1ケースずつ進める。

## スコープ
- `params` の zod バリデーション。
- `facilityId=1` のみ処理対象。
- ログイン処理。
- 予約URLへ遷移。
- `customer-info` フォーム送信。
- `customer-confirm` フォーム送信。
- 再試行制御（alarm跨ぎ）。

## 非スコープ
- 施設追加対応（facilityId=1以外）。
- 通知連携、UI変更。

## 主要仕様
- コート番号変換（UI -> サイト）
  - `1 -> 479`
  - `2 -> 510`
  - `3 -> 511`
  - `4 -> 535`

- 予約URL形式
  - `https://labola.jp/r/booking/rental/shop/3094/facility/{siteCourtCode}/{yyyymmdd}-{start}-{end}/customer-type/`
  - 例: `.../facility/511/20260213-1500-1600/customer-type/`

- `customer-info` 方針
  - 既定値は保持。
  - 必須で空欄のみ環境変数で補完。
  - 補完用キー:
    - `LABOLA_YOYOGI_NAME`
    - `LABOLA_YOYOGI_NAME_KANA`
    - `LABOLA_YOYOGI_DISPLAY_NAME`
    - `LABOLA_YOYOGI_EMAIL`
    - `LABOLA_YOYOGI_ADDRESS`
    - `LABOLA_YOYOGI_MOBILE_NUMBER`

- `customer-confirm` 方針
  - 利用規約/個人情報同意をチェック。
  - `submit_ok` で申込み実行。

## エラー分類と再試行
- 再試行対象:
  - HTTP `5xx`
  - 通信エラー（fetch例外）
- 再試行しない:
  - 認証失敗（ID/PASS不一致）
  - `4xx`

- 同一alarm内の上限:
  - 壁時計 `12分` まで
  - または `8回` まで
- 上限到達時:
  - `15秒後` に次alarmを設定して継続。

## Durable Object 前提
- alarm handler の最大継続時間は `15分`（Cloudflare公式制約）。
- `wrangler.toml` で `limits.cpu_ms` は未設定（既定値前提）。

## TDD進行ルール
- 1ケースずつ:
  - Red
  - Green
  - Refactor
  - Commit
- 各段階でユーザー確認を挟む。
- ログ/メッセージは日本語統一。

## 次に実施するケース（優先順）
1. 予約URL生成のユニットテストと実装。
2. `customer-info` のフォーム抽出（既定値保持）。
3. 必須空欄の環境変数補完。
4. `customer-info -> customer-confirm` POST接続。
5. `5xx/通信障害` の retry state と `setAlarm` 制御。
