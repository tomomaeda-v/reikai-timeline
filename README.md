# 例会運営タイムライン

NPO法人 外国人在留支援コンソーシアムの例会を、標準タイムライン（T−60日 〜 T＋7日）に沿って運営するための理事向けWebアプリです。
理事がブラウザからアクセスし、企画アイデアの投稿、各工程の記録・完了チェック、集客の声かけ、出欠、KPIの入力・確認ができます。

- フロントエンド：`index.html` 1ファイル（HTML/CSS/JS）。GitHub Pages で公開します
- データ保存：Firebase（Cloud Firestore）。理事全員でリアルタイムに共有されます
- ログイン：共通パスワード（Firebase Authentication の共有アカウント）＋ 名前の選択

## 標準タイムライン（アプリに組み込み済み）

| 時期 | 実施事項 | 担当 |
|---|---|---|
| T−60日 | 企画アイデア募集開始（テーマ・登壇候補・集客方法・交流企画） | 理事長→全理事 |
| T−45日 | テーマ・企画を決定（まとまらなければ理事長が最終決定） | 全理事 |
| T−30日 | 登壇者確定・会場確定・告知開始 | 運営委／広報・会員拡大委 |
| T−14日 | 集客中間レビュー（未達なら理事が個別に声かけ） | 広報・会員拡大委→全理事 |
| 当日 | 受付・設営／外部参加者対応・名刺回収 | 各委員会 |
| T＋1日 | 「例会3分まとめ」配信 | 運営委 |
| T＋3日 | 参加者フォロー・アンケート・次回案内 | 広報・会員拡大委 |
| T＋7日 | 振り返り・KPI3指標の記録 | 各委員長 |

工程の内容や入力欄を変えたいときは `index.html` 内の `STEPS` 配列を編集してください。

## 理念づくり（意見集約）ページ

画面上部の「理念づくり」で切り替わる、例会とは独立したページです。新しい理念を決める会議の参考資料として、理事の意見を設問ごとに集めます。

- 設問ごとに意見を投稿・👍で共感・自分の投稿の削除ができます。「キーワード」型の設問は同じ言葉を集計して表示します。
- 「設定」で見出し・趣旨・締切・設問を変更できます（設問は1行1問、「設問｜補足」、行頭「#」でキーワード型）。
- 「テキストをコピー」「印刷・PDF保存」で、設問ごとに賛同の多い順に並べた会議用の資料を出力できます。

## 初回セットアップ（約20分）

### 1. Firebase プロジェクトを作る

1. https://console.firebase.google.com にGoogleアカウントでログインし、「プロジェクトを追加」（名前は任意、Google アナリティクスは不要）
2. 左メニュー **構築 → Firestore Database → データベースの作成**。ロケーションは `asia-northeast1`（東京）、**本番環境モード**で開始
3. Firestore の **ルール** タブを開き、このリポジトリの `firestore.rules` の内容を貼り付けて「公開」
4. 左メニュー **構築 → Authentication → 始める → ログイン方法 → メール/パスワード** を有効化
5. Authentication の **Users → ユーザーを追加**。メールアドレス（例 `board@example.com`、実在しなくて可）と、理事に配る共通パスワードを設定
6. 左上の歯車 **プロジェクトの設定 → マイアプリ → ウェブ（`</>`）** でアプリを登録（Hosting は不要）。表示される `firebaseConfig` をコピー

### 2. 設定ファイルを書き換える

`firebase-config.js` を開き、

- `firebaseConfig` を手順6でコピーした内容に置き換え
- `SHARED_LOGIN_EMAIL` を手順5で作ったメールアドレスに変更

してコミットします。この設定値は公開されて問題ありません（アクセス制御はルールと認証で行います）。

### 3. GitHub Pages で公開する

1. リポジトリの **Settings → Pages → Build and deployment → Source** を「Deploy from a branch」、Branch を `main` / `/ (root)` にして Save
2. 1〜2分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で開けます
3. Firebase コンソール **Authentication → Settings → 承認済みドメイン** に `<ユーザー名>.github.io` を追加（未追加だとログインが拒否されます）

### 4. 理事への案内

公開URLと共通パスワードを理事に共有します。初回アクセス時に「あなた」で自分の名前を選ぶと、以後そのブラウザでは自動で選択されます。
名簿の追加・変更は画面右上の「名簿」ボタンから行えます（初回はアプリ内の既定名簿が自動登録されます）。

## AI連携（任意）：アイデア・コメントを T−45〜T−14 の下書きに自動反映

T−60 の「企画アイデア」「連絡・コメント」を Claude が読み、T−45（テーマ・企画）／T−30（登壇者・告知）／T−14（集客レビュー）の入力欄を自動で埋めて保存します。
AIが入れた欄にはラベルに「AI」の印が付きます。人が書いた文章はそのまま残り、その後ろに「［AI］」として追記されます（1行の欄は「 ／ AI：」区切り）。再生成するとAIの部分だけが差し替わります。
選択肢・数値・日付の欄は文章を結合できないため、空欄か前回AIが入れたままのときだけAIが書き換え、人が選んだ値は変えません。
アイデアやコメントを投稿・削除すると数秒後に自動で再生成されます。「今すぐ更新」「再生成」で手動更新もできます。

API キーをブラウザに置かないため、Google Apps Script（GAS）を中継サーバーにします。設定しない場合、AI関連の表示は出ません。

1. https://console.anthropic.com で API キーを作成
2. https://script.google.com で新しいプロジェクトを作り、`gas/Code.gs` の内容を貼り付けて保存
3. **プロジェクトの設定 → スクリプト プロパティ** に追加
   - `ANTHROPIC_API_KEY`：手順1のキー
   - `FIREBASE_API_KEY`：`firebase-config.js` の `apiKey`（アプリにログイン済みの人だけが呼べるようにする検証に使います）
   - `MODEL`（任意）：既定は `claude-opus-5`
4. エディタで `test_analyze` を実行し、ログに JSON が出ることを確認（初回は権限の承認が求められます）
5. **デプロイ → 新しいデプロイ → ウェブアプリ**。「実行するユーザー：自分」「アクセスできるユーザー：全員」でデプロイ
6. 表示された **ウェブアプリのURL** を `firebase-config.js` の `AI_ENDPOINT` に設定してコミット

`Code.gs` を修正したときは「デプロイを管理 → 編集 → 新バージョン」で再デプロイしないと反映されません。

## 共同作業者を追加する（コードの修正）

リポジトリの **Settings → Collaborators → Add people** でGitHubアカウントを招待します。
`index.html` を編集して `main` に push（またはPull Requestをマージ）すると、GitHub Pages が自動で更新されます。
Firebase 側の管理者を増やす場合は Firebase コンソールの **プロジェクトの設定 → ユーザーと権限** から追加します。

## ローカルで確認する

ES Modules を使っているため、ファイルを直接開く（`file://`）のではなく簡易サーバーで開きます。

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

`localhost` は Firebase の承認済みドメインに最初から含まれています。

## データ構造（Firestore）

```
config/members                 { list: [{id, name, role}] }
meetings/{id}                  { title, date, venue, steps:{t60:{done,by,at},...}, fields:{...},
                                 ai:{at, by, hash, counts, summary, steps:{t45:{...}, t30:{...}, t14:{...}}, filled:{fieldKey: value}} }  ← AI連携を使う場合。filled はAIが入れた値（再生成時にAI部分だけ差し替えるための記録）
meetings/{id}/ideas/{id}       { author, authorId, category, text, createdAt, likes:{memberId:true} }
meetings/{id}/comments/{id}    { step, author, authorId, text, createdAt }
meetings/{id}/outreach/{memberId}   { name, planned, result, note }
meetings/{id}/attendance/{memberId} { name, status, social, guest }
rinen/main                     { title, intro, deadline, questions:[{id,label,hint,type?}] }   ← 理念づくりの設定
rinen/main/posts/{id}          { q, text, author, authorId, createdAt, likes:{memberId:true} } ← 理念づくりの意見
```

## ライセンス

内部利用向け。
