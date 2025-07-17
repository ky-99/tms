import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useLocation } from 'wouter';

interface NavigationContextValue {
  currentContext: string;
  setCurrentContext: (context: string) => void;
  navigateToPage: (pageIndex: number) => void;
  navigateToParent: () => void;
  focusSearch: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentContext, setCurrentContext] = React.useState<string>('global');
  const [location, setLocation] = useLocation();

  const navigateToPage = useCallback((pageIndex: number) => {
    const routes = ['/', '/tasks', '/export', '/analyze', '/workspace'];
    if (pageIndex >= 0 && pageIndex < routes.length) {
      setLocation(routes[pageIndex]);
    }
  }, [setLocation]);

  const navigateToParent = useCallback(() => {
    const currentPath = location;
    const parentMatch = currentPath.match(/^\/tasks\/(\d+)\/parent$/);
    if (parentMatch) {
      const taskId = parentMatch[1];
      setLocation(`/tasks/${taskId}`);
    }
  }, [location, setLocation]);

  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[placeholder*="検索"], input[placeholder*="タスク名"], .search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }, []);

  const value: NavigationContextValue = {
    currentContext,
    setCurrentContext,
    navigateToPage,
    navigateToParent,
    focusSearch
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};