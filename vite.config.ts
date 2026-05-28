import path from 'path'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      // dev 直连 mall-api 宿主进程；prod 走 nginx → APISIX → 容器化 mall-api。
      // 不走 APISIX 是因为 dev 模式下业务跑宿主、apisix 跑容器：
      // 跨网段 firewall 拦 + active health check 失败两个坑，把一个 dev
      // 进程改成跨 4 跳没意义。merchant FE 也是同款做法（→ :18999）。
      '/api': {
        target: 'http://localhost:18888',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/tokens.scss";',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
