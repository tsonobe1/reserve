import type { FC } from 'hono/jsx'

export const Layout: FC = (props) => {
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
