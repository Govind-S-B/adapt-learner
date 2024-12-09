import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CardGrid } from './components/CardGrid';
import { StudentPage } from './components/user_pages/StudentPage';
import { ChildPage } from './components/user_pages/ChildPage';
import { YouPage } from './components/user_pages/YouPage';
import { LoadingPage } from './components/LoadingPage';
import { ResultPage } from './components/ResultPage';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="w-full"
  >
    {children}
  </motion.div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageWrapper>
            <CardGrid />
          </PageWrapper>
        } />
        <Route path="/record/student" element={
          <PageWrapper>
            <StudentPage />
          </PageWrapper>
        } />
        <Route path="/record/child" element={
          <PageWrapper>
            <ChildPage />
          </PageWrapper>
        } />
        <Route path="/record/you" element={
          <PageWrapper>
            <YouPage />
          </PageWrapper>
        } />
        <Route path="/loading" element={
          <PageWrapper>
            <LoadingPage />
          </PageWrapper>
        } />
        <Route path="/result" element={
          <PageWrapper>
            <ResultPage />
          </PageWrapper>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <AnimatedRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
