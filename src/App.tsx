import { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Navbar } from './components/Navbar';
import type { NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PurchaseEvaluator } from './components/PurchaseEvaluator';
import { FundAllocatorTab } from './components/FundAllocatorTab';
import { ComfortCalculatorTab } from './components/ComfortCalculatorTab';
import { ExpensesList } from './components/ExpensesList';
import { IncomesList } from './components/IncomesList';
import { InvestmentsTab } from './components/InvestmentsTab';
import { SavingsTab } from './components/SavingsTab';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { IncomeFormModal } from './components/IncomeFormModal';
import { SettingsModal } from './components/SettingsModal';
import { FormatDataModal } from './components/FormatDataModal';
import { ShareAccessModal } from './components/ShareAccessModal';
import { AiAdvisorChat } from './components/AiAdvisorChat';
import { Bot, Sparkles } from 'lucide-react';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [expenseInitialData, setExpenseInitialData] = useState<{
    description?: string;
    amount?: number;
    category?: string;
  } | undefined>(undefined);

  const handleOpenExpenseModal = (initialData?: {
    description?: string;
    amount?: number;
    category?: string;
  }) => {
    setExpenseInitialData(initialData);
    setIsExpenseModalOpen(true);
  };

  const handleProceedToBuy = (itemData: {
    description: string;
    amount: number;
    category: string;
  }) => {
    handleOpenExpenseModal(itemData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 relative">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExpenseModal={() => handleOpenExpenseModal(undefined)}
        onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenFormatModal={() => setIsFormatModalOpen(true)}
        onOpenEvaluatorModal={() => setActiveTab('evaluator')}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
        isChatOpen={isChatOpen}
      />

      {/* Contenedor principal de vistas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            onOpenExpenseModal={() => handleOpenExpenseModal(undefined)}
            onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
            onOpenEvaluator={() => setActiveTab('evaluator')}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'incomes' && (
          <IncomesList onOpenIncomeModal={() => setIsIncomeModalOpen(true)} />
        )}

        {activeTab === 'evaluator' && (
          <PurchaseEvaluator onProceedToBuy={handleProceedToBuy} />
        )}

        {activeTab === 'allocator' && <FundAllocatorTab />}

        {activeTab === 'comfort' && <ComfortCalculatorTab />}

        {activeTab === 'expenses' && <ExpensesList />}

        {activeTab === 'investments' && <InvestmentsTab />}

        {activeTab === 'savings' && <SavingsTab />}
      </main>

      {/* Botón flotante para invocar al Asesor IA si el chat está cerrado */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-16 right-3 sm:bottom-5 sm:right-5 z-30 p-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-indigo-900 to-slate-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-indigo-500/30 group"
          title="Abrir Asesor Financiero IA"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-slate-900 shadow-sm group-hover:rotate-12 transition-transform">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-900" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-bold block leading-none">Asesor IA</span>
            <span className="text-[10px] text-emerald-400 leading-none">¿Dudas financieras?</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block ml-1" />
        </button>
      )}

      {/* Widget Flotante del Chat Asesor IA */}
      <AiAdvisorChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Footer minimalista */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 mb-14 md:mb-0">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            GASTONAPP • Conectado a Google Sheets & Google Drive • Rebalanceo Inteligente & Asesor IA
          </p>
        </div>
      </footer>

      {/* Modales */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseInitialData(undefined);
        }}
        initialData={expenseInitialData}
      />

      <IncomeFormModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenFormatModal={() => setIsFormatModalOpen(true)}
      />

      <FormatDataModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
      />

      <ShareAccessModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
