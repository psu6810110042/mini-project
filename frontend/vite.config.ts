import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "http://server:3000",
                changeOrigin: true,
            },
            "/socket.io": {
                target: "http://server:3000",
                ws: true,
            },
        },
    },
});
