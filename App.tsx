import React, { useState, useCallback } from 'react';
import { InputForm } from './components/InputForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import type { CalculationResults, DubaiCalculationInputs, SerbiaCalculationInputs, ProductItem } from './types';
import { translations } from './translations';
import { v4 as uuidv4 } from 'uuid';

export type Country = 'dubai' | 'serbia';

const initialDubaiInputs: DubaiCalculationInputs = {
    products: [{ id: uuidv4(), name: 'Üçlü Koltuk', quantity: '1', price: '1700' }],
    profitMargin: '25',
    customsDutyRate: '5',
    fixedShippingCostAED: '2323.5',
    exchangeRate: '3.673',
    melenRiskRate: '10'
};

const initialSerbiaInputs: SerbiaCalculationInputs = {
    products: [{ id: uuidv4(), name: 'Ofis Sandalyesi', quantity: '10', price: '150' }],
    profitMargin: '30',
    customsDutyRate: '10',
    fixedShippingCostRSD: '55000',
    exchangeRateRSD: '109.5',
    vatRate: '20'
};

const App: React.FC = () => {
    const [inputs, setInputs] = useState({
        dubai: initialDubaiInputs,
        serbia: initialSerbiaInputs
    });
    const [activeCountry, setActiveCountry] = useState<Country>('dubai');
    const [results, setResults] = useState<CalculationResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState<'tr' | 'en'>('tr');

    const t = useCallback((key: keyof typeof translations.tr) => {
        return translations[language][key] || key;
    }, [language]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputs(prev => ({
            ...prev,
            [activeCountry]: {
                ...prev[activeCountry],
                [name]: value
            }
        }));
    }, [activeCountry]);

    const handleProductChange = useCallback((id: string, field: keyof Omit<ProductItem, 'id'>, value: string) => {
        setInputs(prev => ({
            ...prev,
            [activeCountry]: {
                ...prev[activeCountry],
                products: prev[activeCountry].products.map(p => p.id === id ? { ...p, [field]: value } : p)
            }
        }));
    }, [activeCountry]);

    const addProduct = useCallback(() => {
        setInputs(prev => ({
            ...prev,
            [activeCountry]: {
                ...prev[activeCountry],
                products: [...prev[activeCountry].products, { id: uuidv4(), name: '', quantity: '1', price: '' }]
            }
        }));
    }, [activeCountry]);

    const removeProduct = useCallback((id: string) => {
        setInputs(prev => ({
            ...prev,
            [activeCountry]: {
                ...prev[activeCountry],
                products: prev[activeCountry].products.filter(p => p.id !== id)
            }
        }));
    }, [activeCountry]);
    
    const calculateDubai = (currentInputs: DubaiCalculationInputs): Omit<CalculationResults, 'productBreakdown' | 'totalQuantity'> => {
        const { products, profitMargin, customsDutyRate, fixedShippingCostAED, exchangeRate, melenRiskRate } = currentInputs;
        const totalFactoryCostUSD = products.reduce((acc, p) => acc + ((parseInt(p.quantity, 10) || 0) * (parseFloat(p.price) || 0)), 0);
        
        const profitMarginMultiplier = 1 + (parseFloat(profitMargin) / 100);
        const customsDutyMultiplier = 1 + (parseFloat(customsDutyRate) / 100);
        const melenRiskMultiplier = 1 + (parseFloat(melenRiskRate) / 100);
        const shippingCostAED = parseFloat(fixedShippingCostAED);
        const exchangeRateValue = parseFloat(exchangeRate);

        const shippingCostUSD = shippingCostAED / exchangeRateValue;
        const priceAfterProfitAndCustoms = totalFactoryCostUSD * profitMarginMultiplier * customsDutyMultiplier;
        const priceWithShipping = priceAfterProfitAndCustoms + shippingCostUSD;
        const totalSalePriceUSD = priceWithShipping * melenRiskMultiplier;

        const grossProfitUSD = (totalFactoryCostUSD * (profitMarginMultiplier - 1));
        const customsCostUSD = totalFactoryCostUSD * profitMarginMultiplier * (customsDutyMultiplier - 1);

        return {
            totalFactoryCostUSD,
            totalSalePriceUSD,
            totalSalePriceSecondaryCurrency: totalSalePriceUSD * exchangeRateValue,
            secondaryCurrencyCode: 'AED',
            grossProfitUSD,
            costIncreaseRate: totalFactoryCostUSD > 0 ? ((totalSalePriceUSD - totalFactoryCostUSD) / totalFactoryCostUSD) * 100 : 0,
            totalExpenses: totalSalePriceUSD - totalFactoryCostUSD - grossProfitUSD,
            shippingAndCustomsCostUSD: shippingCostUSD + customsCostUSD,
            perUnitGrossProfitUSD: 0, // will be calculated below
            totalGrossMarginUSD: totalSalePriceUSD - totalFactoryCostUSD,
        };
    };

    const calculateSerbia = (currentInputs: SerbiaCalculationInputs): Omit<CalculationResults, 'productBreakdown' | 'totalQuantity'> => {
        const { products, profitMargin, customsDutyRate, fixedShippingCostRSD, exchangeRateRSD, vatRate } = currentInputs;
        const totalFactoryCostUSD = products.reduce((acc, p) => acc + ((parseInt(p.quantity, 10) || 0) * (parseFloat(p.price) || 0)), 0);

        const profitMarginMultiplier = 1 + (parseFloat(profitMargin) / 100);
        const customsDutyMultiplier = 1 + (parseFloat(customsDutyRate) / 100);
        const shippingCostRSD = parseFloat(fixedShippingCostRSD);
        const exchangeRateValueRSD = parseFloat(exchangeRateRSD);
        const vatMultiplier = 1 + (parseFloat(vatRate) / 100);

        const shippingCostUSD = shippingCostRSD / exchangeRateValueRSD;
        const priceWithProfit = totalFactoryCostUSD * profitMarginMultiplier;
        const customsCostUSD = priceWithProfit * (customsDutyMultiplier - 1);
        
        const priceBeforeVAT = priceWithProfit + customsCostUSD + shippingCostUSD;
        const totalSalePriceUSD = priceBeforeVAT * vatMultiplier;

        const grossProfitUSD = (totalFactoryCostUSD * (profitMarginMultiplier - 1));
        
        return {
            totalFactoryCostUSD,
            totalSalePriceUSD,
            totalSalePriceSecondaryCurrency: totalSalePriceUSD * exchangeRateValueRSD,
            secondaryCurrencyCode: 'RSD',
            grossProfitUSD,
            costIncreaseRate: totalFactoryCostUSD > 0 ? ((totalSalePriceUSD - totalFactoryCostUSD) / totalFactoryCostUSD) * 100 : 0,
            totalExpenses: totalSalePriceUSD - totalFactoryCostUSD - grossProfitUSD,
            shippingAndCustomsCostUSD: shippingCostUSD + customsCostUSD,
            perUnitGrossProfitUSD: 0, // will be calculated below
            totalGrossMarginUSD: totalSalePriceUSD - totalFactoryCostUSD,
        };
    };

    const handleCalculate = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            const currentInputs = inputs[activeCountry];
            const { products } = currentInputs;
            
            const totalFactoryCostUSD = products.reduce((acc, p) => acc + ((parseInt(p.quantity, 10) || 0) * (parseFloat(p.price) || 0)), 0);
            if (totalFactoryCostUSD === 0 || Object.values(currentInputs).some(v => v === '' || (typeof v === 'string' && isNaN(parseFloat(v))))) {
                alert(t('alertMessage'));
                setLoading(false);
                return;
            }
            
            let calculatedResults: Omit<CalculationResults, 'productBreakdown' | 'totalQuantity'>;

            if (activeCountry === 'dubai') {
                calculatedResults = calculateDubai(inputs.dubai);
            } else {
                calculatedResults = calculateSerbia(inputs.serbia);
            }
            
            const totalQuantity = products.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);
            const perUnitGrossProfitUSD = totalQuantity > 0 ? calculatedResults.grossProfitUSD / totalQuantity : 0;

            const productBreakdown = products.map(p => {
                const itemFactoryPrice = (parseInt(p.quantity, 10) || 0) * (parseFloat(p.price) || 0);
                const proportionalSalePrice = totalFactoryCostUSD > 0 ? (itemFactoryPrice / totalFactoryCostUSD) * calculatedResults.totalSalePriceUSD : 0;
                return {
                    name: p.name,
                    factoryPrice: itemFactoryPrice,
                    finalSalePrice: proportionalSalePrice,
                };
            });

            setResults({
                ...calculatedResults,
                perUnitGrossProfitUSD,
                totalQuantity,
                productBreakdown,
            });

            setLoading(false);
        }, 500);
    }, [inputs, activeCountry, t]);
    
    const handleReset = useCallback(() => {
        setInputs(prev => ({
            ...prev,
            [activeCountry]: activeCountry === 'dubai' ? initialDubaiInputs : initialSerbiaInputs
        }));
        setResults(null);
    }, [activeCountry]);

    const toggleLanguage = () => {
        setLanguage(lang => lang === 'tr' ? 'en' : 'tr');
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-2 sm:p-4 md:p-6 font-sans">
            <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
                <header className="text-center mb-6 lg:mb-8 relative">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brandGreen-600 font-serif">{t('mainTitle')}</h1>
                    <p className="text-brandGold-500 mt-2 text-md sm:text-lg font-semibold">{t('mainSubtitle')}</p>
                    <button 
                        onClick={toggleLanguage}
                        className="absolute top-0 right-0 bg-transparent border-2 border-brandGreen-500 text-brandGreen-500 font-bold py-1 px-3 sm:py-2 sm:px-4 rounded-lg hover:bg-brandGreen-500 hover:text-white transition-colors duration-300 text-sm sm:text-base"
                    >
                        {language === 'tr' ? 'EN' : 'TR'}
                    </button>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-grow">
                    <InputForm
                        inputs={inputs}
                        activeCountry={activeCountry}
                        setActiveCountry={setActiveCountry}
                        onInputChange={handleInputChange} 
                        onProductChange={handleProductChange}
                        addProduct={addProduct}
                        removeProduct={removeProduct}
                        onCalculate={handleCalculate}
                        onReset={handleReset}
                        loading={loading}
                        t={t}
                    />
                    <ResultsDisplay results={results} t={t} />
                </main>

                <footer className="text-center mt-8 lg:mt-12 text-gray-500 text-sm">
                    <p>{t('footerDisclaimer')}</p>
                    <p>&copy; {new Date().getFullYear()} {t('footerCopyright')}</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
