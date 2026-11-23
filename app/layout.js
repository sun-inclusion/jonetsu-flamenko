import './globals.css';

export const metadata = {
  title: '情熱のフラ・メンコ | SUNミニゲームシリーズ第4弾',
  description: 'キモカワ動物メンコ全100種を集めて叩きつけろ！昭和レトロ×情熱フラメンコ対戦ゲーム',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
