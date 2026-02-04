import React, { useEffect, useRef } from 'react';
import type { CalculationResults } from '../types';
import type { Chart } from 'chart.js';
import { translations } from '../translations';

declare global {
  interface Window {
    Chart: any;
  }
}

interface CostPieChartProps {
  results: CalculationResults | null;
  t: (key: keyof typeof translations.tr) => string;
}

export const CostPieChart: React.FC<CostPieChartProps> = ({ results, t }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !results) return;

    const { totalFactoryCostUSD, grossProfitUSD, totalExpenses } = results;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const { Chart } = window;
    if (!Chart) return;

    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [t('factoryCost'), t('profit'), t('expensesAndTaxes')],
        datasets: [{
          label: t('costCompositionTitle'),
          data: [totalFactoryCostUSD, grossProfitUSD, totalExpenses],
          backgroundColor: [
            '#004F2F', // brandGreen-600
            '#a37e2c', // brandGold-500
            '#9ca3af', // gray-400
          ],
          borderColor: [
            '#ffffff',
            '#ffffff',
            '#ffffff',
          ],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: t('costCompositionTitle'),
            font: {
                size: 16,
                weight: 'bold',
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(2);
                  label += `$${context.parsed.toFixed(2)} (${percentage}%)`;
                }
                return label;
              }
            }
          }
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [results, t]);

  if (!results) return null;

  return (
    <div className="absolute inset-0 w-full h-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};