import { useState } from 'react';
import {
  User,
  ArrowLeftRight,
  Network,
  StickyNote,
  CheckSquare,
  ClipboardList,
  FileText,
  Search,
} from 'lucide-react';

export const INVESTIGATION_SECTIONS = [
  'Overview',
  'Transactions',
  'Network',
  'Notes',
  'Checklist',
  'Audit Trail',
  'SAR',
  'Similar Cases',
] as const;

export type InvestigationSection = (typeof INVESTIGATION_SECTIONS)[number];

const SECTION_ICONS: Record<InvestigationSection, typeof User> = {
  Overview: User,
  Transactions: ArrowLeftRight,
  Network: Network,
  Notes: StickyNote,
  Checklist: CheckSquare,
  'Audit Trail': ClipboardList,
  SAR: FileText,
  'Similar Cases': Search,
};

interface InvestigationIconSidebarProps {
  activeSection: InvestigationSection;
  onSectionChange: (section: InvestigationSection) => void;
}

export function InvestigationIconSidebar({
  activeSection,
  onSectionChange,
}: InvestigationIconSidebarProps) {
  const [hoveredSection, setHoveredSection] = useState<InvestigationSection | null>(null);

  return (
    <nav
      className="w-[60px] bg-[#1E293B] flex flex-col items-center py-3 gap-1 shrink-0"
      aria-label="Investigation sections"
    >
      {INVESTIGATION_SECTIONS.map((section) => {
        const Icon = SECTION_ICONS[section];
        const isActive = section === activeSection;
        const isHovered = section === hoveredSection;

        return (
          <div key={section} className="relative">
            <button
              onClick={() => onSectionChange(section)}
              onMouseEnter={() => setHoveredSection(section)}
              onMouseLeave={() => setHoveredSection(null)}
              aria-label={section}
              aria-current={isActive ? 'true' : undefined}
              className={[
                'w-10 h-10 flex items-center justify-center rounded-md transition-colors relative',
                isActive
                  ? 'text-white bg-primary/20 border-l-2 border-primary'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              <Icon size={18} />
            </button>

            {isHovered && (
              <div
                role="tooltip"
                className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none"
              >
                {section}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
