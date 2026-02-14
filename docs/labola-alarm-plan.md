# Labola Alarm 実装計画メモ

更新日: 2026-02-13

## 目的

- `alarm` から Labola(代々木) 予約を安全に実行する。
- 失敗分類を明確化し、`5xx/通信障害` は Durable Object alarm で再試行する。
- 実装は小さく分割し、`t-wada流 + 古典学派TDD` で1ケースずつ進める。

## スコープ

- [x] `params` の zod バリデーション。
- [x] `facilityId=1` のみ処理対象。
- [x] ログイン処理。
- [x] 予約URLへ遷移。
- [x] `customer-info` フォーム送信（最小接続）。
- [x] `customer-confirm` フォーム送信（最小接続）。
- [x] 再試行制御（alarm跨ぎ）。

## 非スコープ

- [ ] 施設追加対応（facilityId=1以外）。
- [ ] 通知連携、UI変更。

## 主要仕様

- [x] コート番号変換（UI -> サイト）
  - `1 -> 479`
  - `2 -> 510`
  - `3 -> 511`
  - `4 -> 535`

- [x] 予約URL形式
  - `https://labola.jp/r/booking/rental/shop/3094/facility/{siteCourtCode}/{yyyymmdd}-{start}-{end}/customer-type/`
  - 例: `.../facility/511/20260213-1500-1600/customer-type/`

- `customer-info` 方針
  - [x] 既定値抽出関数を実装。
  - [x] 実送信時に抽出結果を完全適用（hidden/select含む）。
  - [x] 必須で空欄のみ環境変数で補完する関数を実装。
  - 補完用キー:
    - `LABOLA_YOYOGI_NAME`
    - `LABOLA_YOYOGI_NAME_KANA`
    - `LABOLA_YOYOGI_DISPLAY_NAME`
    - `LABOLA_YOYOGI_EMAIL`
    - `LABOLA_YOYOGI_ADDRESS`
    - `LABOLA_YOYOGI_MOBILE_NUMBER`

- `customer-confirm` 方針
  - [x] 利用規約/個人情報同意を抽出ベースで厳密反映。
  - [x] `submit_ok` で申込み実行（最小接続）。

## エラー分類と再試行

- [x] 再試行対象:
  - HTTP `5xx`
  - 通信エラー（fetch例外）
  - `customer-info/customer-confirm` 送信失敗メッセージ（`5xx` / 通信エラー）
- [x] 再試行しない:
  - 認証失敗（ID/PASS不一致）
  - `4xx`
  - `customer-info/customer-confirm` 送信失敗メッセージ（`4xx`）

- [x] 同一alarm内の上限:
  - 壁時計 `12分` まで
  - または `8回` まで
- [x] 上限到達時:
  - `15秒後` に次alarmを設定して継続。
- [x] 成功時 `retry_state` を削除。

## Durable Object 前提

- alarm handler の最大継続時間は `15分`（Cloudflare公式制約）。
- `wrangler.toml` で `limits.cpu_ms` は未設定（既定値前提）。

## TDD進行ルール

- [x] 1ケースずつ:
  - Red
  - Green
  - Refactor
  - Commit
- [x] 各段階でユーザー確認を挟む。
- [x] ログ/メッセージは日本語統一。

## 実装状況まとめ

- 完了:
  - 予約URL生成・遷移
  - 予約URL GET の失敗検知（非2xxで例外）
  - ログインCookieの予約URL GET への引き継ぎ
  - `customer-info -> customer-confirm` の最小POST接続
  - `customer-info/customer-confirm` 送信時のCookie必須化
  - `customer-info/customer-confirm` 送信時の通信エラーを日本語メッセージで例外化
  - `customer-info` 応答HTMLから `customer-confirm` 送信用の hidden/同意値を抽出して送信
  - `customer-confirm` 応答ステータスの失敗検知（非2xxで例外）
  - `customer-info` 応答ステータスの失敗検知（非2xxで例外）
  - Durable Object alarm の retry state 管理（作成/増分/成功時削除）
  - 予算超過時の `setAlarm(+15秒)` 引き継ぎ
- 未完了:
  - なし（非スコープ項目を除く）
