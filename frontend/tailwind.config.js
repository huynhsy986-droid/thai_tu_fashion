/**
 * Tailwind CSS cho Thai Tu Fashion (Issue #5) — TV3 huynhsy986-droid
 * - prefix `tw-` + tắt preflight: không đụng tới CSS của prototype (giao diện giữ nguyên).
 * - theme lấy đúng token của design system trong css/style.css (biến CSS) → màu/font/bo góc đồng nhất.
 * Build: npm run build:css  (sinh css/tailwind.css, có commit để deploy không cần bước build)
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',
  content: ['./index.html', './js/**/*.js'],
  corePlugins: { preflight: false },
  theme: {
    screens: { sm: '600px', md: '768px', lg: '1024px', xl: '1200px' },
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        grey: 'var(--grey)',
        grey2: 'var(--grey2)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-tint': 'var(--accent-tint)',
        hi: 'var(--hi)',
        'hi-tint': 'var(--hi-tint)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        lav: 'var(--lav)',
        mint: 'var(--mint)',
        butter: 'var(--butter)',
        sky: 'var(--sky)',
        pink: 'var(--pink)',
        card: 'var(--card)',
      },
      fontFamily: { sans: 'var(--font)', display: 'var(--display)', kr: 'var(--kr)' },
      borderRadius: { ds: 'var(--r)' },
      spacing: { gut: 'var(--gut)', sec: 'var(--sec)' },
      maxWidth: { wrap: '1416px', prose: '68ch' },
    },
  },
};
