create table if not exists reserves
(
    id                 integer primary key autoincrement,
    params             text not null, -- ユーザが入力した情報をもつ json
    execute_at         text not null, -- 予約実行日時
    status             text not null, -- 予約の実行状況
    alarm_namespace    TEXT not null, -- DurableObjectの名前空間
    alarm_object_id    TEXT not null, -- DurableObjectのID
    alarm_scheduled_at TEXT not null, -- DurableObjectアラームの設定日時
    created_at         text not null default (datetime('now'))
);