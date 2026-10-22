@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js kurulu degil. README dosyasindaki "Bir kez yapilacaklar" adimina bakin. & pause & exit /b 1)
if not exist node_modules (
  echo Ilk calistirma: gerekli paketler indiriliyor...
  call npm install || (pause & exit /b 1)
)
call npm run derle
pause
