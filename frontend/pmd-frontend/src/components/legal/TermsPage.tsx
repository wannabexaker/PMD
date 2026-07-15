import markdown from '../../../../../docs/legal/terms-of-use.md?raw'
import { LegalPage } from './LegalPage'

export function TermsPage() {
  return <LegalPage title="Terms of Use" markdown={markdown} />
}
