import React, { useState } from 'react';
import { Calendar, FileText, TrendingUp, Menu, X, Home, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import SupplierModule from './components/SupplierModule';
import ProductModule from './components/ProductModule';
import FinanceModule from './components/FinanceModule';

type Module = 'dashboard' | 'suppliers' | 'products' | 'finance';

const AppContent: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const modules = [
    {
      id: 'dashboard' as Module,
      name: 'Tableau de Bord',
      icon: Home,
      description: 'Vue d\'ensemble de tous les modules'
    },
    {
      id: 'suppliers' as Module,
      name: 'Suivi Fournisseurs',
      icon: Calendar,
      description: 'Gérer les rendez-vous avec vos fournisseurs'
    },
    {
      id: 'products' as Module,
      name: 'Fiches Produits',
      icon: FileText,
      description: 'Suivi des produits à mettre en ligne'
    },
    {
      id: 'finance' as Module,
      name: 'Analyse Financière',
      icon: TrendingUp,
      description: 'Santé financière et marges'
    }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'suppliers':
        return <SupplierModule />;
      case 'products':
        return <ProductModule />;
      case 'finance':
        return <FinanceModule />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Plus de Bulles</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-8">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => {
                  setActiveModule(module.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeModule === module.id
                    ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">{module.name}</div>
                  <div className="text-sm text-gray-500">{module.description}</div>
                </div>
              </button>
            );
          })}
        </nav>
        
        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700 truncate">
                {user.email}
              </span>
            </div>
            <button
              onClick={signOut}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 mr-2"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {modules.find(m => m.id === activeModule)?.name}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:block">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderModule()}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;