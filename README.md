# Meat Recipe - お料理提案アプリ

冷蔵庫に余った食材（テキスト入力または写真）から、AIが作れる料理を提案するWebアプリ。
自炊の献立の悩みと、フードロスの削減を解決することが目的。将来的にCapacitor.jsでiOS/Androidアプリ化する予定（未着手）。

> このREADMEは2026-09-30時点の実装に合わせている。開発途中で方針が変わった箇所は「[当初の予定から変わったところ](#当初の予定から変わったところ)」にまとめた。

---

## 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS 4 | |
| バックエンド | FastAPI + Pydantic 2（Python） | |
| AI | Gemini API（`google-genai`） | レシピ提案・画像からの食材認識・料理画像の生成。Claude APIへの切り替え口もある（後述） |
| 認証 | Supabase Auth（Googleログイン） | ログインは任意。フロントは `@supabase/supabase-js` |
| DB | Supabase（PostgreSQL） | バックエンドはSQLAlchemy、お気に入りはフロントから supabase-js で直接アクセス（RLSで保護） |
| ファイル保存 | Supabase Storage | 生成した料理画像（公開バケット） |
| テスト | pytest（バックエンドのみ） | フロントの自動テストは無し |
| UIデザイン | Figma / `message.html`（原案） | |

---

## セットアップ

### 前提

- Node.js（フロント）
- **Python 3.11〜3.13**。3.14では `pydantic` や `psycopg2-binary` のビルド済みwheelが無く `pip install` が失敗する
- Supabaseプロジェクト（ログイン・DB・画像保存を使う場合。無くても起動と基本のレシピ提案は動く）
- Gemini APIキー（[Google AI Studio](https://aistudio.google.com/) で取得）。**サーバーの設定ファイルには書かず、アプリの設定画面で入力する**（各ユーザーが自分のキーを使い、キーはそのブラウザにだけ保存される）

### 1. バックエンド

```bash
cd backend
py -3.13 -m venv .venv          # Windows。venvはリポジトリ直下に作ってもよい
.venv/Scripts/activate
pip install -r requirements.txt
pip install pytest              # テストを動かす場合（requirements.txtには未記載）
cp .env.example .env            # 値を埋める
uvicorn main:app --reload
# → http://localhost:8000
```

`backend/.env` の項目:

| 変数 | 内容 |
|------|------|
| `SUPABASE_URL` | `https://<プロジェクトID>.supabase.co` |
| `SUPABASE_API` | Supabaseの **service_role キー**（ログイン検証・退会・Storage保存に使う）。**バックエンドの `.env` にだけ置き、フロントやgitには絶対に入れない** |
| `DATABASE_URL` | SupabaseのPostgreSQL接続文字列（画像生成の上限管理に使う） |
| `SUPABASE_IMAGE_BUCKET` | 画像の保存先バケット名（既定 `recipe-images`。公開バケットとして作成しておく） |
| `IMAGE_DAILY_LIMIT` | 1ユーザーが1日（日本時間）に生成できる画像枚数（既定10） |

`DATABASE_URL` などが未設定でも起動は継続する（DB無しでも動く設計）。ただしDB未接続の間は、画像生成は上限を管理できないため無効になる。

AIのAPIキー・プロバイダ・服用中の薬は、サーバー（`.env`・DB）には一切保存しない。設定画面で入力するとブラウザの localStorage にだけ保存され、AIを使うAPI（レシピ提案・食材認識・画像生成）を呼ぶたびに、ヘッダー `X-AI-API-Key` / `X-AI-Provider`（薬はリクエスト本文の `medicines`）で送る。サーバーは受け取ったキーをそのリクエストの間だけ使い、保存もログ出力もしない（`backend/services/ai_credentials.py`）。

### 2. フロントエンド

```bash
cd frontend
npm install
cp .env.example .env.local      # 値を埋める
npm run dev
# → http://localhost:3000
```

`frontend/.env.local` の項目（Supabaseの Project Settings → API から取得）:

| 変数 | 内容 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public キー（**service_role キーは入れない**） |

環境変数は起動時に読み込まれるため、変更したら `npm run dev` を再起動する。

フロントからのAPI呼び出しはすべて `/api/...` で行い、`next.config.ts` の rewrites でバックエンド（`http://127.0.0.1:8000`）へ中継している。中継先は環境変数 `BACKEND_URL`（未設定なら `http://127.0.0.1:8000`）で指定する。バックエンドのポートを変える場合は `frontend/.env.local` に `BACKEND_URL` を書く。

### 3. Supabase側の設定（ログイン・お気に入りを使う場合）

1. **Google Cloud Console**: OAuthクライアントID（ウェブ）を作成し、承認済みリダイレクトURIに `https://<プロジェクトID>.supabase.co/auth/v1/callback` を登録する
2. **Supabase → Authentication → Providers → Google** を有効にし、クライアントIDとシークレットを入力する
3. **Supabase → Authentication → URL Configuration** の Redirect URLs に `http://localhost:3000/auth/callback` を追加する
4. **SQL Editor** で `supabase/migrations/20260930000000_favorites.sql` を実行する（お気に入り用の `user_recipes` / `favorites` テーブルとRLSが作られる。何度実行しても安全）
5. **Storage** に公開バケット `recipe-images` を作成する（料理画像の保存先）

### 4. テスト・Lint

```bash
cd backend && python -m pytest -q     # DBには接続しない（tests/conftest.py で DATABASE_URL を空にする）
cd frontend && npm run lint
```

---

## デプロイ（公開）

フロントを Vercel、バックエンドを Render に置く構成を想定している（**まだ実施していない。手順の目安**）。Vercel は Next.js、Render は常時動くPythonサーバーが得意なため、役割を分ける。

### 1. バックエンド（Render）

1. Render で New → Web Service を選び、このリポジトリを連携する
2. 設定: Root Directory `backend` / Build Command `pip install -r requirements.txt` / Start Command `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. 環境変数 `PYTHON_VERSION` に 3.13 系を指定する（3.14はビルドに失敗する）
4. 環境変数に `SUPABASE_URL` / `SUPABASE_API`（service_role キー）/ `DATABASE_URL` / `SUPABASE_IMAGE_BUCKET` / `IMAGE_DAILY_LIMIT` を設定する。Geminiのキーは不要（ユーザーが自分のキーを入力する）
5. `DATABASE_URL` は、Supabaseの **Session pooler** の接続文字列を使う（Renderの無料枠はIPv4のみで、Supabaseの直接接続はIPv6のため）
6. 発行された `https://xxxx.onrender.com` を控える

### 2. フロントエンド（Vercel）

1. Vercel で Add New → Project を選び、このリポジトリを連携する。Root Directory は `frontend`
2. 環境変数に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `BACKEND_URL`（手順1のRenderのURL）を設定する
3. Deploy して `https://xxxx.vercel.app` を控える

### 3. ログインの設定

- Supabase の Authentication → URL Configuration の Site URL と Redirect URLs に、`https://xxxx.vercel.app/auth/callback` を追加する
- Google Cloud の OAuth 同意画面を「公開」にする（テストユーザー以外もログインできるようにする）。Google側のリダイレクトURIはSupabaseのURLのままで変更不要

### 注意

- Renderの無料枠は、15分アクセスが無いと停止し、次のアクセスで起動に約1分かかる（有料プランで回避できる）
- Vercelの無料枠（Hobby）は非商用のみ。組織のリポジトリを連携できるかは事前に確認する
- 食材認識は最大5MB×3枚の画像を `/api` 経由で送る。VercelのURL経由でアップロードできるか（リクエストサイズの制限）は、デプロイ後に写真で確認する

---

## ディレクトリ構成

```
meat-recipe/
├── README.md
├── Claude.md                        ← Claude Code向けの案内（一部が古い。後述）
├── message.html                     ← デザイン原案（GitHub Pagesにはこのファイルだけが公開される）
├── docs/                            ← 設計メモ（recipe-retrieval-strategy.md は廃止済み方針の内容）
├── supabase/migrations/             ← Supabaseで手動実行するSQL（お気に入りテーブル）
│
├── frontend/                        ← Next.js + TypeScript
│   ├── next.config.ts               ← /api → バックエンドへのrewrites、LAN内端末からの開発アクセス許可
│   └── src/
│       ├── app/
│       │   ├── layout.tsx           ← 全体レイアウト（AuthProvider + TopBar + BottomNav）
│       │   ├── globals.css          ← CSS変数・カラーテーマ
│       │   ├── page.tsx             ← ホーム（食材のテキスト入力／写真撮影・選択→食材認識）
│       │   ├── confirm/             ← 食材確認（タグの編集）
│       │   ├── mode/                ← 提案モード＋お好み設定
│       │   ├── recipes/
│       │   │   ├── page.tsx         ← レシピ提案一覧
│       │   │   └── detail/          ← レシピ詳細（料理画像の生成・自分の写真の追加・お気に入り）
│       │   ├── favorites/           ← お気に入り一覧
│       │   ├── record/              ← 閲覧履歴（最大50件、端末内のみ）
│       │   ├── search/              ← 検索（未実装プレースホルダー）
│       │   ├── settings/            ← ログイン／APIキー／薬の管理／退会
│       │   ├── privacy/             ← プライバシーポリシー
│       │   └── auth/callback/       ← Googleログイン後の戻り先
│       ├── components/              ← AuthProvider, TopBar, BottomNav, RecipeCard, FavoriteCard
│       └── lib/
│           ├── supabase.ts          ← Supabaseクライアント
│           ├── favorites.ts         ← お気に入り（ログイン中=Supabase／未ログイン=localStorage）
│           ├── history.ts           ← 閲覧履歴（localStorage）
│           └── image.ts             ← 画像の縮小処理
│
└── backend/                         ← FastAPI + Python
    ├── main.py                      ← エントリーポイント（CORS・ルーター登録・起動時のテーブル作成）
    ├── config.py                    ← 環境変数の読み込み
    ├── db/                          ← client.py（DB接続。未設定ならNone）、models.py
    ├── routers/
    │   ├── recipes.py               ← レシピ提案
    │   ├── analyze_ingredients.py   ← 写真からの食材認識
    │   ├── recipe_image.py          ← 料理画像の生成・上限確認・プロンプト取得
    │   └── account.py               ← 退会
    ├── services/
    │   ├── prompt_builder.py        ← レシピ提案プロンプトの組み立て（モード・お好み・薬）
    │   ├── ai_client.py             ← Gemini/Claude呼び出しとレスポンスの検証
    │   ├── recipe_image_*.py        ← 料理画像のプロンプトと生成
    │   ├── image_ai_client.py / image_prompt_builder.py ← 食材認識用
    │   ├── image_storage.py         ← Supabase Storageへの保存・再利用
    │   ├── image_quota.py           ← 画像生成の1日上限（PostgreSQLのUPSERTで排他制御）
    │   └── auth.py                  ← SupabaseのトークンからユーザーIDを特定
    └── tests/                       ← pytest
```

### 画面遷移

グローバルな状態管理は使わず、URLクエリで画面間を受け渡す。

```
/ (食材入力) → /confirm?ingredients=... → /mode?ingredients=... → /recipes?ingredients=...&mode=...&taste=...
                                                                      → /recipes/detail（選んだ1件はsessionStorageで受け渡し）
```

ボトムナビ: ホーム / 検索 / お気に入り / 記録 / 設定

### APIエンドポイント

| メソッド | パス | 認証 | 用途 |
|----------|------|------|------|
| GET | `/` | - | ヘルスチェック |
| POST | `/api/suggest-recipes` | AIキー（ヘッダー） | 食材＋モード＋お好み＋薬からレシピ3〜5件を生成（薬の警告付き） |
| POST | `/api/analyze-ingredients` | AIキー（ヘッダー） | 写真（最大3枚・1枚5MB・JPEG/PNG/WebP）から食材を抽出 |
| POST | `/api/generate-recipe-image` | 要ログイン＋AIキー（ヘッダー） | 料理画像を1枚生成しStorageへ保存。同名レシピは保存済みを再利用。1日 `IMAGE_DAILY_LIMIT` 枚まで |
| GET | `/api/image-quota` | 要ログイン | 今日の画像生成の残り枚数 |
| POST | `/api/recipe-image-prompt` | なし | 画像を生成しない人向けに、Geminiアプリへ貼るプロンプトを返す |
| DELETE | `/api/account` | 要ログイン | 退会（Supabase Authのユーザー削除＋利用回数の削除） |

---

## 当初の予定から変わったところ

| 項目 | 当初の予定 | 現状 |
|------|-----------|------|
| レシピの取得方法 | 自作レシピDB（seed）＋食材マッチングのスコアリング＋足りない分だけAIが補完 | **廃止**。食材・モード・お好みからAIに毎回レシピを生成させる方式に一本化。`docs/recipe-retrieval-strategy.md` は古いまま |
| AI | 開発中はGemini、本番はClaude | 実際に動いているのはGeminiのみ（モデルは `gemini-3.5-flash-lite`）。`gemini-2.5-flash` は新規ユーザー向けに提供終了、`gemini-3.8-flash` は高負荷時に503が多く使わなかった。Claudeへの切り替えはコードにあるが、実APIでの動作確認はしていない |
| 画像認識 | 「写真を撮る」ボタンはプレースホルダー | 実装済み。複数枚を1回のGeminiリクエストにまとめ、別角度の同一食材は重複させない。枚数上限は当初5枚→**3枚**に変更 |
| ログイン | 想定なし | **追加**。Supabase AuthのGoogleログイン（任意）。ログインするとお気に入りが端末をまたいで使え、画像生成が可能になる |
| 料理画像の生成 | 想定なし | **追加**。レシピ詳細で生成でき、Supabase Storageに保存して再利用。コスト管理のためログイン必須＋1日10枚まで。生成しない人向けに「Geminiアプリ用プロンプトのコピー」と「自分の写真を追加」も用意 |
| お気に入り | 未実装プレースホルダー | 実装済み。ログイン中はSupabase、未ログインはlocalStorage。初回ログイン時に端末内のお気に入りを移行 |
| 記録（履歴）画面 | 画面一覧に無し | **追加**（`/record`）。閲覧したレシピを端末内に最大50件 |
| 退会・プライバシーポリシー | 想定なし | **追加**。設定画面から退会でき、`/privacy` にポリシーを掲載 |
| 薬管理 | 独立した画面。`/api/medicines` でCRUD | 設定画面に統合。専用APIは作らず、薬リストはブラウザに保存してレシピ提案のリクエストに含める。プロンプトへ渡し、`warnings` として返す |
| AIのAPIキー | サーバーの環境変数または設定APIで保存 | **サーバーには保存しない**。各ユーザーが設定画面で自分のキーを入力し、ブラウザ（localStorage）に保存。リクエストごとにヘッダーで送る。運営がキーを預からないため、公開しても課金や漏洩のリスクが小さい |
| DB | 設定の永続化とレシピseed用 | 画像の利用回数（`image_usage`）はバックエンド、お気に入りはSupabaseへフロントから直接。レシピseed用テーブルは使われていない |
| API呼び出し | 各ページで `http://localhost:8000` を直書き | `/api` へのrewritesに統一（スマホなどLAN内の端末からポート3000だけで使える） |
| テスト | 無し | バックエンドにpytestを追加（レシピ提案・食材認識・画像生成・退会） |
| スマホアプリ化（Capacitor.js） | Web完成後に着手 | 未着手 |

---

## 現時点で修正する余地があるところ

### 公開前に対応したい（セキュリティ）

- **DBに古いAPIキーが残っている可能性がある。** 以前の実装は、設定画面で入力したキーを `app_settings` テーブル（`id=1`）に暗号化せず保存していた。現在のコードは使わないが、テーブルと中身は残っている。Supabaseの SQL Editor で `drop table if exists app_settings;` を実行して消し、過去にそこへ保存したGeminiキーは（念のため）再発行すること
- **`/api/suggest-recipes` と `/api/analyze-ingredients` に認証・回数制限が無い。** キーは各ユーザーのものなので運営に課金は発生しないが、誰でもサーバーを経由してGeminiを呼べる。負荷対策として、IPごとの回数制限などを検討する
- **キーはブラウザの localStorage にある。** サイト側にXSSの脆弱性ができると読み取られる。ユーザー入力をそのままHTMLとして出さないこと、共有PCで入力しないこと（設定画面に注意書きあり）を守る

### 不具合・整合性

- **`test_analyze_ingredients.py::test_total_size_too_large` が失敗する。** 上限を5枚→3枚に変えたため、「合計20MB」に達する前に枚数超過（400）で弾かれ、テストの期待する413にならない。合計サイズの上限（15MB以下にしか達しない）かテストのどちらかを直す
- **`/confirm` `/mode` `/recipes` `/recipes/detail` を直接開いたときのガードが無い。** クエリや `sessionStorage` が空でも画面が開き、食材が空のままAPIを呼ぶ／空の画面になる。ホームへ戻す処理を入れたい（Issue #6の残り）
- **Claude側の実装が古く未検証。** モデルIDが `claude-3-5-sonnet-20241022` のままで、`response_schema` 相当の形式強制が無い。画像生成・食材認識はGeminiのみ対応
- **DBの定義が2か所に分かれている。** バックエンドのテーブル（`image_usage`）は起動時の `create_all`、お気に入りは `supabase/migrations/` のSQLを手動実行。マイグレーション管理（Alembic等）を導入するか、運用ルールを決めたい
- **退会しても料理画像はStorageに残る。** 画像はレシピ名をキーに全ユーザーで共有しているため意図的だが、方針としてプライバシーポリシーに書くかどうか確認したい

### 未実装・未着手

- 検索画面（`/search`）
- 履歴が端末内（localStorage）のみで、端末をまたいで同期されない
- デプロイの実施（手順は「デプロイ（公開）」参照。実施後は、バックエンドのCORS許可が `localhost:3000` / LAN内IPのみである点も確認する。現在の構成ではブラウザは同じドメインの `/api` を呼ぶため、CORSは効かない）
- Capacitor.jsによるスマホアプリ化
- フロントの自動テスト（Lintのみ）

### 不要になったものの整理

- `backend/db/models.py` の `Recipe` / `RecipeIngredient` はレシピseed方針の名残で、どこからも使われていないが、起動時の `create_all` でテーブルが作られてしまう
- `backend/requirements.txt` の `google-generativeai`（旧SDK）と、`frontend/package.json` の `axios` はコード上で使われていない
- `frontend/prompts/promrt.md`（ファイル名のtypoあり）は作業用のメモのように見える
- `docs/recipe-retrieval-strategy.md` は廃止済みの方針を「現行方針」として書いている。`docs/medication-check.md` も `/api/medicines` を前提にしていて実装と異なる
- **`Claude.md` が古い。** 旧方針のスタブ実装、`localhost:8000` の直書き、画像5枚、「テストは無い」など、現状と合わない記述が残っている

---

## 開発ルール

- ブランチ名は `<内容>#<Issue番号>`（例: `supabase#7`）。Issueごとにブランチを作り、Pull Requestでレビューしてから `main` にマージする
- `main` は常にデプロイ可能な状態を保つ
- `.env` / `.env.local` は `.gitignore` で除外済み。**キーやシークレットは絶対にコミットしない**（`.env.example` は空欄のまま）
- レシピの正確性は保証できないため、画面には「AIが提案したレシピです」と表示する。薬のチェックは参考情報であり、医療上の判断は医師・薬剤師に相談するよう表示する
