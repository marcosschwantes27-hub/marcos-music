@echo off
title Marcos Music - Gerador de APK Android
echo ===================================================================
echo                     MARCOS MUSIC - GERADOR DE APK
echo ===================================================================
echo.
echo [1/3] Compilando versao web atualizada...
call npm.cmd run build

echo.
echo [2/3] Sincronizando com o projeto nativo Android (Capacitor)...
call npx.cmd cap sync android

echo.
echo [3/3] Verificando compilador do Android (Gradle)...
cd android
if exist "gradlew.bat" (
    echo Tentando gerar o arquivo APK diretamente com Gradle...
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ===================================================================
        echo SUCESSO! APK gerado em:
        echo android\app\build\outputs\apk\debug\app-debug.apk
        echo ===================================================================
        pause
        exit /b 0
    )
)

cd ..
echo.
echo ===================================================================
echo Para finalizar a geracao do APK sem o Java/Android SDK na linha de comando:
echo 1. O projeto Android completo esta pronto na pasta: android
echo 2. Abra a pasta "android" no Android Studio e clique em "Build > Build APK".
echo.
echo DICA RAPIDA:
echo Voce tambem pode abrir o Marcos Music no celular pelo navegador e clicar em
echo "Instalar Aplicativo" para ter o app executavel oficial na hora!
echo ===================================================================
pause
