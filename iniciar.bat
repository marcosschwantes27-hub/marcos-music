@echo off
title Marcos Music - Reprodutor Offline & Bluetooth Automotivo
echo ===================================================================
echo                     INICIANDO MARCOS MUSIC
echo   Player Offline + Spotify Importer + Bluetooth / Som Automotivo
echo ===================================================================
echo.
echo [1/2] Iniciando servico de API local...
start "" /B python server.py

echo [2/2] Abrindo interface no seu navegador padrao...
echo.
echo * DICA PARA O CARRO:
echo   Para tocar no carro, conecte seu aparelho ao Bluetooth do veiculo.
echo   O som e os controles do volante funcionarao 100% offline!
echo.
echo Pressione Ctrl+C ou feche esta janela para encerrar.
echo.

call npm.cmd run dev -- --host --open

pause
