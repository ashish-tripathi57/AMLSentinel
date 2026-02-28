import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  User,
  ArrowLeftRight,
  Network,
  StickyNote,
  CheckSquare,
  ClipboardList,
  FileText,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useInvestigationDrawer } from '../../contexts/InvestigationDrawerContext';
import { INVESTIGATION_SECTIONS, type InvestigationSection } from '../investigation/InvestigationIconSidebar';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  children: ReactNode;
}

/** Maps each investigation section to its icon from lucide-react. */
const SECTION_ICONS: Record<InvestigationSection, LucideIcon> = {
  Overview: User,
  Transactions: ArrowLeftRight,
  Network: Network,
  Notes: StickyNote,
  Checklist: CheckSquare,
  'Audit Trail': ClipboardList,
  SAR: FileText,
  'Similar Cases': Search,
};

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { activeSection, setActiveSection } = useInvestigationDrawer();
  const isOnInvestigationPage = location.pathname.startsWith('/investigation/');

  const navItems: NavItem[] = [
    { path: '/', label: 'Alert Queue', icon: AlertTriangle },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-sidebar flex flex-col text-white shrink-0 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo / Header */}
        <div className="px-3 py-4 border-b border-white/10">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-2'}`}>
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-xs font-bold shrink-0">
              AML
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-sm font-semibold">AML Sentinel</h1>
                <p className="text-[10px] text-text-muted">Investigation Assistant</p>
              </div>
            )}
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-sidebar-active text-white font-medium'
                    : 'text-text-muted hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}

          {/* Investigation sections — visible on investigation page */}
          {isOnInvestigationPage && (
            <>
              <div className="mt-4 mb-2 border-t border-white/10 pt-3">
                {!collapsed && (
                  <p className="px-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                    Investigation
                  </p>
                )}
              </div>
              <nav aria-label="Investigation sections">
                {INVESTIGATION_SECTIONS.map((section) => {
                  const SectionIcon = SECTION_ICONS[section];
                  const isActive = section === activeSection;

                  return (
                    <button
                      key={section}
                      onClick={() => setActiveSection(section)}
                      title={collapsed ? section : undefined}
                      aria-label={section}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-primary/20 text-white font-medium border-l-2 border-primary'
                          : 'text-text-muted hover:bg-sidebar-hover hover:text-white'
                      }`}
                    >
                      <SectionIcon className="w-4 h-4 shrink-0" />
                      {!collapsed && section}
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 py-2 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-text-muted hover:bg-sidebar-hover hover:text-white transition-colors text-xs"
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="px-5 py-3 border-t border-white/10 text-[11px] text-text-muted">
            Built with G.U.I.D.E.™ Framework
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-page-bg">
        {children}
      </main>
    </div>
  );
}
