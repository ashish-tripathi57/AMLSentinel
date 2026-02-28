import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { InvestigationDrawerProvider } from './contexts/InvestigationDrawerContext';
import { AppShell } from './components/layout/AppShell';
import { AlertQueuePage } from './pages/AlertQueuePage';
import { InvestigationPage } from './pages/InvestigationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function App() {
  return (
    <BrowserRouter>
      <InvestigationDrawerProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<AlertQueuePage />} />
            <Route path="/investigation/:alertId" element={<InvestigationPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </AppShell>
      </InvestigationDrawerProvider>
    </BrowserRouter>
  );
}

export default App;
