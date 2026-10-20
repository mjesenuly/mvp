import {defineConfig} from 'vite';
export default defineConfig({root:'frontend',esbuild:{jsx:'automatic'},build:{outDir:'../dist',emptyOutDir:true},server:{proxy:{'/api':'http://localhost:3000'}},test:{environment:'jsdom',include:['src/**/*.test.*']}});
