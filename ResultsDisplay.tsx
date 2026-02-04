import React, { useState, useEffect } from 'react';
import type { CalculationResults } from '../types';
import { translations } from '../translations';
import { CostPieChart } from './CostPieChart';

// Define jsPDF and html2canvas for TypeScript since they're loaded from a CDN
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface ResultsDisplayProps {
    results: CalculationResults | null;
    t: (key: keyof typeof translations.tr) => string;
}

const ResultRow: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
    <div className={`flex justify-between items-center py-2 border-b border-gray-200`}>
        <div className="flex items-center">
            <i className={`${icon} text-brandGreen-500 mr-3 w-5 text-center`}></i>
            <span className="text-gray-500">{label}</span>
        </div>
        <span className={`font-semibold text-lg text-black`}>{value}</span>
    </div>
);

const CombinedResultRow: React.FC<{ label: string, currencyValue: string, percentageValue: string, icon: string }> = ({ label, currencyValue, percentageValue, icon }) => (
     <div className="flex justify-between items-center py-2 border-b border-gray-200">
        <div className="flex items-center">
            <i className={`${icon} text-brandGreen-500 mr-3 w-5 text-center`}></i>
            <span className="text-gray-500">{label}</span>
        </div>
        <div className="text-right">
            <span className="font-semibold text-lg text-black block">{currencyValue}</span>
            <span className="font-semibold text-sm text-brandGreen-600 block">{percentageValue}</span>
        </div>
    </div>
);


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, t }) => {
    const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'SECONDARY'>('USD');
    
    useEffect(() => {
        setDisplayCurrency('USD'); // Reset to USD when results change
    }, [results]);

    const formatCurrency = (value: number, currency: 'USD' | 'AED' | 'RSD') => {
        const options = { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
        let locale = 'en-US';
        if (currency === 'AED') locale = 'en-AE';
        if (currency === 'RSD') locale = 'sr-RS';
        return new Intl.NumberFormat(locale, options).format(value);
    };

    const formatPercentage = (value: number) => {
        return `%${value.toFixed(2)}`;
    };

    const handleExportPDF = () => {
        if (!results) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(18);
        doc.text(t('pdfReportTitle'), 14, y);
        y += 15;

        doc.setFontSize(12);
        doc.text(`${t('totalFactoryCost')}: ${formatCurrency(results.totalFactoryCostUSD, 'USD')}`, 14, y); y += 7;
        doc.text(`${t('totalShippingAndCustomsCost')}: ${formatCurrency(results.shippingAndCustomsCostUSD, 'USD')}`, 14, y); y += 7;
        doc.text(`${t('perUnitGrossProfit')}: ${formatCurrency(results.perUnitGrossProfitUSD, 'USD')}`, 14, y); y += 7;
        doc.text(`${t('totalGrossProfit')}: ${formatCurrency(results.grossProfitUSD, 'USD')}`, 14, y); y += 7;
        doc.text(`${t('totalGrossMargin')}: ${formatCurrency(results.totalGrossMarginUSD, 'USD')} (${formatPercentage(results.costIncreaseRate)})`, 14, y); y += 15;

        doc.setFontSize(14);
        doc.text(t('priceBreakdownTitle'), 14, y); y += 10;
        
        doc.setFontSize(10);
        doc.text(t('productNameLabel'), 14, y);
        doc.text(t('factoryCost'), 120, y);
        doc.text(t('unitSalePrice'), 160, y);
        y += 5;
        doc.line(14, y, 200, y);
        y += 5;
    
        results.productBreakdown.forEach(item => {
            if (y > 280) { 
                doc.addPage();
                y = 20;
            }
            doc.text(item.name, 14, y);
            doc.text(formatCurrency(item.factoryPrice, 'USD'), 120, y);
            doc.text(formatCurrency(item.finalSalePrice, 'USD'), 160, y);
            y += 7;
        });

        doc.save('simulation-results.pdf');
    };

    const handleExportCSV = () => {
        if (!results) return;

        const summaryRows = [
            [t('resultsTitle')],
            [],
            [t('totalFactoryCost'), results.totalFactoryCostUSD],
            [t('totalShippingAndCustomsCost'), results.shippingAndCustomsCostUSD],
            [t('perUnitGrossProfit'), results.perUnitGrossProfitUSD],
            [t('totalGrossProfit'), results.grossProfitUSD],
            [t('totalGrossMargin'), results.totalGrossMarginUSD],
            [`${t('totalGrossMargin')} (%)`, results.costIncreaseRate],
        ];

        const breakdownHeader = [t('productNameLabel'), t('factoryCost'), t('unitSalePrice')];
        const breakdownRows = results.productBreakdown.map(item => [
            `"${item.name.replace(/"/g, '""')}"`,
            item.factoryPrice,
            item.finalSalePrice
        ]);

        const csvContent = [
            ...summaryRows.map(e => e.join(",")),
            '',
            breakdownHeader.join(","),
            ...breakdownRows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "simulation-results.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const downloadImage = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export-calculator-results.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const elementToCapture = document.querySelector<HTMLElement>('.w-full.max-w-7xl');
        if (!elementToCapture) return;

        try {
            const canvas = await window.html2canvas(elementToCapture, { useCORS: true, scrollY: -window.scrollY });
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert("Ekran görüntüsü oluşturulamadı.");
                    return;
                }
                const file = new File([blob], "export-calculator-results.png", { type: "image/png" });
                const shareData = {
                    files: [file],
                    title: t('shareTitle'),
                    text: t('shareText'),
                };

                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    downloadImage(blob);
                }
            }, "image/png");
        } catch (error) {
            console.error("Ekran görüntüsü alınırken hata oluştu:", error);
            alert("Ekran görüntüsü alınamadı.");
        }
    };


    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex-shrink-0">{t('resultsTitle')}</h2>
            {results ? (
                <div className="flex flex-col flex-grow h-full">
                    
                    <div className="flex-shrink-0 space-y-1 mb-4">
                        <ResultRow label={t('totalFactoryCost')} value={formatCurrency(results.totalFactoryCostUSD, 'USD')} icon="fas fa-industry" />
                        <ResultRow label={t('totalShippingAndCustomsCost')} value={formatCurrency(results.shippingAndCustomsCostUSD, 'USD')} icon="fas fa-truck-loading" />
                        <ResultRow label={t('perUnitGrossProfit')} value={formatCurrency(results.perUnitGrossProfitUSD, 'USD')} icon="fas fa-coins" />
                        <ResultRow label={t('totalGrossProfit')} value={formatCurrency(results.grossProfitUSD, 'USD')} icon="fas fa-cash-register" />
                        <CombinedResultRow 
                            label={t('totalGrossMargin')}
                            currencyValue={formatCurrency(results.totalGrossMarginUSD, 'USD')}
                            percentageValue={formatPercentage(results.costIncreaseRate)}
                            icon="fas fa-chart-line"
                        />
                    </div>
                    
                    <div className="flex-grow relative py-2 my-4 border-t border-b border-gray-200 min-h-[250px]">
                       <CostPieChart results={results} t={t} />
                    </div>

                    <div className="flex-shrink-0 pt-2">
                        <div className="bg-brandGreen-500/10 p-4 rounded-lg border border-brandGreen-500/30">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-brandGreen-700">{t('finalSaleValues')}</h3>
                                <div className="flex items-center bg-gray-100 rounded-full p-1">
                                    <button onClick={() => setDisplayCurrency('USD')} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors duration-200 ${displayCurrency === 'USD' ? 'bg-brandGreen-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        USD
                                    </button>
                                    <button onClick={() => setDisplayCurrency('SECONDARY')} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors duration-200 ${displayCurrency === 'SECONDARY' ? 'bg-brandGreen-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                                        {results.secondaryCurrencyCode}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="text-right space-y-2">
                                <div>
                                    <p className="text-sm text-gray-500">{t('unitSalePrice')}</p>
                                    <span className="text-2xl font-extrabold text-black">
                                        { results.totalQuantity > 0 ? (
                                                displayCurrency === 'USD'
                                                    ? formatCurrency(results.totalSalePriceUSD / results.totalQuantity, 'USD')
                                                    : formatCurrency(results.totalSalePriceSecondaryCurrency / results.totalQuantity, results.secondaryCurrencyCode)
                                            ) : formatCurrency(0, 'USD')
                                        }
                                    </span>
                                </div>
                                <div className="border-t border-brandGreen-500/20 my-2"></div>
                                <div>
                                    <p className="text-base font-medium text-gray-600">{t('totalSaleRevenue')}</p>
                                    <span className="text-4xl font-extrabold text-black">
                                        {displayCurrency === 'USD'
                                            ? formatCurrency(results.totalSalePriceUSD, 'USD')
                                            : formatCurrency(results.totalSalePriceSecondaryCurrency, results.secondaryCurrencyCode)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
                        <button onClick={handleExportCSV} className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors">
                            <i className="fas fa-file-csv"></i> {t('exportCSV')}
                        </button>
                        <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors">
                            <i className="fas fa-share-alt"></i> {t('shareButton')}
                        </button>
                        <button onClick={handleExportPDF} className="w-full flex items-center justify-center gap-2 bg-brandGreen-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-brandGreen-700 transition-colors">
                            <i className="fas fa-file-pdf"></i> {t('exportPDF')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-gray-400">
                    <i className="fas fa-chart-bar fa-3x mb-4"></i>
                    <p className="text-lg">{t('noResultsTitle')}</p>
                    <p className="text-sm">{t('noResultsSubtitle')}</p>
                </div>
            )}
        </div>
    );
};