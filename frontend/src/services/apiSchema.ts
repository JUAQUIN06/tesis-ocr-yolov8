import { z } from 'zod'

const boxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])
const evidenceSchema = z.object({ page: z.number().int().positive(), line_id: z.string(), text: z.string(), bbox: boxSchema })
const valueSchema = z.object({ value: z.string(), evidence: evidenceSchema, inferred: z.boolean() })
const sectionTypes = ['profile', 'experience', 'education', 'skills', 'languages', 'certifications', 'projects', 'contact', 'references', 'other'] as const

export const analysisSchema = z.object({
  document_id: z.string().min(1), filename: z.string(), page_count: z.number().int().positive(), text: z.string(),
  pages: z.array(z.object({
    number: z.number().int().positive(), width: z.number().positive(), height: z.number().positive(),
    coordinate_space: z.literal('processed_image_pixels'), source: z.enum(['tesseract', 'pdf_text']),
    rotation_clockwise: z.number(), deskew_degrees: z.number(), text: z.string(), warnings: z.array(z.string()),
    regions: z.array(z.object({ id: z.string(), label: z.string(), bbox: boxSchema, confidence: z.number().min(0).max(1) })),
    lines: z.array(z.object({
      id: z.string(), text: z.string(), bbox: boxSchema, source: z.enum(['tesseract', 'pdf_text']),
      confidence: z.number().min(0).max(100).nullable(), region_id: z.string().nullable(), column: z.string(), order: z.number().int(),
    })),
  })),
  profile: z.object({
    candidate_name: valueSchema.nullable(), emails: z.array(valueSchema), phones: z.array(valueSchema), links: z.array(valueSchema),
    skills: z.array(valueSchema), languages: z.array(valueSchema),
    sections: z.array(z.object({ type: z.enum(sectionTypes), heading: z.string().nullable(), page: z.number().int().positive(), column: z.string(), text: z.string(), line_ids: z.array(z.string()) })),
  }),
  engines: z.object({ detector: z.string(), detector_model: z.string().nullable(), ocr: z.string(), languages: z.array(z.string()), device: z.string() }),
  warnings: z.array(z.string()), processing_seconds: z.number().nonnegative(),
}).refine((result) => result.pages.length === result.page_count && result.pages.every((page, index) => page.number === index + 1), { message: 'Páginas inconsistentes en la respuesta.' })

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'unavailable']), ready: z.boolean(),
  ocr: z.object({ available: z.boolean(), languages: z.array(z.string()), error: z.string().nullable() }),
  detector: z.object({ available: z.boolean(), model: z.string(), classes: z.array(z.string()), error: z.string().nullable() }),
  limits: z.object({ file_bytes: z.number(), pages: z.number() }),
})

export type AnalysisResult = z.infer<typeof analysisSchema>
export type BackendHealth = z.infer<typeof healthSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type SectionType = typeof sectionTypes[number]
