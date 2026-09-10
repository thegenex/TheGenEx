import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { HomePage, ServicesPage, SolutionsPage, ProductsPage, AboutPage, ContactPage, LegalPage } from '@/pages/public-pages';
import { AdminPage } from '@/pages/admin';
import { trackPageView } from '@/lib/analytics';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

/** Tracks exactly one page_view per real route change (not per React re-render). */
function usePageViewTracking() {
  const [location] = useLocation();
  const lastTracked = useRef<string | null>(null);
  useEffect(() => {
    if (lastTracked.current === location) return;
    lastTracked.current = location;
    trackPageView(location);
  }, [location]);
}

function Router() {
  usePageViewTracking();
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
         <Route path="/" component={HomePage} />
         <Route path="/services" component={ServicesPage} />
         <Route path="/solutions" component={SolutionsPage} />
         <Route path="/products" component={ProductsPage} />
         <Route path="/about" component={AboutPage} />
         <Route path="/contact" component={ContactPage} />
         <Route path="/privacy" component={() => <LegalPage type="privacy" />} />
         <Route path="/terms" component={() => <LegalPage type="terms" />} />
         <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
