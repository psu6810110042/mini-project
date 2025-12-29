import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // เพิ่มบรรทัดนี้เพื่อให้ Docker เข้าถึงได้ง่ายขึ้น
    proxy: {
      '/api': {
        // ❌ ของเดิม: target: 'http://localhost:3000',
        // ✅ ของใหม่: เปลี่ยน localhost เป็นชื่อ service ใน docker-compose
        target: 'http://backend:3000', 
        changeOrigin: true,
        secure: false,
      },
    },
  },
})