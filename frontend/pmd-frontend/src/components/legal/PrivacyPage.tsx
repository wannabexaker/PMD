import markdown from '../../../../../docs/legal/privacy-policy.md?raw'
import { LegalPage } from './LegalPage'

export function PrivacyPage() {
  return <LegalPage title="Privacy Policy" markdown={markdown} />
}
