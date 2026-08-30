@echo off
cd /d "D:\company stuff\Noska V1.1"
set "VITE_HTTPS_KEY=D:\company stuff\Noska V1.1\cert-key.pem"
set "VITE_HTTPS_CERT=D:\company stuff\Noska V1.1\cert.pem"
npm run dev
