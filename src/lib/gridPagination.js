/**
 * Sistema de Paginação Inteligente para Grid de Aplicativos
 * 
 * Regras:
 * - Máximo de 8 aplicativos 1x1 por página
 * - Se houver um aplicativo 1x2, a página deve acomodar 6 aplicativos 1x1 e 1 aplicativo 1x2
 * - O layout deve ser otimizado para preencher a página de acordo com essas regras
 */

/**
 * Calcula a "área" ocupada por um tile (1x1 = 1, 1x2 = 2, 2x2 = 4, etc)
 */
export const getTileArea = (layout) => {
  const [width, height] = layout.split('x').map(Number);
  return width * height;
};

export const MAX_WIDTH = 4; // Máximo de 4 unidades de largura
export const MAX_HEIGHT = 2;

/**
 * Agrupa tiles em páginas de forma inteligente
 * 
 * @param {Array} tiles - Array de tiles com propriedade 'layout'
 * @returns {Array} Array de páginas, cada página é um array de tiles
 */
export const paginateTiles = (tiles) => {
  const pages = [];
  let currentPage = [];
  const MAX_WIDTH = 4; // Máximo de 4 unidades de largura
  const MAX_HEIGHT = 2; // Máximo de 2 unidades de altura por página (2 linhas de 1x1)
  const MAX_AREA_PER_PAGE = MAX_WIDTH * MAX_HEIGHT; // Área máxima por página (8 unidades)

  let grid = Array(MAX_HEIGHT).fill(0).map(() => Array(MAX_WIDTH).fill(false)); // 2x4 grid
  
  const canPlaceTile = (tile, currentGrid) => {
    const w = tile.width;
    const h = tile.height;
    for (let r = 0; r <= MAX_HEIGHT - h; r++) {
      for (let c = 0; c <= MAX_WIDTH - w; c++) {
        let fits = true;
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            if (currentGrid[r + i][c + j]) {
              fits = false;
              break;
            }
          }
          if (!fits) break;
        }
        if (fits) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  };

  const placeTile = (tile, position, currentGrid) => {
    const w = tile.width;
    const h = tile.height;
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        currentGrid[position.row + i][position.col + j] = true;
      }
    }
    return { ...tile, gridPosition: position };
  };

  for (const tile of tiles) {
    let position = canPlaceTile(tile, grid);

    if (position) {
      // O tile cabe na página atual
      const placedTile = placeTile(tile, position, grid);
      currentPage.push(placedTile);
    } else {
      // O tile não cabe, iniciar nova página
      if (currentPage.length > 0) {
        pages.push(currentPage);
      }
      
      // Resetar o grid e a página
      grid = Array(MAX_HEIGHT).fill(0).map(() => Array(MAX_WIDTH).fill(false));
      currentPage = [];

      // Tentar colocar o tile na nova página
      position = canPlaceTile(tile, grid);
      if (position) {
        const placedTile = placeTile(tile, position, grid);
        currentPage.push(placedTile);
      } else {
        // Se o tile não couber nem em uma página vazia (ex: 3x3), ele será ignorado ou causará um erro.
        // Para este caso, vamos apenas adicioná-lo e ele ocupará a primeira posição, mas o layout CSS
        // pode não funcionar corretamente se for maior que 2x4.
        console.error(`Tile ${tile.Name} (${tile.style}) é muito grande para a grade ${MAX_HEIGHT}x${MAX_WIDTH}.`);
        currentPage.push({ ...tile, gridPosition: { row: 0, col: 0 } });
      }
    }
  }

  // Adicionar a última página se houver tiles
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

/**
 * Calcula o número de colunas baseado na largura da tela
 * 
 * @param {number} screenWidth - Largura da tela em pixels
 * @returns {number} Número de colunas
 */
export const getColumnsForScreen = (screenWidth) => {
  // O número de colunas é fixo em 4, conforme a regra de layout (MAX_WIDTH)
  return MAX_WIDTH;
};

/**
 * Calcula o tamanho do tile em pixels baseado na largura da tela
 * 
 * @param {number} screenWidth - Largura da tela em pixels
 * @param {number} columns - Número de colunas
 * @param {number} gap - Espaço entre tiles em pixels
 * @param {number} padding - Padding do container em pixels
 * @returns {number} Tamanho do tile em pixels
 */
export const getTileSizePixels = (screenWidth, columns, gap = 16, padding = 32) => {
  // A largura disponível é a largura do container do grid (flex-shrink-0 w-full) menos o padding (p-4 = 16px * 2 = 32px)
  // O container do grid está dentro de um div com p-4 (16px) em App.jsx.
  // Vamos considerar que o container do grid tem 100% da largura do pai.
  // A largura do pai é screenWidth - (padding lateral do pai).
  // O pai do grid tem p-4 (16px) em App.jsx.
  // A largura do grid é 100% da largura do pai.
  // Vamos usar uma abordagem mais robusta baseada na largura total da tela e subtrair o padding.
  
  // O container do grid tem p-4 (16px) em App.jsx.
  // O container principal tem px-4 sm:px-6 lg:px-8. Vamos assumir o pior caso (p-8 = 32px) para o padding lateral do container principal.
  // O container da página tem p-4 sm:p-6 lg:p-8. Vamos assumir p-8 (32px) para o padding lateral da página.
  
  // Largura total disponível para o grid: screenWidth - (2 * padding da página)
  const pagePadding = 32 * 2; // p-8 em App.jsx (32px) * 2 lados
  const availableWidth = screenWidth - pagePadding;
  
  // Largura de uma coluna: (availableWidth - (gap * (columns - 1))) / columns
  // O gap é 4 (16px) em App.jsx.
  const finalGap = 16;
  const tileSize = (availableWidth - (finalGap * (columns - 1))) / columns;
  
  // Para evitar problemas de sub-pixel, arredondamos para baixo.
  return Math.floor(tileSize);
};

/**
 * Encontra o índice global de um tile dentro de uma página
 * 
 * @param {Array} pages - Array de páginas
 * @param {number} pageIndex - Índice da página
 * @param {number} tileIndexInPage - Índice do tile dentro da página
 * @returns {number} Índice global do tile
 */
export const getGlobalTileIndex = (pages, pageIndex, tileIndexInPage) => {
  let globalIndex = 0;
  for (let i = 0; i < pageIndex; i++) {
    globalIndex += pages[i].length;
  }
  return globalIndex + tileIndexInPage;
};

/**
 * Encontra a página e posição de um tile baseado no índice global
 * 
 * @param {Array} pages - Array de páginas
 * @param {number} globalIndex - Índice global do tile
 * @returns {Object} { pageIndex, tileIndexInPage }
 */
export const getPageAndPositionFromGlobalIndex = (pages, globalIndex) => {
  let currentIndex = 0;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageLength = pages[pageIndex].length;
    if (currentIndex + pageLength > globalIndex) {
      return {
        pageIndex,
        tileIndexInPage: globalIndex - currentIndex,
      };
    }
    currentIndex += pageLength;
  }
  return { pageIndex: 0, tileIndexInPage: 0 };
};
