import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'  // 需要导入 path 模块

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')  // 把 @ 指向 src 文件夹
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3005,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
