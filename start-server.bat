@echo off
echo OSGB Tetkik Takip Sunucusu Baslatiliyor...
echo.
echo Lutfen bu siyah pencereyi kapatmayin! Kapatirsaniz sistem durur.
echo Eger arka planda calismasini istiyorsaniz, PM2 veya NSSM gibi bir servis yoneticisi kullaniniz.
echo.
node dist/server.cjs
pause
