import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import KanbanBoard from './pages/KanbanBoard';
import Analytics from './pages/Analytics';
import SLASettings from './pages/SLASettings';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Changes from './pages/Changes';
import ChangeDetail from './pages/ChangeDetail';
import KnowledgeBase from './pages/KnowledgeBase';
import KnowledgeBaseArticle from './pages/KnowledgeBaseArticle';
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
import ChatWidget from './components/ChatWidget';

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

            {/* Single persistent Layout shell – Sidebar mounts once, survives all navigations */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>

              {/* All authenticated roles */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/alerts/:alertId" element={<AlertDetail />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/incidents/:incidentId" element={<IncidentDetail />} />
              <Route path="/oncall" element={<OnCall />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tickets" element={<Navigate to="/kanban" replace />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/tickets/new" element={<RaiseTicket />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/knowledge/:id" element={<KnowledgeBaseArticle />} />
              <Route path="/catalog" element={<ServiceCatalog />} />
              <Route path="/sprint-planner" element={<Navigate to="/kanban" replace />} />

              {/* Admin / Developer only */}
              <Route element={<ProtectedRoute roles={['admin', 'developer']}><Outlet /></ProtectedRoute>}>
                <Route path="/problems" element={<Problems />} />
                <Route path="/problems/:id" element={<ProblemDetail />} />
                <Route path="/changes" element={<Changes />} />
                <Route path="/changes/:id" element={<ChangeDetail />} />
                <Route path="/postmortems" element={<Postmortems />} />
                <Route path="/postmortems/:id" element={<PostmortemDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/sla" element={<SLASettings />} />
                <Route path="/escalation" element={<EscalationPolicies />} />
                <Route path="/routing" element={<AlertRouting />} />
                <Route path="/heartbeats" element={<Heartbeats />} />
                <Route path="/maintenance" element={<MaintenanceWindows />} />
                <Route path="/channels" element={<NotificationChannels />} />
                <Route path="/playbooks" element={<Playbooks />} />
                <Route path="/integrations" element={<Integrations />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute roles={['admin']}><Outlet /></ProtectedRoute>}>
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>

            </Route>
          </Routes>
          <ChatWidget />
        </BrowserRouter>
      </TicketProvider>
    </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
