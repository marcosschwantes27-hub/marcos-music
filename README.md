# 🎵 FurtadoMusic - Reprodutor de Músicas Offline (Estilo Spotify)

Um player de músicas offline moderno, imersivo e veloz, construído rigorosamente de acordo com o **Spotify Design System**, com **Navegador Interno do YouTube** para baixar músicas com 1 clique diretamente para a sua biblioteca offline.

---

## ✨ Funcionalidades Principais

- 🟢 **Importador de Playlists e Álbuns do Spotify**:
  - **Cole qualquer link do Spotify** (`https://open.spotify.com/playlist/...`, `/album/...` ou `/track/...`).
  - O app carrega instantaneamente todas as músicas da playlist com título, artista, capa oficial e duração.
  - **Prévias Oficiais (30s):** Ouça a prévia oficial de qualquer música diretamente no navegador antes de salvar.
  - **Download em Lote (`📥 BAIXAR TODAS AS MÚSICAS`):** Baixa automaticamente todas as músicas da playlist em segundo plano, criando uma playlist correspondente no FurtadoMusic!
  - **Download Individual:** Clique em qualquer música da lista para baixar apenas as faixas que desejar.

- 🌐 **Navegador Interno do YouTube + Downloader Direto**:
  - Navegue e pesquise vídeos, clipes e músicas do YouTube sem sair do FurtadoMusic.
  - Cole qualquer link do YouTube (`https://www.youtube.com/watch?v=...` ou `https://youtu.be/...`) ou use o campo de busca.
  - **Player de Prévia Integrado**: Assista e escute o vídeo antes de baixar.
  - **Download em 1 Clique (`📥 BAIXAR PARA O FURTADOMUSIC`)**: Extrai o áudio em alta qualidade (`.m4a`), baixa a capa oficial do vídeo e cadastra automaticamente na sua biblioteca offline do FurtadoMusic!

- 🚗 **Conexão Bluetooth & Som do Carro (100% Offline)**:
  - **Seletor de Dispositivos de Áudio:** Alterne com 1 clique entre os alto-falantes locais, fones Bluetooth ou o sistema de som do carro.
  - **Integração com a MediaSession API:** A tela multimídia do seu carro exibe o **título da música, nome do artista e capa do álbum**.
  - **Controles do Volante:** Pause, avance e volte de faixa usando diretamente os botões físicos do volante do carro.
  - **Zero Consumo de Dados:** Como todas as músicas estão gravadas no seu computador/celular, a reprodução via Bluetooth funciona perfeitamente em estradas, túneis ou locais sem internet.

- 🌑 **Design System Autêntico do Spotify**:
  - Paleta com tons escuros imersivos (`#121212`, `#181818`, `#1f1f1f`).
  - Destaques funcionais no clássico **Spotify Green** (`#1ed760`).
  - Botões estilo pílula (*pill buttons* 500px / 9999px) com rótulos em caixa alta e *letter-spacing* proporcional (`1.4px – 1.6px`).
  - Botão de Play circular (50%) com elevações e sombras profundas (`rgba(0,0,0,0.5) 0px 8px 24px`).
  - Tipografia compacta e funcional (*SpotifyMixUI / CircularSp*).

- 📦 **100% Offline & Persistente (IndexedDB)**:
  - Todas as músicas, capas de álbuns, playlists e preferências são salvas localmente no seu computador.
  - Feche o navegador ou desligue o PC: ao reabrir, tudo continua intacto sem precisar reenviar nada.

- 📥 **Importação Local Inteligente (Drag & Drop)**:
  - Arraste múltiplos arquivos diretamente na janela do app ou clique em **"Adicionar Músicas"**.
  - Suporte a `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`, `.aac`.
  - Leitura automática de tags ID3 (capa do álbum, artista, álbum, ano, gênero, duração).
  - Fallback visual para faixas sem capa embutida com gradientes artísticos dinâmicos.

- 🎛️ **Controles Completos de Reprodução**:
  - Play / Pause, Faixa Anterior, Próxima Faixa.
  - *Seekbar* suave arrastável com indicação precisa de tempo percorrido e total.
  - Modo Aleatório (*Shuffle*) e Repetição (*Repeat One / Repeat All*).
  - Controle de volume com slider customizado e atalho para silenciar (*Mute*).
  - Fila de Reprodução (*Queue*) lateral em tempo real.
  - Modo Visualizador / Tela Cheia com animação de ondas sonoras em Canvas.

- 📂 **Organização e Playlists**:
  - Criação de playlists personalizadas.
  - Seção dedicada de **"Músicas Curtidas"** (Liked Songs).
  - Filtro e busca instantânea por título, artista, álbum ou gênero.

---

## 🚀 Como Iniciar

### Opção 1: Atalho Rápido (Recomendado no Windows)
Basta dar um duplo clique no arquivo:
```cmd
iniciar.bat
```
Ele iniciará o serviço do YouTube em segundo plano e abrirá o reprodutor automaticamente no seu navegador.

### Opção 2: Linha de Comando (Terminal)
1. Inicie o servidor do YouTube:
```bash
python server.py
```
2. Em outro terminal, inicie a interface:
```bash
npm run dev
```

---

## 📁 Estrutura do Projeto

- `server.py`: Servidor local Python integrado com `yt-dlp` para busca e download de áudio do YouTube.
- `src/components/YouTubeBrowser.jsx`: Navegador interno do YouTube com barra de endereço, prévia e download com 1 clique.
- `src/db/database.js`: Armazenamento de áudios, metadados e playlists no IndexedDB.
- `src/context/PlayerContext.jsx`: Motor de áudio HTML5, fila, volume e controle global.
- `src/utils/metadata.js`: Parser de tags ID3 e extração de capas embutidas.
- `src/components/Sidebar.jsx`: Barra lateral de navegação, playlists e atalho do Navegador YouTube.
- `src/components/MainView.jsx`: Telas de Início, Buscar, Biblioteca, Curtidas, Playlists e Navegador YouTube.
- `src/components/PlayerBar.jsx`: Barra inferior do player com controles de áudio.
- `src/components/TrackTable.jsx`: Tabela de faixas com hover, play e menu de opções.
- `src/components/VisualizerModal.jsx`: Visualizador de áudio em tela cheia (Canvas).
