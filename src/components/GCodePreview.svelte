<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GCodeParser } from '../lib/gcode/parser';
  import { ToolpathGenerator, type ToolpathData } from '../lib/gcode/toolpath';
  import Icon from './Icon.svelte';

  let {
    code = '',
    height = '400px',
    showStats = true,
    onError,
  }: {
    code: string;
    height?: string;
    showStats?: boolean;
    onError?: (error: string | null) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let toolpathData: ToolpathData | null = $state(null);
  let error: string | null = $state(null);
  let isLoading = $state(false);

  // View controls
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let viewMode = $state<'top' | 'front' | 'side' | 'iso'>('top');
  let showRapids = $state(true);
  let showGrid = $state(true);
  let showAxes = $state(true);

  // Mouse interaction
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;

  // Animation
  let animationFrame: number | null = null;
  let simulationProgress = $state(0);
  let isSimulating = $state(false);

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      if (ctx) {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
      }
    }
  });

  onDestroy(() => {
    window.removeEventListener('resize', resizeCanvas);
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  // Notify parent when error changes
  $effect(() => {
    onError?.(error);
  });

  function resizeCanvas(): void {
    if (!canvas || !canvas.parentElement) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    render();
  }

  function generateToolpath(): void {
    console.log('[GCodePreview] generateToolpath called');

    // Skip processing for empty or placeholder content
    if (!code.trim() || code.startsWith('; Načítání')) {
      console.log('[GCodePreview] No code or placeholder, clearing toolpath');
      toolpathData = null;
      error = null;
      render();
      return;
    }

    isLoading = true;
    error = null;
    console.log('[GCodePreview] Rendering loading state...');
    render(); // Show loading state immediately

    // Use setTimeout with longer delay to let Monaco load first
    console.log('[GCodePreview] Scheduling toolpath generation with setTimeout...');
    setTimeout(() => {
      console.log('[GCodePreview] setTimeout callback started');
      // Use requestAnimationFrame to yield to browser
      requestAnimationFrame(() => {
        console.log('[GCodePreview] requestAnimationFrame callback started');
        try {
          console.log('[GCodePreview] Creating G-code parser...');
          const parser = new GCodeParser(code);
          console.log('[GCodePreview] Parser loaded...');
          console.log('[GCodePreview] Parsing G-code...');
          const { ast, errors } = parser.parse();
          console.log('[GCodePreview] G-code parsed, errors:', errors.length);

          if (errors.length > 0 && errors.some((e) => e.severity === 'error')) {
            error = 'Nelze vygenerovat dráhu nástroje - kód obsahuje chyby';
            toolpathData = null;
            console.log('[GCodePreview] Parse errors found, skipping toolpath generation');
          } else {
            console.log('[GCodePreview] Generating toolpath...');
            const generator = new ToolpathGenerator();
            toolpathData = generator.generate(ast);
            console.log('[GCodePreview] Toolpath generated, segments:', toolpathData?.segments?.length);
            fitToView();
            console.log('[GCodePreview] fitToView complete');
          }
        } catch (err) {
          error = 'Chyba při generování dráhy nástroje';
          toolpathData = null;
          console.error('[GCodePreview] Error:', err);
        } finally {
          isLoading = false;
          console.log('[GCodePreview] Rendering final state...');
          render();
          console.log('[GCodePreview] generateToolpath complete');
        }
      });
    }, 500); // Wait 500ms to let Monaco initialize first
  }

  function fitToView(): void {
    if (!toolpathData || !canvas) return;

    const bounds = toolpathData.bounds;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;

    if (width === 0 && height === 0) {
      zoom = 1;
      panX = canvas.width / 2;
      panY = canvas.height / 2;
      return;
    }

    const padding = 40;
    const availableWidth = canvas.width - 2 * padding;
    const availableHeight = canvas.height - 2 * padding;

    const scaleX = width > 0 ? availableWidth / width : 1;
    const scaleY = height > 0 ? availableHeight / height : 1;
    zoom = Math.min(scaleX, scaleY);

    panX = canvas.width / 2 - (bounds.min.x + width / 2) * zoom;
    panY = canvas.height / 2 + (bounds.min.y + height / 2) * zoom;
  }

  function render(): void {
    if (!ctx || !canvas) return;

    // Clear canvas with light background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (showGrid) {
      drawGrid();
    }

    // Draw axes
    if (showAxes) {
      drawAxes();
    }

    // Draw toolpath
    if (toolpathData) {
      drawToolpath();
    }

    // Draw stats overlay
    if (showStats && toolpathData) {
      drawStats();
    }
  }

  function drawGrid(): void {
    if (!ctx || !canvas) return;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Calculate grid spacing based on zoom
    const baseSpacing = 10; // 10mm
    let spacing = baseSpacing;
    while (spacing * zoom < 20) spacing *= 2;
    while (spacing * zoom > 100) spacing /= 2;

    // Vertical lines
    const startX = Math.floor(-panX / (spacing * zoom)) * spacing;
    const endX = Math.ceil((canvas.width - panX) / (spacing * zoom)) * spacing;

    for (let x = startX; x <= endX; x += spacing) {
      const screenX = x * zoom + panX;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    const startY = Math.floor((panY - canvas.height) / (spacing * zoom)) * spacing;
    const endY = Math.ceil(panY / (spacing * zoom)) * spacing;

    for (let y = startY; y <= endY; y += spacing) {
      const screenY = -y * zoom + panY;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvas.width, screenY);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  function drawAxes(): void {
    if (!ctx || !canvas) return;

    // X axis (red)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panX, panY);
    ctx.lineTo(panX + 100 * zoom, panY);
    ctx.stroke();

    // Y axis (green)
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(panX, panY);
    ctx.lineTo(panX, panY - 100 * zoom);
    ctx.stroke();

    // Origin
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(panX, panY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    ctx.fillText('X', panX + 105 * zoom, panY + 4);
    ctx.fillText('Y', panX + 4, panY - 105 * zoom);
    ctx.fillText('0', panX - 10, panY + 15);
  }

  function drawToolpath(): void {
    if (!ctx || !toolpathData) return;

    const segments = isSimulating
      ? toolpathData.segments.slice(
          0,
          Math.floor(toolpathData.segments.length * simulationProgress)
        )
      : toolpathData.segments;

    for (const segment of segments) {
      if (!showRapids && segment.type === 'rapid') continue;

      const startX = segment.start.x * zoom + panX;
      const startY = -segment.start.y * zoom + panY;
      const endX = segment.end.x * zoom + panX;
      const endY = -segment.end.y * zoom + panY;

      // Set color based on segment type
      ctx.strokeStyle = segment.color || '#285597';
      ctx.lineWidth = segment.type === 'rapid' ? 1 : 2;

      if (segment.type === 'rapid') {
        // Dashed line for rapid moves
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw current position during simulation
    if (isSimulating && segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      const x = lastSegment.end.x * zoom + panX;
      const y = -lastSegment.end.y * zoom + panY;

      ctx.fillStyle = '#ff6b00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  function drawStats(): void {
    if (!ctx || !toolpathData || !canvas) return;

    const stats = [
      `Délka dráhy: ${toolpathData.totalLength.toFixed(1)} mm`,
      `Odhadovaný čas: ${toolpathData.estimatedTime.toFixed(1)} min`,
      `Nástroje: ${toolpathData.tools.join(', ') || 'žádné'}`,
      `Segmentů: ${toolpathData.segments.length}`,
      `Rozsah X: ${toolpathData.bounds.min.x.toFixed(1)} - ${toolpathData.bounds.max.x.toFixed(1)} mm`,
      `Rozsah Y: ${toolpathData.bounds.min.y.toFixed(1)} - ${toolpathData.bounds.max.y.toFixed(1)} mm`,
      `Rozsah Z: ${toolpathData.bounds.min.z.toFixed(1)} - ${toolpathData.bounds.max.z.toFixed(1)} mm`,
    ];

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(10, 10, 250, stats.length * 18 + 20);
    ctx.strokeStyle = '#dfe3e8';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 250, stats.length * 18 + 20);

    ctx.fillStyle = '#333';
    ctx.font = '12px monospace';
    stats.forEach((stat, i) => {
      ctx.fillText(stat, 20, 30 + i * 18);
    });
  }

  function handleMouseDown(e: MouseEvent): void {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartPanX = panX;
    dragStartPanY = panY;
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isDragging) return;

    panX = dragStartPanX + (e.clientX - dragStartX);
    panY = dragStartPanY + (e.clientY - dragStartY);
    render();
  }

  function handleMouseUp(): void {
    isDragging = false;
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - panX) / zoom;
    const worldY = (mouseY - panY) / zoom;

    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom *= scaleFactor;
    zoom = Math.max(0.1, Math.min(10, zoom));

    panX = mouseX - worldX * zoom;
    panY = mouseY - worldY * zoom;

    render();
  }

  function startSimulation(): void {
    if (!toolpathData) return;

    isSimulating = true;
    simulationProgress = 0;

    const animate = () => {
      simulationProgress += 0.01;
      if (simulationProgress >= 1) {
        simulationProgress = 1;
        isSimulating = false;
      }

      render();

      if (isSimulating) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();
  }

  function stopSimulation(): void {
    isSimulating = false;
    simulationProgress = 0;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    render();
  }

  // Debounce toolpath generation to not block UI
  let generateTimeout: ReturnType<typeof setTimeout> | null = null;
  let isFirstRender = true;

  $effect(() => {
    // Read code to track it as dependency
    const currentCode = code;

    // Clear previous timeout
    if (generateTimeout) {
      clearTimeout(generateTimeout);
    }

    // Use longer delay on first render to let Monaco load first
    const delay = isFirstRender ? 1000 : 200;
    console.log('[GCodePreview] $effect scheduling generateToolpath with delay:', delay);

    // Delay generation to let UI render first
    generateTimeout = setTimeout(() => {
      isFirstRender = false;
      generateToolpath();
    }, delay);

    return () => {
      if (generateTimeout) {
        clearTimeout(generateTimeout);
      }
    };
  });
</script>

<div class="gcode-preview">
  <div class="preview-toolbar">
    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        class:active={viewMode === 'top'}
        onclick={() => {
          viewMode = 'top';
          render();
        }}
        title="Pohled shora"
      >
        <Icon name="mdiAxisZArrow" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={viewMode === 'front'}
        onclick={() => {
          viewMode = 'front';
          render();
        }}
        title="Pohled zepředu"
        disabled
      >
        <Icon name="mdiAxisYArrow" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={viewMode === 'side'}
        onclick={() => {
          viewMode = 'side';
          render();
        }}
        title="Pohled z boku"
        disabled
      >
        <Icon name="mdiAxisXArrow" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={viewMode === 'iso'}
        onclick={() => {
          viewMode = 'iso';
          render();
        }}
        title="Izometrický pohled"
        disabled
      >
        <Icon name="mdiCubeOutline" size={18} />
      </button>
    </div>

    <div class="toolbar-group">
      <button type="button" class="toolbar-btn" onclick={fitToView} title="Přizpůsobit pohled">
        <Icon name="mdiFitToPageOutline" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => {
          zoom *= 1.2;
          render();
        }}
        title="Přiblížit"
      >
        <Icon name="mdiMagnifyPlus" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => {
          zoom /= 1.2;
          render();
        }}
        title="Oddálit"
      >
        <Icon name="mdiMagnifyMinus" size={18} />
      </button>
    </div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        class:active={showGrid}
        onclick={() => {
          showGrid = !showGrid;
          render();
        }}
        title="Zobrazit mřížku"
      >
        <Icon name="mdiGrid" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={showAxes}
        onclick={() => {
          showAxes = !showAxes;
          render();
        }}
        title="Zobrazit osy"
      >
        <Icon name="mdiAxisArrow" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={showRapids}
        onclick={() => {
          showRapids = !showRapids;
          render();
        }}
        title="Zobrazit rychloposuvy"
      >
        <Icon name="mdiVectorLine" size={18} />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        class:active={showStats}
        onclick={() => {
          showStats = !showStats;
          render();
        }}
        title="Zobrazit statistiky"
      >
        <Icon name="mdiInformationOutline" size={18} />
      </button>
    </div>

    <div class="toolbar-group">
      {#if !isSimulating}
        <button
          type="button"
          class="toolbar-btn"
          onclick={startSimulation}
          disabled={!toolpathData}
          title="Spustit simulaci"
        >
          <Icon name="mdiPlay" size={18} />
        </button>
      {:else}
        <button
          type="button"
          class="toolbar-btn"
          onclick={stopSimulation}
          title="Zastavit simulaci"
        >
          <Icon name="mdiStop" size={18} />
        </button>
      {/if}
    </div>
  </div>

  <div class="preview-canvas" style="height: {height}">
    {#if isLoading}
      <div class="loading">
        <Icon name="mdiLoading" size={32} spin />
        <p>Generování dráhy nástroje...</p>
      </div>
    {/if}
    <canvas
      bind:this={canvas}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      onwheel={handleWheel}
    ></canvas>
  </div>
</div>

<style lang="scss">
  .gcode-preview {
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .preview-toolbar {
    display: flex;
    gap: var(--space-8);
    padding: var(--space-4) var(--space-6);
    background: var(--color-bg-subtle);
    border-bottom: 1px solid var(--color-border-light);

    .toolbar-group {
      display: flex;
      gap: var(--space-2);
      padding: 0 var(--space-4);
      border-right: 1px solid var(--color-border-light);

      &:first-child {
        padding-left: 0;
      }

      &:last-child {
        border-right: none;
      }
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-4);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover:not(:disabled) {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &:active:not(:disabled) {
        transform: scale(0.95);
      }

      &.active {
        background: var(--color-primary);
        border-color: var(--color-primary);
        color: var(--color-text-on-primary);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }

  .preview-canvas {
    position: relative;
    flex: 1;
    min-height: 0;
    cursor: move;
    background: var(--color-bg-subtle);

    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-6);
      color: var(--color-text-secondary);
      z-index: 10;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  :global(.gcode-preview .loading svg) {
    animation: spin 1s linear infinite;
    color: var(--color-primary);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
