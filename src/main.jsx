import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import SitePublic from './public/SitePublic.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/espace/*" element={<App />} />
        <Route path="*" element={<SitePublic />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
