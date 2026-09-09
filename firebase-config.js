// Firebase の設定。Firebase コンソール → プロジェクトの設定 → 「マイアプリ」→ ウェブアプリ の
// 「SDK の設定と構成」に表示される firebaseConfig をそのまま貼り付けてください。
// ※ この値は公開されても問題ありません（アクセス制御は Firestore のセキュリティルールと Authentication で行います）。
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// 共通ログインに使うアカウントのメールアドレス。
// Firebase Authentication で「メール/パスワード」を有効にし、このアドレスでユーザーを1つ作成します。
// そのユーザーのパスワードが、理事の皆さんに配る「共通パスワード」になります。
export const SHARED_LOGIN_EMAIL = "board@example.com";
