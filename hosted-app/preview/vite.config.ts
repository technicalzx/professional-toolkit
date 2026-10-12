import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'preview',plugins:[react()],build:{outDir:'../preview-dist',emptyOutDir:true},server:{fs:{allow:['..']}}});
