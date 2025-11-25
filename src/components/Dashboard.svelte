<script lang="ts">
  import { getProgramsWithDateRange } from '$lib/dataProcessor.svelte';
  import { Chart, registerables } from 'chart.js';
  import type { Program } from '../models/program';
  import Button from './Button.svelte';
  import DatePicker from './DatePicker.svelte';
  import {
    startOfWeek,
    endOfWeek,
    endOfMonth,
    startOfMonth,
    startOfYear,
    endOfYear,
    startOfDay,
    endOfDay,
  } from 'date-fns';

  Chart.register(...registerables);

  let showDashboard = $state(false);
  let statusChartCanvas: HTMLCanvasElement | null = $state(null);
  let timeChartCanvas: HTMLCanvasElement | null = $state(null);
  let deadlineChartCanvas: HTMLCanvasElement | null = $state(null);

  let statusChart: Chart | null = null;
  let timeChart: Chart | null = null;
  let deadlineChart: Chart | null = null;

  // Date range state
  let dateRangeStart = $state<Date | null>(startOfDay(new Date()));
  let dateRangeEnd = $state<Date | null>(endOfDay(new Date()));
  let selectedPreset = $state<string>('thisDay');
  let filteredPrograms = $state<Array<Program>>([]);

  // Preset date ranges
  const datePresets = {
    thisDay: { label: 'Dnes' },
    thisWeek: { label: 'Tento týden' },
    thisMonth: { label: 'Tento měsíc' },
    thisQuarter: { label: 'Toto čtvrtletí' },
    thisYear: { label: 'Tento rok' },
    lastMonth: { label: 'Minulý měsíc' },
    lastQuarter: { label: 'Minulé čtvrtletí' },
    lastYear: { label: 'Minulý rok' },
  };

  function applyPreset(preset: string) {
    selectedPreset = preset;
    const now = new Date();

    switch (preset) {
      case 'thisDay':
        dateRangeStart = startOfDay(now);
        dateRangeEnd = endOfDay(now);
        break;
      case 'thisWeek': {
        dateRangeStart = startOfWeek(now);
        dateRangeEnd = endOfWeek(now);
        break;
      }
      case 'thisMonth': {
        dateRangeStart = startOfMonth(now);
        dateRangeEnd = endOfMonth(now);
        break;
      }
      case 'thisQuarter': {
        const quarterStart = startOfMonth(
          new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        );
        dateRangeStart = quarterStart;
        dateRangeEnd = endOfMonth(
          new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 31)
        );
        break;
      }
      case 'thisYear': {
        dateRangeStart = startOfYear(now);
        dateRangeEnd = endOfYear(now);
        break;
      }
      case 'lastMonth': {
        const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        dateRangeStart = lastMonthStart;
        dateRangeEnd = lastMonthEnd;
        break;
      }
      case 'lastQuarter': {
        const lastQuarterStart = startOfMonth(
          new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
        );
        const lastQuarterEnd = endOfMonth(
          new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 1, 27)
        );
        dateRangeStart = lastQuarterStart;
        dateRangeEnd = lastQuarterEnd;
        break;
      }
      case 'lastYear': {
        dateRangeStart = startOfYear(new Date(now.getFullYear() - 1, 1, 1));
        dateRangeEnd = endOfYear(new Date(now.getFullYear() - 1, 1, 1));
        break;
      }
    }

    // Load filtered programs from server
    loadFilteredPrograms();
  }

  async function loadFilteredPrograms() {
    filteredPrograms = await getProgramsWithDateRange(
      dateRangeStart || undefined,
      dateRangeEnd || undefined
    );
  }

  // Load programs on mount and when date range changes
  $effect(() => {
    loadFilteredPrograms();
  });

  const stats = $derived.by(() => {
    const total = filteredPrograms.length;
    const done = filteredPrograms.filter((p) => p.get('doneAt')).length;
    const pending = total - done;
    const avgTotalTime =
      filteredPrograms.length > 0
        ? filteredPrograms.reduce(
            (sum, p) =>
              sum +
              ((p.get('preparing') as number) ?? 0) / 60 +
              ((p.get('programing') as number) ?? 0) / 60 +
              (((p.get('machineWorking') as number) ?? 0) * ((p.get('count') as number) ?? 0)) / 60,
            0
          ) / filteredPrograms.length
        : 0;

    const upcoming = filteredPrograms.filter((p) => {
      const deadlineAt = p.get('deadlineAt') as Date | undefined;
      const doneAt = p.get('doneAt');
      if (!deadlineAt || doneAt) return false;
      const diff = deadlineAt.getTime() - Date.now();
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000; // Next 7 days
    }).length;

    const overdue = filteredPrograms.filter((p) => {
      const deadlineAt = p.get('deadlineAt') as Date | undefined;
      const doneAt = p.get('doneAt');
      if (!deadlineAt || doneAt) return false;
      return deadlineAt.getTime() < Date.now();
    }).length;

    return { total, done, pending, avgTotalTime, upcoming, overdue };
  });

  function createStatusChart() {
    if (!statusChartCanvas || statusChart) return;

    statusChart = new Chart(statusChartCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Hotové', 'Rozpracované'],
        datasets: [
          {
            data: [stats.done, stats.pending],
            backgroundColor: ['#10b981', '#f59e0b'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  function createTimeChart() {
    if (!timeChartCanvas || timeChart) return;

    // Group by month
    const monthlyData = new Map<
      string,
      { preparing: number; programing: number; machining: number }
    >();

    for (const program of filteredPrograms) {
      if (!program.CreatedAt) continue;
      const monthKey = `${program.CreatedAt.getFullYear()}-${String(program.CreatedAt.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { preparing: 0, programing: 0, machining: 0 });
      }

      const data = monthlyData.get(monthKey)!;
      data.preparing += ((program.get('preparing') as number) ?? 0) / 60;
      data.programing += ((program.get('programing') as number) ?? 0) / 60;
      data.machining += (((program.get('machineWorking') as number) ?? 0) * ((program.get('count') as number) ?? 0)) / 60;
    }

    const sortedMonths = Array.from(monthlyData.keys()).sort().slice(-6);
    const preparingData = sortedMonths.map(
      (m) => Math.round(monthlyData.get(m)!.preparing * 10) / 10
    );
    const programingData = sortedMonths.map(
      (m) => Math.round(monthlyData.get(m)!.programing * 10) / 10
    );
    const machiningData = sortedMonths.map(
      (m) => Math.round(monthlyData.get(m)!.machining * 10) / 10
    );

    timeChart = new Chart(timeChartCanvas, {
      type: 'bar',
      data: {
        labels: sortedMonths,
        datasets: [
          {
            label: 'Konstrukce',
            data: preparingData,
            backgroundColor: '#3b82f6',
          },
          {
            label: 'Programování',
            data: programingData,
            backgroundColor: '#8b5cf6',
          },
          {
            label: 'Obrábění',
            data: machiningData,
            backgroundColor: '#ec4899',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hodiny',
            },
          },
        },
      },
    });
  }

  function createDeadlineChart() {
    if (!deadlineChartCanvas || deadlineChart) return;

    deadlineChart = new Chart(deadlineChartCanvas, {
      type: 'bar',
      data: {
        labels: ['Hotové', 'Termín do 7 dnů', 'Po termínu'],
        datasets: [
          {
            label: 'Počet programů',
            data: [stats.done, stats.upcoming, stats.overdue],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  // Recreate charts when date range changes
  $effect(() => {
    // This effect depends on dateRangeStart and dateRangeEnd
    if (showDashboard && (dateRangeStart || dateRangeEnd)) {
      statusChart?.destroy();
      timeChart?.destroy();
      deadlineChart?.destroy();
      statusChart = null;
      timeChart = null;
      deadlineChart = null;

      setTimeout(() => {
        createStatusChart();
        createTimeChart();
        createDeadlineChart();
      }, 10);
    }
  });

  function toggleDashboard() {
    showDashboard = !showDashboard;

    // Destroy charts when closing
    if (!showDashboard) {
      statusChart?.destroy();
      timeChart?.destroy();
      deadlineChart?.destroy();
      statusChart = null;
      timeChart = null;
      deadlineChart = null;
    }
  }
</script>

<Button icon="mdiViewDashboard" onClick={toggleDashboard} primary>
  <span>Statistiky</span>
</Button>

{#if showDashboard}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={toggleDashboard}>
    <div class="dashboard-modal" onclick={(e) => e.stopPropagation()}>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <div class="modal-header">
        <h2>Statistiky</h2>
        <Button icon="mdiClose" onClick={toggleDashboard} onlyIcon />
      </div>

      <div class="dashboard-content">
        <!-- Date Range Filter -->
        <div class="date-range-filter">
          <div class="filter-header">
            <h3>Časové období</h3>
          </div>
          <div class="filter-controls">
            <div class="preset-buttons">
              {#each Object.entries(datePresets) as [key, preset]}
                <Button
                  class="preset-btn"
                  primary={selectedPreset === key}
                  onClick={() => applyPreset(key)}
                >
                  {preset.label}
                </Button>
              {/each}
            </div>
            <div class="custom-range">
              <div class="date-input-group">
                <label for="dateStart">Od:</label>
                <DatePicker bind:value={dateRangeStart} type="date" placeholder="Vyberte datum" />
              </div>
              <div class="date-input-group">
                <label for="dateEnd">Do:</label>
                <DatePicker bind:value={dateRangeEnd} type="date" placeholder="Vyberte datum" />
              </div>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: #3b82f6;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Celkem programů</div>
              <div class="stat-value">{stats.total}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Hotové</div>
              <div class="stat-value">{stats.done}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                <path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Rozpracované</div>
              <div class="stat-value">{stats.pending}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Po termínu</div>
              <div class="stat-value">{stats.overdue}</div>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h4>Stav programů</h4>
            <div class="chart-container">
              <canvas bind:this={statusChartCanvas}></canvas>
            </div>
          </div>

          <div class="chart-card">
            <h4>Časové údaje (měsíční)</h4>
            <div class="chart-container">
              <canvas bind:this={timeChartCanvas}></canvas>
            </div>
          </div>

          <div class="chart-card">
            <h4>Přehled termínů</h4>
            <div class="chart-container">
              <canvas bind:this={deadlineChartCanvas}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .dashboard-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #285597;
    border: 2px solid #285597;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: #1e4177;
    }

    &.active {
      background: #1e4177;
    }
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dashboard-modal {
    background: white;
    border-radius: 16px;
    width: 95%;
    max-width: 1400px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: slideUp 0.3s ease;
    display: flex;
    flex-direction: column;
  }

  @keyframes slideUp {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    border-bottom: 1px solid #e4e7ec;
    flex-shrink: 0;

    h2 {
      margin: 0;
      font-size: 24px;
      color: #1d2939;
      font-weight: 600;
    }

    .close-button {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: 8px;
      color: #667085;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #f2f4f7;
        color: #344054;
      }
    }
  }

  .dashboard-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
  }

  .date-range-filter {
    margin-bottom: 24px;
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;

    .filter-header {
      margin-bottom: 16px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
    }

    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .preset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .preset-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }

          &.active {
            background: #4a90e2;
            border-color: #4a90e2;
            color: white;
          }
        }
      }

      .custom-range {
        display: flex;
        gap: 16px;
        align-items: center;

        .date-input-group {
          display: flex;
          align-items: center;
          gap: 8px;

          label {
            font-size: 13px;
            font-weight: 500;
            color: #6b7280;
            white-space: nowrap;
          }

          input[type='date'] {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            background: white;
            cursor: pointer;

            &:focus {
              outline: none;
              border-color: #4a90e2;
              box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
            }
          }
        }
      }
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;

    .stat-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .stat-content {
      flex: 1;

      .stat-label {
        font-size: 16px;
        color: #667085;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 30px;
        font-weight: 700;
        color: #1d2939;
      }
    }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  .chart-card {
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;

    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #1d2939;
    }

    .chart-container {
      height: 250px;
      position: relative;
    }
  }
</style>
