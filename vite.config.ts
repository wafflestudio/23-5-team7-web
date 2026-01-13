import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://server.snutoto.o-r.kr', // 백엔드 주소
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
