# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## セットアップ・開発コマンド

### フロントエンド（`frontend/`）

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000 (Next.js App Router, Turbopack)
npm run build
npm run lint      # eslint (eslint-config-next)
```

### バックエンド（`backend/`）

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload   # http://localhost:8000
```

- `backend/.env`（`.env.example`参照）に `SUPABASE_URL` / `SUPABASE_API` / `DATABASE_URL` を設定する。未設定でも起動は継続できる（後述のDBフォールバック設計）。
- Gemini呼び出しには環境変数 `GEMINI_API_KEY`（または `/api/settings` 経由で保存したキー）が必要。
- **Python 3.14では `pydantic`（Rust拡張）や `psycopg2-binary` のビルド済みwheelが無く `pip install` が失敗する。Python 3.11〜3.13を使うこと**（`py -3.13 -m venv .venv` 等）。
- 自動テストは現状フロント・バックエンドともに存在しない（pytest/jest等の設定なし）。

## アーキテクチャ

### 全体構成
モノレポ構成で `frontend/`（Next.js + TypeScript）と `backend/`（FastAPI + Python）が分離しており、フロントは各ページから直接 `http://localhost:8000` へ `fetch` している（環境変数化されておらず、ポート変更時は各ページのハードコードを直す必要がある）。バックエンドのCORSは `http://localhost:3000` のみ許可。

### 画面遷移とデータの受け渡し（フロント）
グローバルな状態管理ライブラリは使わず、**URLクエリパラメータ**で画面間をリレーする設計。
```
page.tsx(ホーム/食材入力)
  → confirm/page.tsx(食材タグ確認、?ingredients=...)
  → mode/page.tsx(モード・お好み設定、?ingredients=...&mode=...&taste=...)
  → recipes/page.tsx(POST /api/suggest-recipes してカード一覧表示)
  → recipes/detail/page.tsx(sessionStorageで選択レシピを1件だけ受け渡し)
```
`settings/page.tsx`（APIキー・薬管理）と `favorites/`・`search/`（未実装プレースホルダー）はボトムナビからの独立ページ。スタイリングはTailwind CSSのユーティリティクラスと、`globals.css` の `:root` で定義したCSS変数（`--color-accent` 等）を併用している。

### バックエンドのルーター構成
| ルーター | パス | 実装状況 |
|---|---|---|
| `routers/recipes.py` | `POST /api/suggest-recipes` | 実装済みだが `services/ai_client.py` がダミーレシピ固定を返すスタブのまま（Issue #3未着手） |
| `routers/settings.py` | `GET/POST /api/settings` | 実装済み。APIキー・provider・薬リストをDB永続化 |
| `routers/analyze_ingredients.py` | `POST /api/analyze-ingredients` | 実装済み（Gemini構造化出力で画像から食材抽出）。フロント側の呼び出しコードは未実装（Issue #18の写真撮影機能が繋がっていない） |

`main.py` にルーターをinclude router名で登録する構成のため、**ルーターファイル名とimport/include_router呼び出しの名前を必ず一致させること**（過去に `routers/ingredients.py` を削除して `analyze_ingredients.py` に差し替えた際、mainの参照更新漏れでサーバーが起動不能になった実例あり）。

### 設定の永続化とDBフォールバック設計
`backend/config.py` の `app_config`（`AppConfig`インスタンス）はメモリ上のシングルトンで、各ルーターがこれを参照する。`db/client.py` は `DATABASE_URL` 未設定時に `engine`/`SessionLocal` を `None` にしてimport時のクラッシュを防ぎ、`main.py` の起動イベントでDB接続失敗時も警告ログのみでアプリ起動を継続する設計になっている。**新しくDB依存のコードを足す場合もこの「DB無しでも起動だけはできる」パターンを踏襲すること**。`db/models.py` には `Recipe` / `RecipeIngredient`（Issue #8のseedデータ用、未投入）と `AppSettings`（設定永続化用、稼働中）が定義されている。

### Gemini呼び出しの注意点
`google-genai`（`from google import genai`、新SDK）と `google-generativeai`（旧SDK）が両方requirements.txtに入っているが、実際に使われているのは新SDKの方（`analyze_ingredients.py`）。**FastAPIの非同期エンドポイント内でGeminiを呼ぶ場合は `client.aio.models.generate_content()` を `await` すること**。同期版 `client.models.generate_content()` をasync def内で呼ぶと、httpxクライアントがクローズ済み扱いになり必ず失敗する（実際に踏んだ不具合）。

### レシピ取得方針：仕様と実装の乖離に注意
`docs/recipe-retrieval-strategy.md` に記載の**現行方針**は「自作レシピDB（seed）＋食材マッチングスコアリング＋DBヒット不足時のみAIアレンジ補完」（Issue #8, #9, #11, #12, #13）だが、**現在の `POST /api/suggest-recipes` の実装はこの方針を反映しておらず、旧方針（AIに毎回フルでレシピ生成させる）のスタブのまま**になっている。DB検索・スコアリング・お好み設定フィルタのロジックはまだ影も形も無い。このエンドポイントを触る際は `docs/recipe-retrieval-strategy.md` を先に読み、どちらの方針で実装すべきか確認すること。

### ブランチ運用
ブランチ名は `<内容>#<Issue番号>`（例: `supabase#7`, `api-setting#4`）の命名規則。Issueごとに対応ブランチを作り、GitHub PRでmainにマージする運用。

---

## プロダクト仕様（ハンドオーバー資料）

### 1. プロジェクト概要

**アプリ概要**: 冷蔵庫に余った食材を入力すると、AIがその食材で作れる料理を提案してくれるアプリ。最初はWebアプリとして開発し、機能が完成した段階でCapacitor.jsを使ってiOS/Androidのスマホアプリに移行する。

**開発目的**: 「冷蔵庫の中身で何を作ろう？」という日常の悩みを、AIの力で手軽に解決する。

**このアプリが解決する課題**:
- 課題1: 自炊をする人の献立の悩み。学生や社会人、高齢者など日常的に自炊をする人にとって、手元の食材で何を作るか考えるのは手間がかかる。特に高齢者にとっては、限られた食材で栄養バランスの取れた料理を考えるのが負担になりやすい。
- 課題2: フードロスの削減。冷蔵庫に余った食材を使い切れずに廃棄してしまう問題を、食材ベースのレシピ提案で解決する。

**開発体制**: 4人での共同開発、GitHubでの分担開発、UIデザインはFigmaで作成。

### 2. 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| フロントエンド | Next.js + React + TypeScript | まずWebアプリとして開発 |
| バックエンド | FastAPI（Python） | |
| AI（開発中） | Gemini API | 無料枠を活用 |
| AI（本番） | Claude API | |
| 画像認識 | Gemini / Claude のマルチモーダル機能 | 食材写真→食材名＋量の特定 |
| スマホアプリ化 | Capacitor.js | Web完成後にiOS/Android対応（未着手） |
| UIデザイン | Figma | 画面デザイン・ワイヤーフレーム |

Webアプリ→スマホアプリへの移行方針: まずNext.js + ReactでWebアプリとして全機能を開発・完成させ、機能が安定した段階でCapacitor.jsを使ってネイティブアプリ化する。Capacitor.jsはReactプロジェクトにそのまま組み込め、カメラAPIなどのネイティブ機能もCapacitorプラグインで対応可能。

### 3. 画面構成

| No. | 画面名 | 概要 |
|-----|--------|------|
| 1 | ホーム画面 | 食材入力（テキスト入力 + カメラ撮影ボタン） |
| 2 | 食材確認画面 | 認識された食材リストの確認・編集 |
| 3 | モード選択・お好み設定画面 | 提案モードの選択 + 味の方向性・調理法・ジャンル・ボリューム感の設定 |
| 4 | レシピ提案画面 | AIが提案した料理一覧（3〜5件） |
| 5 | レシピ詳細画面 | 材料・手順・調理時間など |
| 6 | 薬管理画面 | 服用中の薬の登録・管理（サブ機能） |

### 4. 提案モード

- **モード1: 手持ち食材のみモード** — 入力した食材だけで作れる料理を提案する。追加の買い物なしで作れるレシピのみが表示される。
  プロンプト制約例: `提案するレシピは、以下の食材と一般的な調味料（塩、こしょう、砂糖、醤油、みりん、酒、油）のみで作れるものに限定してください。追加で購入が必要な食材は使わないでください。`
- **モード2: おまかせモード** — 入力した食材を含めつつ、手元にない食材も使ったレシピを提案する。
  プロンプト制約例: `以下の食材を必ず使用してください。それ以外に必要な食材がある場合は「追加で必要な食材」として明記してください。`

### 5. 想定処理フロー

```
ユーザー
  ↓ 食材テキスト入力 or 写真撮影
フロントエンド（Next.js）
  ↓ POST /api/suggest-recipes
バックエンド（FastAPI）
  ↓ 画像あり → マルチモーダルAPIで食材特定
  ↓ 食材リスト + モード + お好み設定 → AIにレシピ提案プロンプト送信
  ↓ 薬が登録されている場合 → 食材と薬の相互作用チェック
AI API（Gemini / Claude）
  ↓ レシピJSON返却（＋薬との注意事項があれば付記）
フロントエンド
  ↓ レシピ一覧・詳細を表示
```

### 6. レシピ取得方針

| 方式 | 判断 | 理由 |
|------|------|------|
| 既存レシピをAPIで取得 | ❌ 不採用 | 著作権・利用規約リスクが大きい。合法的に食材ベースで検索できるレシピAPIがほぼ存在しない |
| 楽天レシピAPI | ❌ 不採用 | カテゴリ検索のみで食材ベースの検索不可、1カテゴリ上位4件のみ、商用利用禁止、APIバージョンが2017年で停止 |
| ユーザー投稿型 | ❌ 不採用 | コールドスタート問題。レシピが集まるまでアプリが機能しない |
| AIに毎回フルでレシピ生成させる | ❌ 不採用（初期案からの方針転換） | 著作権リスクはゼロだが、レシピの品質・再現性が不安定になりやすい |
| **自作レシピDB（seed）＋検索スコアリング＋AIアレンジ補完** | ✅ 採用（現行方針、未実装） | 著作権リスクなし。DB検索で再現性のあるレシピを優先しつつ、DBの手持ちが少ない場合のみAIが補完してカバレッジを確保する |

現行方針の詳細な仕組み（seedデータ投入→全文検索→スコアリング→お好み設定フィルタ→AIアレンジ補完→`source`フィールドでDB/AI由来を明示）は `docs/recipe-retrieval-strategy.md` を参照。**アーキテクチャ節で述べた通り、この方針はまだ実装に反映されていない。**

注意点: レシピの正確性は保証されないため「AIが提案したレシピです」と明示する。開発中はGemini API（無料枠）で開発コストを抑える。

### 7. 画像認識の精度対策

方針: 「認識精度を100%に近づける」よりも「70%の精度でも快適に使えるUX設計」に注力する。詳細は `docs/image-recognition.md` 参照。

- 対策1（プロンプト）: 構造化されたプロンプトでJSON形式 + confidenceスコア付きで返させ、確信度が低い食材のみユーザーに確認を求める分岐を作る
- 対策2（撮影UX）: 撮影ガイド表示、1食材ずつ撮影モード、枠・オーバーレイでの撮影範囲ガイド
- 対策3（最重要・UXで吸収）: AI認識結果をタグ形式で表示しタップで削除・編集可能にする、手動追加欄を常に表示、よく使う食材をサジェスト候補に出す

### 8. お好み設定機能

全カテゴリ単一選択、いずれも「おまかせ」を用意し何も選ばずスキップ可能。「おまかせ」が選ばれた項目はプロンプトから省略する。

- 味の方向性: しょうゆ系 / 味噌系 / 塩系 / ソース系 / ケチャップ系 / ピリ辛 / 酸味系 / クリーム系 / おまかせ
- 調理法: 焼く / 炒める / 煮る / 蒸す / 揚げる / 生・和える / おまかせ
- ジャンル: 和食 / 洋食 / 中華 / 韓国 / エスニック / おまかせ
- ボリューム感: がっつり / 普通 / 軽め

プロンプト例は `docs/recipe-prompt-design.md` 参照（`recipeName`/`cookingTime`/`difficulty`/`ingredients`/`steps`/`point`のJSON形式で返させる）。

### 9. サブ機能: 薬と食材の相互作用チェック

服用している薬を登録しておくと、レシピ提案時に薬との相性が悪い食材を自動で警告する機能（例: ワルファリン×納豆、降圧剤×グレープフルーツ、MAO阻害薬×チーズ/赤ワイン）。詳細・API仕様（`/api/medicines`のCRUD、`warnings`フィールドの形式）は `docs/medication-check.md` 参照。

「AIによる参考情報であり、医療上の判断は必ず医師・薬剤師にご相談ください」という免責事項を必ず表示する。サブ機能として位置づけ、メインのレシピ提案機能の完成を優先する。

### 10. 開発分担（4人体制）

| 担当 | 範囲 |
|------|------|
| A: フロントUI | 画面レイアウト・コンポーネント + お好み設定画面 |
| B: カメラ・画像処理 | 写真撮影 → API送信 → 結果表示 |
| C: バックエンドAPI | FastAPIでエンドポイント設計 |
| D: AI・プロンプト設計 | レシピ提案ロジック + 条件付きプロンプトテンプレート、薬チェック機能 |

GitHub運用ルール: `main`ブランチは常にデプロイ可能な状態を維持し、各自がIssue対応ブランチ（`<内容>#<Issue番号>`）で作業してPull Requestでレビュー→マージする。

### 11. 開発フェーズ

- **Phase 1（メイン機能）**: Figmaでの画面デザイン完成、食材入力（テキスト+画像認識）、2つの提案モード実装、お好み設定+AIレシピ生成、レシピ表示
- **Phase 2（サブ機能）**: 薬管理画面の実装、薬と食材の相互作用チェック機能
- **Phase 3（スマホアプリ化）**: Capacitor.jsの導入、iOS/Androidビルドとテスト、ネイティブ機能のCapacitorプラグイン対応
