import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const page = new Hono()

page.get('/', (c) => {
  return c.html(<Top />)
})

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>Reserve Page</title>
        <script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script>
      </head>
      <body class='min-h-screen bg-slate-100 text-slate-900'>{props.children}</body>
    </html>
  )
}

const Top: FC = () => {
  return (
    <Layout>
      <main class='mx-auto max-w-xl px-6 py-20'>
        <h1 class='text-4xl font-bold tracking-tight'>Reserve</h1>
        <p class='mt-3 text-slate-600'>Hono JSX + Tailwind の最小ページです。</p>
        <button
          id='count-btn'
          type='button'
          class='mt-8 rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:opacity-85'
        >
          count: <span id='count-value'>0</span>
        </button>
      </main>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            const btn = document.getElementById('count-btn');
            const value = document.getElementById('count-value');
            let count = 0;
            btn?.addEventListener('click', () => {
              count += 1;
              if (value) value.textContent = String(count);
            });
          `,
        }}
      />
    </Layout>
  )
}

export default page
