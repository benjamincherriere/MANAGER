import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Exemples de pages (tu dois créer ces fichiers si ce n’est pas déjà fait)
import ProductsList from './pages/admin/products/index'
import ProductDetail from './pages/admin/products/[id]'
import MeetingsList from './pages/admin/meetings/index'
import MeetingDetail from './pages/admin/meetings/[id]'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/admin/products" element={<ProductsList />} />
      <Route path="/admin/products/:id" element={<ProductDetail />} />
      <Route path="/admin/meetings" element={<MeetingsList />} />
      <Route path="/admin/meetings/:id" element={<MeetingDetail />} />
      <Route path="*" element={<h1>Bienvenue dans MANAGER</h1>} />
    </Routes>
  </BrowserRouter>
)

export default App

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)
