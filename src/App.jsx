import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Tile from './components/Tile'
import Navbar from './components/Navbar'
import appsConfig from './config/apps.json'
import { paginateTiles, getColumnsForScreen, getTileSizePixels, MAX_HEIGHT } from './lib/gridPagination'
import './App.css'

function App() {
  // Preparar tiles com cores
  const tiles = appsConfig.map((app, index) => {
    let width = 1, height = 1;
    if (app.style === 'retangle-vertical') {
      width = 1;
      height = 2;
    } else if (app.style === 'box') {
      width = 1;
      height = 1;
    }

    return {
      ...app,
      id: index,
      width,
      height,
    }
  })

  // Paginação inteligente e injeção de placeholders
  const pagesWithPlaceholders = paginateTiles(tiles).map(page => {
    const newPage = [...page];
    const placeholders = [];

    page.forEach((tile, index) => {
      if (tile.style === 'retangle-vertical') {
        const tileRow = Math.floor(index / getColumnsForScreen(window.innerWidth));
        const tileCol = index % getColumnsForScreen(window.innerWidth);
        
        // A posição do placeholder é na linha de baixo, mesma coluna
        const placeholderIndex = (tileRow + 1) * getColumnsForScreen(window.innerWidth) + tileCol;

        placeholders.push({
          ...tile, // Copia o tile original
          isPlaceholder: true,
          placeholderFor: tile.id,
          gridPosition: { row: tileRow + 1, col: tileCol } // Posição explícita
        });
      }
    });
    return [...newPage, ...placeholders].sort((a, b) => (a.gridPosition.row * getColumnsForScreen(window.innerWidth) + a.gridPosition.col) - (b.gridPosition.row * getColumnsForScreen(window.innerWidth) + b.gridPosition.col));
  });

  // Estados
  const [selectedTile, setSelectedTile] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [columns, setColumns] = useState(5)

  const recognitionRef = useRef(null)
  const audioContextRef = useRef(null)

  // Atualizar largura da tela e número de colunas
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setScreenWidth(width)
      setColumns(getColumnsForScreen(width))
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Chamar uma vez ao montar

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Efeito para resetar a seleção se o tile selecionado for removido
  useEffect(() => {
    if (selectedTile >= tiles.length && tiles.length > 0) {
      console.log('Tile selecionado não existe mais. Resetando para o início.');
      setSelectedTile(0);
      setCurrentPage(0);
    }
  }, [tiles.length, selectedTile]);

  // Função para tocar som de navegação
  const playNavigationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const audioContextTime = audioContext.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContextTime)
      gainNode.gain.setValueAtTime(0.3, audioContextTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextTime + 0.1)

      oscillator.start(audioContextTime)
      oscillator.stop(audioContextTime + 0.1)
    } catch (error) {
      console.error('Erro ao tocar som:', error)
    }
  }, [])

  // Função de execução de programa
  const executeApp = useCallback((app) => {
    console.log(`[Electron API Fake] Executando ${app.Type}: ${app.Name} em ${app.Path}`)
    if (app.Type === "Link") {
      alert(`Abrindo link: ${app.Path}`)
    } else if (app.Type === "Programa") {
      alert(`Iniciando programa: ${app.Path}`)
    }
  }, [])

  // Função para lidar com o clique no tile
  const handleTileClick = useCallback((index) => {
    setSelectedTile(index)
    executeApp(tiles[index])
  }, [tiles, executeApp])
  
  // Encontrar página e posição do tile selecionado
  const getSelectedTilePageInfo = useCallback(() => {
    const pages = pagesWithPlaceholders;
    const page = pages[currentPage];
    if (!page) return { pageIndex: currentPage, tileIndexInPage: 0 };

    const tileIndexInPage = page.findIndex(tile => tile.id === selectedTile);
    return { pageIndex: currentPage, tileIndexInPage: tileIndexInPage >= 0 ? tileIndexInPage : 0 };
  }, [selectedTile, currentPage, pagesWithPlaceholders])

  // Navegação
  const navigate = useCallback((direction) => {
    const pages = pagesWithPlaceholders; // Usa a nova estrutura de páginas
    const { pageIndex, tileIndexInPage } = getSelectedTilePageInfo()
    const currentPageTiles = pages[pageIndex]
    let newTileIndex = selectedTile
    let newPageIndex = pageIndex

    // Encontra a posição REAL do tile selecionado na grade da página atual
    // Se houver múltiplos (original + placeholder), ele pega o primeiro, que é o ponto de partida correto.
    const currentTileIndex = currentPageTiles.findIndex(t => t.id === selectedTile);
    if (currentTileIndex === -1) return; // Não faz nada se o tile não estiver na página

    const currentRow = Math.floor(currentTileIndex / columns);
    const currentCol = currentTileIndex % columns;

    switch (direction) {
      case 'left':
        const newColLeft = currentCol - 1;
        if (newColLeft >= 0) {
          const targetIndex = currentRow * columns + newColLeft;
          if (currentPageTiles[targetIndex]) {
            newTileIndex = currentPageTiles[targetIndex].id;
          }
        } else { // Muda de página
          newPageIndex = (pageIndex - 1 + pages.length) % pages.length
          setCurrentPage(newPageIndex)
          const targetPageTiles = pages[newPageIndex]
          const targetRowTiles = targetPageTiles.filter((t, i) => Math.floor(i / columns) === currentRow);
          if (targetRowTiles.length > 0) {
            newTileIndex = targetRowTiles[targetRowTiles.length - 1].id
          } else if (targetPageTiles.length > 0) {
            newTileIndex = targetPageTiles[targetPageTiles.length - 1].id
          }
        }
        break
      case 'right':
        const newColRight = currentCol + 1;
        const isLastPage = pageIndex === pages.length - 1;

        const atGridEdge = newColRight >= columns;
        const targetIndex = currentRow * columns + newColRight;
        const rightSpotIsEmpty = !currentPageTiles[targetIndex];

        const realTilesOnPage = currentPageTiles.filter(t => !t.isPlaceholder);
        const lastRealTileOnPage = realTilesOnPage.length > 0 ? realTilesOnPage[realTilesOnPage.length - 1] : null;
        const isCurrentlyOnLastTileOfPage = lastRealTileOnPage ? selectedTile === lastRealTileOnPage.id : false;

        if (isLastPage && isCurrentlyOnLastTileOfPage && (atGridEdge || rightSpotIsEmpty)) {
          newPageIndex = 0;
          setCurrentPage(newPageIndex);
          const targetPageTiles = pages[newPageIndex];
          const targetRowTiles = targetPageTiles.filter((t, i) => Math.floor(i / columns) === currentRow && !t.isPlaceholder);
          if (targetRowTiles.length > 0) {
            newTileIndex = targetRowTiles[0].id;
          } else {
            const firstRealTile = targetPageTiles.find(t => !t.isPlaceholder);
            if (firstRealTile) {
              newTileIndex = firstRealTile.id;
            }
          }
        } else if (atGridEdge) {
          newPageIndex = (pageIndex + 1) % pages.length
          setCurrentPage(newPageIndex)
          const targetPageTiles = pages[newPageIndex]
          const targetRowTiles = targetPageTiles.filter((t, i) => Math.floor(i / columns) === currentRow && !t.isPlaceholder);
          if (targetRowTiles.length > 0) {
            newTileIndex = targetRowTiles[0].id
          } else {
            const firstRealTile = targetPageTiles.find(t => !t.isPlaceholder);
            if (firstRealTile) {
                newTileIndex = firstRealTile.id;
            }
          }
        } else if (!rightSpotIsEmpty) {
          newTileIndex = currentPageTiles[targetIndex].id;
        }
        break
      case 'up':
        const targetIndexUp = (currentRow - 1) * columns + currentCol;
        if (targetIndexUp >= 0 && currentPageTiles[targetIndexUp]) {
          newTileIndex = currentPageTiles[targetIndexUp].id;
        }
        break
      case 'down':
        const targetRow = currentRow + 1;
        // Encontra todos os tiles (reais ou placeholders) na linha de baixo
        const targetRowTiles = currentPageTiles.filter((t, i) => Math.floor(i / columns) === targetRow);

        // Só navega se a linha de baixo não estiver vazia
        if (targetRowTiles.length > 0) {
          // Tenta encontrar um item na mesma coluna
          const idealTile = targetRowTiles.find(t => (currentPageTiles.findIndex(tile => tile.id === t.id) % columns) === currentCol);
          if (idealTile) {
            newTileIndex = idealTile.id;
          } else {
            // Se não encontrar, seleciona o último item da linha de baixo
            newTileIndex = targetRowTiles[targetRowTiles.length - 1].id;
          }
        }
        break
    }

    if (newTileIndex !== selectedTile) {
      setSelectedTile(newTileIndex)
      playNavigationSound() // Adicionar som de navegação
    }
  }, [selectedTile, pagesWithPlaceholders, columns, getSelectedTilePageInfo, tiles.length, currentPage])

  // Configurar reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'pt-BR'

      recognitionRef.current.onstart = () => {
        setVoiceStatus('🎤 Ouvindo...')
      }

      recognitionRef.current.onresult = (event) => {
        const last = event.results.length - 1
        const command = event.results[last][0].transcript.toLowerCase().trim()
        setTranscript(command)
        setVoiceStatus(`Comando: "${command}"`)

        if (command.includes('esquerda')) {
          navigate('left')
        } else if (command.includes('direita')) {
          navigate('right')
        } else if (command.includes('cima')) {
          navigate('up')
        } else if (command.includes('baixo')) {
          navigate('down')
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error)
        setVoiceStatus(`❌ Erro: ${event.error}`)

        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (e) {
                console.error('Erro ao reiniciar:', e)
              }
            }
          }, 1000)
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.error('Erro ao reiniciar reconhecimento:', e)
            setIsListening(false)
            setVoiceStatus('❌ Reconhecimento parado')
          }
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.error('Erro ao parar reconhecimento:', e)
        }
      }
    }
  }, [isListening, navigate])

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
          e.preventDefault()
          navigate('up')
          break
        case 's':
        case 'S':
        case 'ArrowDown':
          e.preventDefault()
          navigate('down')
          break
        case 'a':
        case 'A':
          e.preventDefault()
          navigate('left')
          break
        case 'd':
        case 'D':
          e.preventDefault()
          navigate('right')
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigate('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigate('right')
          break
        case 'Enter':
          e.preventDefault()
          handleTileClick(selectedTile)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, selectedTile, handleTileClick])

  // Toggle do reconhecimento de voz
  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.')
      return
    }

    if (isListening) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
        setVoiceStatus('Reconhecimento desativado')
      } catch (e) {
        console.error('Erro ao parar:', e)
      }
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setVoiceStatus('Iniciando...')
      } catch (e) {
        console.error('Erro ao iniciar:', e)
        setVoiceStatus(`❌ Erro ao iniciar: ${e.message}`)
      }
    }
  }

  // Calcular tamanho do tile
  const tileSizePixels = getTileSizePixels(screenWidth, columns)

  const pages = pagesWithPlaceholders; // Usar a nova estrutura para renderização
  return (
    <div className="App h-screen bg-gray-50 dark:bg-gray-950 flex flex-col overflow-hidden">
      <Navbar isOnline={true} isUpdating={false} />
      <div className="h-14"></div> {/* Espaçador para a navbar fixa (h-14) */}
      
      {/* Container principal com altura fixa */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Grid Metro com Paginação */}
        <div className="flex-1 relative overflow-hidden">
          <motion.div
            className="flex h-full"
            animate={{ x: `-${currentPage * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Mapear os tiles em páginas */}
            {pages.map((pageItems, pageIndex) => (
              <div
                key={pageIndex}
                className="flex-shrink-0 w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-8"
              >
                <div
                  className="grid gap-4 w-full h-full"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridAutoRows: `${tileSizePixels}px`,
                    // O grid deve ocupar toda a área disponível (2 linhas de altura)
                    gridTemplateRows: `repeat(${MAX_HEIGHT}, 1fr)`,
                  }}
                >
                  {pageItems.map((app) => (
                    !app.isPlaceholder && (
                      <Tile
                        key={app.id}
                        app={app}
                        isSelected={selectedTile === app.id}
                        onClick={() => handleTileClick(app.id)}
                      />
                    )
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer com informações */}
        <div className="bg-white dark:bg-gray-900 border-t px-4 sm:px-6 lg:px-8 py-3 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
          <p>Página: <strong className="text-blue-500">{currentPage + 1} de {pages.length}</strong></p>
          <p className="mt-1">Aplicativo selecionado: <strong className="text-blue-500">{tiles[selectedTile]?.Name}</strong></p>
          {transcript && (
            <p className="mt-1">Último comando: <strong className="text-green-500">"{transcript}"</strong></p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
