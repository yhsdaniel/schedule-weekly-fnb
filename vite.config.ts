// vite.config.ts
import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import path from 'path'

export default defineConfig({
    plugins: [
        nitro()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})