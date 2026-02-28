import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { InvestigationSection } from '../components/investigation/InvestigationIconSidebar';
import { INVESTIGATION_SECTIONS } from '../components/investigation/InvestigationIconSidebar';

interface InvestigationSectionState {
  /** The currently active investigation section. */
  activeSection: InvestigationSection;
  /** Change the active investigation section. */
  setActiveSection: (section: InvestigationSection) => void;
}

const InvestigationSectionContext = createContext<InvestigationSectionState | null>(null);

/**
 * Provides shared state for the active investigation section.
 * Used by both AppShell (sidebar navigation) and InvestigationPage (content rendering).
 */
export function InvestigationDrawerProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSectionState] = useState<InvestigationSection>(INVESTIGATION_SECTIONS[0]);

  const setActiveSection = useCallback((section: InvestigationSection) => {
    setActiveSectionState(section);
  }, []);

  return (
    <InvestigationSectionContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </InvestigationSectionContext.Provider>
  );
}

/**
 * Hook to access the active investigation section state.
 * Must be used within an InvestigationDrawerProvider.
 */
export function useInvestigationDrawer(): InvestigationSectionState {
  const context = useContext(InvestigationSectionContext);
  if (!context) {
    throw new Error('useInvestigationDrawer must be used within an InvestigationDrawerProvider');
  }
  return context;
}
