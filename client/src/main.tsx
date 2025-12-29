import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 1. เพิ่มตัวนี้
import App from './App.tsx'
import './index.css' // (ถ้ามี)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* 2. เอามาครอบ App ไว้ตรงนี้ */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)