import { BadgeCheck, CircleHelp, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from './ui'
import type { ReactNode } from 'react'
import type { Connection } from '../hooks/useBackendHealth'

export function Layout({ children, onHelp, connection }: { children: ReactNode; onHelp: () => void; connection: Connection }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <header className="app-header">
      <div className="brand">
        <span className="brand-icon"><BadgeCheck size={23} /></span>
        <span className="brand-name">Sistema de Revisión de CV</span>
        <span className="badge brand-badge">TALENT INTELLIGENCE AI</span>
      </div>
      <nav aria-label="Navegación principal" className="main-nav">
        <NavLink to="/carga-y-filtros">Carga y Filtros</NavLink>
        <NavLink to="/resultados-de-evaluacion">Resultados de Evaluación</NavLink>
      </nav>
      <div className="header-actions">
        <span className={`engine-status connection-${connection.status}`} title={connection.message}><span className="status-dot" />{connection.status === 'ok' ? 'Motores conectados' : connection.status === 'degraded' ? 'OCR disponible' : connection.status === 'checking' ? 'Conectando…' : 'Sin conexión'}</span>
        <Button onClick={onHelp} className="help-button" aria-label="Guía y Criterios"><CircleHelp size={16} /><span>Guía y Criterios</span></Button>
        <span className="avatar" title="Espacio local de revisión" aria-label="Espacio local de revisión"><UserRound size={18} /></span>
      </div>
    </header>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} Sistema de Revisión de CV <span className="mx-1">•</span> Talent Intelligence AI Suite</span>
      <span>YOLOv8 + Tesseract · v1.1</span>
    </footer>
  </div>
}
