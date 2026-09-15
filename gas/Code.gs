/**
 * 例会運営タイムライン — AI中継（Google Apps Script ウェブアプリ）
 *
 * ブラウザから直接 Claude API を呼ぶと API キーが公開されてしまうため、
 * この GAS がキーを預かり、T−60 の「企画アイデア」「連絡・コメント」を Claude に整理させて
 * T−45 / T−30 / T−14 の入力欄の下書きを JSON で返します。
 *
 * セットアップ（README「AI連携」参照）
 *  1. script.google.com で新規プロジェクトを作り、このファイルの内容を Code.gs に貼り付ける
 *  2. プロジェクトの設定 → スクリプト プロパティ に以下を追加
 *       ANTHROPIC_API_KEY : Claude の API キー（console.anthropic.com）
 *       FIREBASE_API_KEY  : firebase-config.js の apiKey（ログイン確認に使用）
 *       MODEL             : 任意。省略時 claude-opus-5
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *       実行するユーザー：自分 ／ アクセスできるユーザー：全員
 *  4. 表示された「ウェブアプリのURL」を firebase-config.js の AI_ENDPOINT に設定
 */

var PROPS = PropertiesService.getScriptProperties();
var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
var DEFAULT_MODEL = "claude-opus-5";

function doGet() {
  return out_({ ok: true, service: "reikai-timeline-ai", ready: !!PROPS.getProperty("ANTHROPIC_API_KEY") });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    verifyLogin_(body.idToken);
    var res = analyze_(body);
    return out_({ ok: true, model: res.model, result: res.result });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Firebase Authentication の ID トークンを検証（共通アカウントでログイン済みか） */
function verifyLogin_(idToken) {
  var key = PROPS.getProperty("FIREBASE_API_KEY");
  if (!key) throw new Error("FIREBASE_API_KEY が設定されていません");
  if (!idToken) throw new Error("ログイン情報がありません。再ログインしてください");
  var r = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(key), {
    method: "post", contentType: "application/json", payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error("ログインの確認に失敗しました（" + r.getResponseCode() + "）");
  var users = (JSON.parse(r.getContentText()).users) || [];
  if (!users.length) throw new Error("ログインが無効です。再ログインしてください");
}

/** 出力スキーマ（T−45 / T−30 / T−14 の入力欄と同じキー） */
function schema_() {
  var s = function (desc) { return { type: "string", description: desc }; };
  var obj = function (props) {
    return { type: "object", additionalProperties: false, required: Object.keys(props), properties: props };
  };
  return obj({
    summary: s("全体の要約。1〜2文。理事向けの短い日本語"),
    t45: obj({
      theme: s("決定テーマ（案）。賛同数が多い案を優先。複数候補なら「／」区切り。無ければ空文字"),
      outline: s("構成・主要論点の下書き。箇条書き可（改行区切り）"),
      speakerCand: s("登壇候補（外部ゲスト可）。名前・所属・提案者を整理"),
      socialPlan: s("交流・懇親会企画（リアル参加の価値）。リアル参加の仕掛けも含める"),
      decidedHow: { type: "string", enum: ["", "理事間で合意", "理事長が最終決定"], description: "コメントで決定方法が明示されていれば設定。不明なら空文字" },
      note: s("この工程への申し送り・判断材料。1〜3文")
    }),
    t30: obj({
      speakers: s("登壇者（確定候補）。確定と明言されていなければ「候補：」を付ける"),
      venueFixed: s("会場。コメントなどで言及があれば。不明なら空文字"),
      zoom: { type: "string", enum: ["", "あり（Zoom）", "なし"], description: "オンライン併用の希望が読み取れれば設定" },
      announceStart: s("告知開始日 YYYY-MM-DD。明示がなければ空文字"),
      channels: s("告知媒体（メール・会員紹介・SNS等）。集客方法のアイデアから整理"),
      targetExt: s("外部参加 目標人数（数字のみ）。言及がなければ空文字"),
      noticeText: s("告知文・リード文の下書き。150〜300字。テーマと参加価値を伝える"),
      note: s("この工程への申し送り。1〜3文")
    }),
    t14: obj({
      midNote: s("レビュー所見・依頼事項の下書き。集客方法・リアル参加の仕掛けのアイデアを、理事への声かけ依頼として整理"),
      note: s("この工程への申し送り。1〜3文")
    })
  });
}

function analyze_(body) {
  var apiKey = PROPS.getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません");
  var model = PROPS.getProperty("MODEL") || DEFAULT_MODEL;
  var meeting = body.meeting || {}, ideas = body.ideas || [], comments = body.comments || [], current = body.current || {};
  if (!ideas.length && !comments.length) throw new Error("整理する投稿がありません");

  var system = [
    "あなたはNPO法人の例会（会員向けセミナー＋交流会）を運営する事務局アシスタントです。",
    "理事が T−60 日に投稿した「企画アイデア」と「連絡・コメント」を読み、後続工程（T−45 テーマ・企画決定／T−30 登壇者・告知／T−14 集客中間レビュー）の入力欄の下書きを作ります。",
    "方針：",
    "- 投稿に書かれていない事実を創作しない。推測は「（案）」「候補：」と明示する。",
    "- 賛同（likes）が多いアイデアやコメントで支持されている案を優先し、対立する案は併記する。",
    "- 「現在の入力値」に既に決定内容が入っている場合はそれを尊重し、矛盾する下書きは出さない。",
    "- 該当する投稿が無い欄は空文字にする。無理に埋めない。",
    "- 文体は理事向けの簡潔な日本語（です・ます調）。告知文は読み手（会員・外部参加者）向けに書く。",
    "- 例会は外部参加 有料2,000円・会員無料。外部参加の標準目標は5〜10名。"
  ].join("\n");

  var lines = [];
  lines.push("# 例会");
  lines.push("名称：" + (meeting.title || "") + "　開催日：" + (meeting.date || "") + "　会場：" + (meeting.venue || "未定"));
  lines.push("");
  lines.push("# 企画アイデア（" + ideas.length + "件）");
  ideas.forEach(function (i) {
    lines.push("- [" + (i.category || "その他") + "] " + String(i.text || "").replace(/\s+/g, " ") + "（提案：" + (i.author || "") + "／賛同" + (i.likes || 0) + "）");
  });
  lines.push("");
  lines.push("# 連絡・コメント（T−60、" + comments.length + "件、古い順）");
  comments.forEach(function (c) {
    lines.push("- " + (c.author || "") + "：" + String(c.text || "").replace(/\s+/g, " "));
  });
  lines.push("");
  lines.push("# 現在の入力値（決定済みの内容があれば尊重）");
  Object.keys(current).forEach(function (k) { if (current[k] !== "" && current[k] != null) lines.push("- " + k + "：" + current[k]); });

  var payload = {
    model: model,
    max_tokens: 8000,
    system: system,
    messages: [{ role: "user", content: lines.join("\n") }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: schema_() } }
  };
  var r = UrlFetchApp.fetch(ANTHROPIC_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = r.getResponseCode(), text = r.getContentText();
  if (code !== 200) {
    var msg = text; try { msg = JSON.parse(text).error.message; } catch (_) {}
    throw new Error("Claude API エラー（" + code + "）：" + msg);
  }
  var res = JSON.parse(text);
  if (res.stop_reason === "refusal") throw new Error("AIが応答を拒否しました");
  if (res.stop_reason === "max_tokens") throw new Error("AIの出力が長すぎて途中で切れました");
  var textBlock = (res.content || []).filter(function (b) { return b.type === "text"; })[0];
  if (!textBlock) throw new Error("AIの応答にテキストがありません");
  return { model: res.model || model, result: JSON.parse(textBlock.text) };
}

/** エディタから実行して動作確認するためのテスト（ログイン検証は通しません） */
function test_analyze() {
  var res = analyze_({
    meeting: { title: "11月例会", date: "2026-11-19", venue: "品川 会議室 ＋ Zoom" },
    ideas: [
      { category: "テーマ", text: "2027年4月からの支援体制強化の改正の、政府提言及び疑問点の確認（ディスカッション）", author: "川崎", likes: 2 },
      { category: "登壇候補", text: "出入国在留管理庁 OB の○○氏（登録支援機関向け講演の実績あり）", author: "前田 智之", likes: 1 },
      { category: "集客方法", text: "登録支援機関・監理団体へ理事から個別メール。会員紹介で外部2名ずつ", author: "石橋", likes: 0 }
    ],
    comments: [{ author: "前田 智之", text: "テーマは川崎案で進めたいと思います。登壇者は10月上旬までに打診します。", at: "" }],
    current: {}
  });
  Logger.log(JSON.stringify(res, null, 2));
}
