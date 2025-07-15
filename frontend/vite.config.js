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
    port: 3005,       // 前端开发服务器端口
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // 代理到后端端口
        changeOrigin: true,
      }
    }
  }
})
