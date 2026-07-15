import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'

type LegalPageProps = {
  title: string
  markdown: string
}

/**
 * Wraps GFM tables so a wide table scrolls inside its own box. Without this a phone-width
 * viewport scrolls the whole page sideways.
 */
const markdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="legal-table-wrap">
      <table>{children}</table>
    </div>
  ),
}

/**
 * Renders one of the legal documents from docs/legal/. The Markdown is imported straight
 * from there so the published page and the copy a lawyer reviews can never drift apart.
 *
 * react-markdown builds React elements rather than setting innerHTML, so this adds no XSS
 * sink — the app still has none.
 */
export function LegalPage({ title, markdown }: LegalPageProps) {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <section className="panel">
          <div className="panel-header legal-header">
            <div className="panel-title">
              <span className="panel-logo">
                <Logo size={26} showText={false} />
              </span>
              <h2>{title}</h2>
            </div>
            {/* Reachable directly, not only from the registration form. */}
            <Link className="btn btn-secondary" to="/">
              Back to PMD
            </Link>
          </div>
          <div className="legal-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {markdown}
            </ReactMarkdown>
          </div>
        </section>
      </div>
    </div>
  )
}
