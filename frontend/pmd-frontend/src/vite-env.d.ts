/// <reference types="vite/client" />

// The legal pages import their Markdown straight from docs/legal/ so the published page
// and the copy under review stay one file.
declare module '*.md?raw' {
  const content: string
  export default content
}
