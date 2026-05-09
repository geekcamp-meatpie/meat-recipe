# Want Cooking - お料理提案アプリ

冷蔵庫の食材を入力すると、AIがレシピを提案してくれるアプリ。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js + React + TypeScript |
| バックエンド | FastAPI（Python） |
| AI（開発中） | Gemini API |
| AI（本番） | Claude API |

---

## セットアップ

### フロントエンド

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### バックエンド

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

---

## ディレクトリ構成と担当ガイド

```
meat-recipe/
├── message.html                  ← デザイン原案（参照用）
├── frontend/                     ← フロントエンド（Next.js + TypeScript）
│   └── src/
│       ├── app/
│       │   ├── layout.tsx        ← 全体レイアウト（TopBar + BottomNav）
│       │   ├── globals.css       ← CSS変数・カラーテーマ定義
│       │   ├── page.tsx          ← ホーム画面（食材入力）
│       │   ├── confirm/
│       │   │   └── page.tsx      ← 食材確認画面（タグ編集）
│       │   ├── mode/
│       │   │   └── page.tsx      ← モード選択・お好み設定画面
│       │   ├── recipes/
│       │   │   ├── page.tsx      ← レシピ提案一覧画面
│       │   │   └── detail/
│       │   │       └── page.tsx  ← レシピ詳細画面
│       │   ├── settings/
│       │   │   └── page.tsx      ← 設定画面（APIキー入力・薬管理）
│       │   ├── search/
│       │   │   └── page.tsx      ← 検索画面（未実装プレースホルダー）
│       │   └── favorites/
│       │       └── page.tsx      ← お気に入り画面（未実装プレースホルダー）
│       └── components/
│           ├── TopBar.tsx        ← 上部ヘッダー
│           └── BottomNav.tsx     ← 下部ナビゲーション
│
└── backend/                      ← バックエンド（FastAPI / Python）
    ├── main.py                   ← FastAPIエントリーポイント（CORS設定等）
    ├── config.py                 ← アプリ設定管理（APIキー・薬情報の保持）
    ├── requirements.txt          ← Python依存パッケージ
    ├── routers/
    │   ├── recipes.py            ← POST /api/suggest-recipes エンドポイント
    │   └── settings.py           ← GET/POST /api/settings エンドポイント
    └── services/
        ├── ai_client.py          ← AI API呼び出し（Gemini/Claude切り替え）
        └── prompt_builder.py     ← プロンプトテンプレート組み立て
```

---

## 担当別ガイド

### 担当A: フロントUI

**主な作業ファイル:**

| ファイル | 何をするか |
|----------|-----------|
| `frontend/src/app/page.tsx` | ホーム画面のレイアウト・テキスト入力欄のUI |
| `frontend/src/app/confirm/page.tsx` | 食材確認画面のタグUI |
| `frontend/src/app/mode/page.tsx` | モード選択・お好み設定のUI |
| `frontend/src/app/recipes/page.tsx` | レシピ一覧のカードUI |
| `frontend/src/app/recipes/detail/page.tsx` | レシピ詳細画面のレイアウト |
| `frontend/src/app/settings/page.tsx` | 設定画面のフォームUI |
| `frontend/src/app/search/page.tsx` | 検索画面（今後実装） |
| `frontend/src/app/favorites/page.tsx` | お気に入り画面（今後実装） |
| `frontend/src/components/TopBar.tsx` | 上部ヘッダーのデザイン |
| `frontend/src/components/BottomNav.tsx` | 下部ナビのデザイン |
| `frontend/src/app/globals.css` | カラーテーマ・CSS変数 |

**デザインの指針:**
- `message.html` のデザイン（配色・カード形状・レイアウト）を基準にする
- CSS変数は `globals.css` の `:root` に定義済み（`--color-accent: #eeaa44` 等）

---

### 担当B: カメラ・画像処理

**主な作業ファイル:**

| ファイル | 何をするか |
|----------|-----------|
| `frontend/src/app/page.tsx` | ホーム画面の「撮影」「写真選択」カードに実際のカメラ/アルバム機能を接続する |
| `backend/routers/recipes.py` | 画像付きリクエストを受け取るエンドポイントの拡張（マルチパート対応等） |
| `backend/services/ai_client.py` | マルチモーダルAPI呼び出しの実装（画像→食材名特定） |

**現在の状態:**
- ホーム画面の撮影・写真選択ボタンは `alert()` のプレースホルダーになっている
- `onClick` ハンドラを実際のカメラAPI呼び出しに差し替える

---

### 担当C: バックエンドAPI

**主な作業ファイル:**

| ファイル | 何をするか |
|----------|-----------|
| `backend/main.py` | FastAPIのエントリーポイント。ルーターの追加・ミドルウェア設定 |
| `backend/config.py` | アプリ設定管理。DB永続化する場合はここを書き換える |
| `backend/routers/recipes.py` | レシピ提案のエンドポイント。リクエスト/レスポンス型の定義 |
| `backend/routers/settings.py` | 設定の読み書きエンドポイント |
| `backend/requirements.txt` | Pythonパッケージの追加 |

**APIエンドポイント一覧:**

| メソッド | パス | 用途 |
|----------|------|------|
| GET | `/` | ヘルスチェック |
| GET | `/api/settings` | 現在の設定を取得 |
| POST | `/api/settings` | 設定を保存（APIキー・プロバイダー・薬リスト） |
| POST | `/api/suggest-recipes` | 食材＋設定を受けてAIにレシピ提案を依頼 |

---

### 担当D: AI・プロンプト設計

**主な作業ファイル:**

| ファイル | 何をするか |
|----------|-----------|
| `backend/services/prompt_builder.py` | プロンプトテンプレートの設計・チューニング |
| `backend/services/ai_client.py` | Gemini/Claude APIの実際の呼び出し実装。現在はダミーデータを返すスタブ |

**現在の状態:**
- `prompt_builder.py` にハンドオーバー資料のプロンプト仕様が実装済み
- `ai_client.py` の `_call_gemini()` / `_call_claude()` はダミーデータを返す状態
- APIキーを取得したら、コメント内の「実装例」を参考に実API呼び出しに差し替える
- 薬チェック機能のプロンプト部分も `prompt_builder.py` に組み込み済み

---

### DB担当（担当Cまたは専任）

DB設計は既に完了しており、人間側で管理します。  
以下にDB関連で編集が必要になるファイルを示します。

**DB接続・永続化で編集するファイル:**

| ファイル | 何をするか |
|----------|-----------|
| `backend/config.py` | 現在メモリ上で設定を保持している。DB読み書きに置き換える場所 |
| `backend/routers/settings.py` | 設定のGET/POSTがメモリ（config.py）を参照している。DB経由に変更する |
| `backend/routers/recipes.py` | お気に入り保存・履歴保存等を追加する場合はここにエンドポイントを追加 |
| `backend/requirements.txt` | DB関連パッケージ（SQLAlchemy, asyncpg 等）を追加 |

**DB関連で新規作成が想定されるファイル:**

| ファイル（例） | 用途 |
|---------------|------|
| `backend/database.py` | DB接続設定・セッション管理 |
| `backend/models/` | SQLAlchemy等のモデル定義 |
| `backend/schemas/` | Pydanticスキーマ（既存のroutersに組み込んでもOK） |
| `backend/alembic/` | マイグレーション管理（Alembic使用時） |

---

## 現在の状態

- **フロント**: 全画面の骨格が動作する状態。`message.html` の配色に合わせたUI
- **バックエンド**: エンドポイントが動作する状態。AIはダミーデータを返す
- **APIキー**: 設定画面で入力欄を用意済み。実API呼び出しは担当Dが実装する
- **DB**: 未実装（現在はメモリ上で設定を保持）
