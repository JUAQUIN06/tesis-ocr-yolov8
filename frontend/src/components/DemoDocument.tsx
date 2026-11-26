import { Mail, MapPin, Phone } from 'lucide-react'
import { demoProfile } from '../data/demo'

export function DemoDocument() {
  return <article className="demo-paper" aria-label="Currículum de ejemplo de Carlos Mendoza">
    <div className="paper-heading">
      <div><h2>{demoProfile.name}</h2><p className="paper-role">{demoProfile.title}</p></div>
      <span className="small-tag">DNI: 7421****</span>
    </div>
    <div className="paper-contact"><span><Mail size={13} />c.mendoza.exp@email.com</span><span><Phone size={13} />+51 984 512 309</span><span><MapPin size={13} />Lima, Perú</span></div>
    <section><h3>Perfil Profesional</h3><p>{demoProfile.summary}</p></section>
    <section>
      <div className="paper-section-heading"><h3>Experiencia Laboral</h3><span className="badge badge-pass">Evidencia de experiencia</span></div>
      {demoProfile.experience.map((job) => <div key={job.company} className="paper-job">
        <h4>{job.company} • {job.role}</h4><span className="paper-date">{job.period}</span>
        <div className="paper-evidence"><p><mark>• {job.quote}</mark> {job.detail}</p><p className="text-[12px] mt-1">• {job.achievement}</p></div>
      </div>)}
    </section>
    <section>
      <div className="paper-section-heading"><h3>Educación y Certificaciones</h3><span className="badge badge-pass">Grado escolar declarado</span></div>
      <div className="paper-job"><div className="flex justify-between flex-wrap gap-1"><h4>Educación Secundaria Completa</h4><span className="paper-date">2014 – 2018</span></div>
        <div className="paper-evidence"><p><mark>I.E. República de Colombia • Certificado Oficial de Educación Básica Regular Concluida</mark> (Lima, Perú).</p></div>
      </div>
    </section>
    <section>
      <div className="paper-section-heading"><h3>Herramientas y Software</h3><span className="badge badge-pending">Observación</span></div>
      <div className="paper-observation"><p>• CRM Salesforce Service Cloud, Zendesk Support, Avaya Workplace, Genesys Cloud.</p>
        <p className="paper-warning"><strong>[Omisión de Excel]:</strong> El documento especifica <em>“Gestión de hojas de cálculo operativas y registro en bases de datos internas”</em>, sin declarar nivel explícito (Básico / Intermedio / Avanzado) ni adjuntar certificación formal de <strong>Microsoft Excel</strong>.</p>
      </div>
    </section>
    <div className="paper-footer"><span>Documento de ejemplo · Datos ilustrativos</span><span>Pág. 1 // Fin del extracto</span></div>
  </article>
}
