import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { AlertDetail } from './pages/AlertDetail';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { OnCall } from './pages/OnCall';
import { Settings } from './pages/Settings';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Tickets from './pages/Tickets';
import RaiseTicket from './pages/RaiseTicket';
import TicketDetail from './pages/TicketDetail';
import Analytics from './pages/Analytics';
import SLASettings from './pages/SLASettings';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Changes from './pages/Changes';
import ChangeDetail from './pages/ChangeDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import ServiceCatalog from './pages/ServiceCatalog';
import Postmortems from './pages/Postmortems';
import PostmortemDetail from './pages/PostmortemDetail';
import EscalationPolicies from './pages/EscalationPolicies';
import AlertRouting from './pages/AlertRouting';
import Heartbeats from './pages/Heartbeats';
import MaintenanceWindows from './pages/MaintenanceWindows';
import NotificationChannels from './pages/NotificationChannels';
import Playbooks from './pages/Playbooks';
import Integrations from './pages/Integrations';
import UserManagement from './pages/UserManagement';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TicketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected – all roles */}
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Layout><Alerts /></Layout></ProtectedRoute>} />
            <Route path="/alerts/:alertId" element={<ProtectedRoute><Layout><AlertDetail /></Layout></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Layout><Incidents /></Layout></ProtectedRoute>} />
            <Route path="/incidents/:incidentId" element={<ProtectedRoute><Layout><IncidentDetail /></Layout></ProtectedRoute>} />
            <Route path="/oncall" element={<ProtectedRoute><Layout><OnCall /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

            {/* Tickets – all roles */}
            <Route path="/tickets" element={<ProtectedRoute><Layout><Tickets /></Layout></ProtectedRoute>} />
            <Route path="/tickets/new" element={<ProtectedRoute><Layout><RaiseTicket /></Layout></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute><Layout><TicketDetail /></Layout></ProtectedRoute>} />

            {/* ITSM — all roles */}
            <Route path="/knowledge" element={<ProtectedRoute><Layout><KnowledgeBase /></Layout></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><Layout><ServiceCatalog /></Layout></ProtectedRoute>} />

            {/* ITSM — admin/developer */}
            <Route path="/problems" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Problems /></Layout></ProtectedRoute>} />
            <Route path="/problems/:id" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><ProblemDetail /></Layout></ProtectedRoute>} />
            <Route path="/changes" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Changes /></Layout></ProtectedRoute>} />
            <Route path="/changes/:id" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><ChangeDetail /></Layout></ProtectedRoute>} />
            <Route path="/postmortems" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Postmortems /></Layout></ProtectedRoute>} />
            <Route path="/postmortems/:id" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><PostmortemDetail /></Layout></ProtectedRoute>} />

            {/* Admin / Developer only */}
            <Route path="/analytics" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/sla" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><SLASettings /></Layout></ProtectedRoute>} />

            {/* Alerting — admin/developer */}
            <Route path="/escalation" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><EscalationPolicies /></Layout></ProtectedRoute>} />
            <Route path="/routing" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><AlertRouting /></Layout></ProtectedRoute>} />
            <Route path="/heartbeats" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Heartbeats /></Layout></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><MaintenanceWindows /></Layout></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><NotificationChannels /></Layout></ProtectedRoute>} />

            {/* Operations — admin/developer */}
            <Route path="/playbooks" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Playbooks /></Layout></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute roles={['admin', 'developer']}><Layout><Integrations /></Layout></ProtectedRoute>} />

            {/* Admin only */}
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><UserManagement /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </TicketProvider>
    </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
