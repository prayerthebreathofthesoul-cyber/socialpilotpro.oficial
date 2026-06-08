import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Calendar from "@/pages/Calendar";
import NewPost from "@/pages/NewPost";
import EditPost from "@/pages/EditPost";
import Media from "@/pages/Media";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Support from "@/pages/Support";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import DataDeletion from "@/pages/DataDeletion";
import Master from "@/pages/Master";
import Plans from "@/pages/Plans";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/data-deletion" component={DataDeletion} />

      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/posts/new" component={NewPost} />
      <Route path="/posts/:id/edit" component={EditPost} />
      <Route path="/media" component={Media} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/support" component={Support} />

      <Route path="/plans" component={Plans} />
      <Route path="/master" component={Master} />

      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
