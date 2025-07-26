import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // 初期化: localStorageから設定を読み込み
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    } else {
      // システムの設定を確認
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }

    // 初期化後にアニメーションを有効化
    const timer = setTimeout(() => {
      document.documentElement.classList.add('animations-enabled');
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  // テーマが変更されたときにHTML要素にdata-theme属性を設定
  useEffect(() => {
    // アニメーション無効化のクラスを削除（念のため）
    document.documentElement.classList.remove('animations-enabled');
    
    // テーマを設定
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // 短い遅延後にアニメーションを復元（テーマ切り替えが完了してから）
    const timer = setTimeout(() => {
      document.documentElement.classList.add('animations-enabled');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};