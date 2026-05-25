import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { MemberProvider } from "@/lib/member-context";
import { useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import SubmitPage from "@/pages/submit";
import ExpensesPage from "@/pages/expenses";
import PlanPage from "@/pages/plan";
import SettingsPage from "@/pages/settings";
import ContributePage from "@/pages/contribute";
import AdminPage from "@/pages/admin";
import CharterPage from "@/pages/charter";
import MemberDetailPage from "@/pages/member-detail";
import MembersPage from "@/pages/members";
import ReportsPage from "@/pages/reports";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/submit" component={SubmitPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/plan" component={PlanPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/contribute" component={ContributePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/charter" component={CharterPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/member/:name" component={MemberDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">
        <div className="text-sm text-secondary/70">…</div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <MemberProvider>
      <Router hook={useHashLocation}>
        <AppShell>
          <AppRouter />
        </AppShell>
      </Router>
    </MemberProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthGate />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
