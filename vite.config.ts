import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://server.snutoto.o-r.kr',
        changeOrigin: true,
        secure: false,
        followRedirects: true,
        ws: true,
        // NOTE: Don't rewrite redirect Location headers here.
        // For OAuth flows, the backend must be able to redirect the browser to an absolute
        // frontend origin (e.g. http://localhost:5173/) after finishing authentication.
        // Rewriting to relative paths can break redirect_uri handling.
      },
    },
  },
});
