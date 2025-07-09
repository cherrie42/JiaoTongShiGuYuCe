module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 后端服务地址
        changeOrigin: true
      }
    }
  }
}
