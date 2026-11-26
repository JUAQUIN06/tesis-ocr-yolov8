export type Requirement = { id: string; text: string; required: boolean }
export type Verdict = 'pass' | 'fail' | 'pending'
export type CriterionStatus = Verdict | 'ignored'

export type CvDocument = {
  id: string
  name: string
  size: number
  kind: 'demo' | 'pdf' | 'image'
  pages: number
  file?: File
}

export type CriterionResult = {
  requirement: Requirement
  status: CriterionStatus
  explanation: string
  quote?: string
  source: 'demo' | 'pending' | 'manual' | 'recognition'
  evidence?: Evidence[]
}

export type Evaluation = {
  documentId: string
  documentName: string
  createdAt: string
  mode: 'demo' | 'manual' | 'recognized'
  criteria: CriterionResult[]
  analysis?: AnalysisResult
}
import type { AnalysisResult, Evidence } from './services/apiSchema'
