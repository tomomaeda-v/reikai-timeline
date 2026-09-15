// Firebase の設定（Firebase コンソール → プロジェクトの設定 → マイアプリ の値。公開されても問題ありません）
export const firebaseConfig = {
  apiKey: "AIzaSyARz2BldKh8iZfzIUaB60PwucrLzFMT9_A",
  authDomain: "reikai-timeline.firebaseapp.com",
  projectId: "reikai-timeline",
  storageBucket: "reikai-timeline.firebasestorage.app",
  messagingSenderId: "980251885165",
  appId: "1:980251885165:web:b9caa7c18ec048dbcc8964"
};
// 共通ログインに使うアカウント（Firebase Authentication に登録済み）。パスワードが理事に配る共通パスワードです。
export const SHARED_LOGIN_EMAIL = "rijikai@reikai-timeline.app";

// AI連携（任意）。企画アイデア・コメントを Claude が整理して T−45〜T−14 の入力欄に下書きを反映する機能の中継URL。
// gas/Code.gs を Google Apps Script にデプロイした「ウェブアプリのURL」を設定します。空のままなら AI 機能は表示されません。
export const AI_ENDPOINT = "";
