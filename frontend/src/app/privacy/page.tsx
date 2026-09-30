import Link from "next/link";

// 【要確認】【】で囲んだ部分は運営者が確定させて書き換えること。法的な確認（専門家のレビュー）を経てから公開する。
const OPERATOR = "【運営者名】";
const CONTACT = "【連絡先（メールアドレス等）】";
const UPDATED_AT = "【制定日】";

const sectionStyle = { background: "var(--color-card)", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl p-4 space-y-2" style={sectionStyle}>
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="text-xs leading-relaxed space-y-2" style={{ color: "var(--color-text-sub)" }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="px-5 pt-6 pb-6 space-y-4">
      <h1 className="text-lg font-bold">プライバシーポリシー</h1>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
        {OPERATOR}（以下「運営者」）は、冷蔵庫の食材からAIがレシピを提案するアプリ「Want Cooking」（以下「本アプリ」）における、
        利用者の情報の取り扱いを次のとおり定めます。
      </p>

      <Section title="1. 取得する情報">
        <p>本アプリは、利用方法に応じて次の情報を取り扱います。</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <span className="font-semibold">Googleアカウントでログインした場合</span>：メールアドレス、ユーザーID、
            Googleから提供される氏名・プロフィール画像。ログインは任意で、ログインしなくても本アプリの基本機能は使えます。
          </li>
          <li>
            <span className="font-semibold">入力した食材・撮影した写真</span>：レシピ提案や食材の認識のため、AIサービスに送信します。
            写真は、運営者のサーバーには保存しません。
          </li>
          <li>
            <span className="font-semibold">設定画面で登録した服用中の薬の名前</span>（任意）：この端末のブラウザ内にのみ保存します。
            レシピ提案のたびに、薬との相互作用を確認する目的で、運営者のサーバーを経由してAIサービスに送信しますが、運営者のサーバーには保存しません。
          </li>
          <li>
            <span className="font-semibold">設定画面で入力したAIのAPIキー</span>：この端末のブラウザ内にのみ保存します。
            AIサービスを利用するたびに、運営者のサーバーを経由してAIサービスに送信しますが、運営者のサーバーには保存しません。
          </li>
          <li>
            <span className="font-semibold">お気に入りにしたレシピ</span>：ログイン中にお気に入りへ追加したレシピ（名前・材料・手順・
            料理画像のURLなど）を、複数の端末で共有できるよう、運営者のデータベースに保存します。ログインしていない場合は、この端末内にのみ保存します。
          </li>
          <li>
            <span className="font-semibold">画像生成の利用回数</span>：ログインした利用者が1日に生成できる枚数を制限するため、
            ユーザーIDと日付ごとに記録します。
          </li>
          <li>
            <span className="font-semibold">生成した料理画像</span>：レシピ名から生成した画像は、同じレシピ名で再利用するため、
            外部のストレージに保存します。この画像は利用者個人には紐づけていません。
          </li>
        </ul>
      </Section>

      <Section title="2. 利用目的">
        <ul className="list-disc list-inside space-y-1">
          <li>食材に合ったレシピを提案し、料理のイメージ画像を表示するため</li>
          <li>ログインした利用者を識別し、画像生成の回数制限など機能を提供するため</li>
          <li>薬と食材の相互作用について、参考情報を表示するため</li>
          <li>不正利用の防止、および本アプリの安定した運用のため</li>
        </ul>
      </Section>

      <Section title="3. この端末に保存される情報">
        <p>
          閲覧履歴、お気に入りに追加した写真（写真フォルダから選んだ画像）、AIのAPIキー、登録した薬の名前は、ご利用のブラウザ（端末）内にのみ保存され、
          運営者のサーバーには保存されません（APIキーと薬の名前は、AIを利用する際に一時的に送信されます）。ログインしていない間は、お気に入りのレシピもこの端末内にのみ保存されます。
          ブラウザのデータを消去すると、これらも消えます。
        </p>
      </Section>

      <Section title="4. 外部サービスへの提供（委託）">
        <p>本アプリは、機能の提供のために次の外部サービスを利用しており、必要な範囲で情報が送信されます。</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Google（Gemini API：レシピ・画像の生成、食材の認識／Googleログイン）</li>
          <li>Anthropic（Claude API：提供モードとして選択された場合のレシピ提案）</li>
          <li>Supabase（ログイン認証、データベース、画像の保存）</li>
        </ul>
        <p>法令に基づく場合を除き、上記以外の第三者に、利用者の個人情報を提供することはありません。</p>
      </Section>

      <Section title="5. 服用中の薬に関する情報について">
        <p>
          服用中の薬の情報は、健康に関わるセンシティブな情報です。登録は任意で、登録した場合のみ、上記の目的で取り扱います。
          薬との相互作用の表示は、AIによる参考情報であり、医療上の判断は、必ず医師・薬剤師にご相談ください。
        </p>
      </Section>

      <Section title="6. AIが提案したレシピについて">
        <p>
          本アプリのレシピと画像は、AIが生成したものです。分量・手順・アレルギー・栄養面の正確性は保証されないため、目安としてご利用ください。
        </p>
      </Section>

      <Section title="7. 情報の削除（退会）">
        <p>
          ログインした利用者は、設定画面の「退会する」から、いつでもアカウントを削除できます。退会すると、ログイン情報と、
          運営者のサーバーに保存されているその利用者に紐づく情報（お気に入りのレシピ、画像生成の利用回数など）を削除します。この操作は取り消せません。
        </p>
        <p>この端末に保存されたお気に入り・履歴は退会では消えないため、必要に応じてブラウザのデータを消去してください。</p>
      </Section>

      <Section title="8. 安全管理">
        <p>運営者は、取得した情報の漏えい・滅失・毀損を防ぐため、アクセス制限など、必要かつ適切な安全管理措置を講じます。</p>
      </Section>

      <Section title="9. お問い合わせ・改定">
        <p>本ポリシーに関するお問い合わせは、次の窓口までご連絡ください：{CONTACT}</p>
        <p>本ポリシーは、必要に応じて改定します。改定後の内容は、本ページに掲載した時点で効力を生じます。</p>
        <p>制定日：{UPDATED_AT}</p>
      </Section>

      <Link
        href="/settings"
        className="block w-full rounded-xl p-3 text-center font-bold text-sm"
        style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)" }}
      >
        ← 設定に戻る
      </Link>
    </div>
  );
}
