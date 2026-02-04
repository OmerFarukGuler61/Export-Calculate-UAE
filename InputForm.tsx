import React, { useMemo } from 'react';
import type { DubaiCalculationInputs, SerbiaCalculationInputs, ProductItem } from '../types';
import { PercentIcon } from './icons/PercentIcon';
import { ExchangeIcon } from './icons/ExchangeIcon';
import { TruckIcon } from './icons/TruckIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { translations } from '../translations';
import type { Country } from '../App';

interface InputFormProps {
    inputs: {
        dubai: DubaiCalculationInputs;
        serbia: SerbiaCalculationInputs;
    };
    activeCountry: Country;
    setActiveCountry: (country: Country) => void;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onProductChange: (id: string, field: keyof Omit<ProductItem, 'id'>, value: string) => void;
    addProduct: () => void;
    removeProduct: (id: string) => void;
    onCalculate: () => void;
    onReset: () => void;
    loading: boolean;
    t: (key: keyof typeof translations.tr) => string;
}

const formatCurrency = (value: number, currency: 'USD' | 'AED' | 'RSD') => {
    const options = { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
    let locale = 'en-US';
    if (currency === 'AED') locale = 'en-AE';
    if (currency === 'RSD') locale = 'sr-RS';
    return new Intl.NumberFormat(locale, options).format(value);
};


const DubaiInputForm: React.FC<Omit<InputFormProps, 'inputs' | 'activeCountry' | 'setActiveCountry'> & {inputs: DubaiCalculationInputs}> = ({ inputs, onInputChange, onProductChange, addProduct, removeProduct, onCalculate, onReset, loading, t }) => {
    const isFormValid = inputs.products.every(p => p.name && p.quantity && p.price && parseFloat(p.price) > 0 && parseInt(p.quantity, 10) > 0);

    const calculationMemos = useMemo(() => {
        const totalFactoryCostUSD = inputs.products.reduce((acc, p) => acc + ((parseInt(p.quantity, 10) || 0) * (parseFloat(p.price) || 0)), 0);
        const totalQuantity = inputs.products.reduce((acc, p) => acc + (parseInt(p.quantity, 10) || 0), 0);
        const profitMargin = parseFloat(inputs.profitMargin) / 100;
        const customsDutyRate = parseFloat(inputs.customsDutyRate) / 100;
        const shippingCostAED = parseFloat(inputs.fixedShippingCostAED);
        const exchangeRate = parseFloat(inputs.exchangeRate);

        if (isNaN(totalFactoryCostUSD) || isNaN(exchangeRate) || exchangeRate === 0) return {};
        
        const priceWithProfitUSD = !isNaN(profitMargin) ? totalFactoryCostUSD * (1 + profitMargin) : null;
        const priceWithProfitAED = priceWithProfitUSD ? priceWithProfitUSD * exchangeRate : null;
        
        const priceAfterCustomsUSD = (priceWithProfitUSD && !isNaN(customsDutyRate)) ? priceWithProfitUSD * (1 + customsDutyRate) : null;
        const priceAfterCustomsAED = priceAfterCustomsUSD ? priceAfterCustomsUSD * exchangeRate : null;

        const perUnitShippingCostUSD = (!isNaN(shippingCostAED) && totalQuantity > 0) ? (shippingCostAED / exchangeRate) / totalQuantity : null;
        
        return {
            profitHint: priceWithProfitUSD ? `${formatCurrency(priceWithProfitUSD, 'USD')} / ${formatCurrency(priceWithProfitAED, 'AED')}` : null,
            customsHint: priceAfterCustomsUSD ? `${formatCurrency(priceAfterCustomsUSD, 'USD')} / ${formatCurrency(priceAfterCustomsAED, 'AED')}` : null,
            shippingHint: perUnitShippingCostUSD ? `${formatCurrency(perUnitShippingCostUSD, 'USD')}` : null
        };
    }, [inputs]);

    return (
        <div className="flex flex-col gap-4">
            <ProductInputSection {...{ inputs, onProductChange, addProduct, removeProduct, t }} />
            <ParameterFieldsContainer>
                <ParameterField id="profitMargin" label={t('profitMarginLabel')} value={inputs.profitMargin} onChange={onInputChange} icon={<PercentIcon />}>
                    {calculationMemos.profitHint && <p>{t('profitIncludedPrice')}: <span className="font-bold text-black">{calculationMemos.profitHint}</span></p>}
                </ParameterField>
                <ParameterField id="customsDutyRate" label={t('customsDutyRateLabel')} value={inputs.customsDutyRate} onChange={onInputChange} icon={<ShieldIcon />}>
                    {calculationMemos.customsHint && <p>{t('totalValueWithCustoms')}: <span className="font-bold text-black">{calculationMemos.customsHint}</span></p>}
                </ParameterField>
                <ParameterField id="fixedShippingCostAED" label={t('fixedShippingCostAEDLabel')} value={inputs.fixedShippingCostAED} onChange={onInputChange} icon={<TruckIcon />}>
                    {calculationMemos.shippingHint && <p>{t('perUnitShippingCost')}: <span className="font-bold text-black">{calculationMemos.shippingHint}</span></p>}
                </ParameterField>
                <ParameterField id="melenRiskRate" label={t('melenRiskRateLabel')} value={inputs.melenRiskRate} onChange={onInputChange} icon={<PercentIcon />}/>
                <ParameterField id="exchangeRate" label={t('exchangeRateLabel')} value={inputs.exchangeRate} onChange={onInputChange} icon={<ExchangeIcon />}/>
            </ParameterFieldsContainer>
            <ActionButtons {...{ onCalculate, onReset, isFormValid, loading, t }} />
        </div>
    );
};

export const InputForm: React.FC<InputFormProps> = (props) => {
    const { activeCountry, setActiveCountry, t } = props;
    
    const renderForm = () => {
        if (activeCountry === 'dubai') {
            return <DubaiInputForm {...props} inputs={props.inputs.dubai} />;
        }
        if (activeCountry === 'serbia') {
             return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-gray-400 p-4">
                    <i className="fas fa-tools fa-3x mb-4 text-brandGold-500"></i>
                    <h3 className="text-lg font-semibold text-gray-700">{t('serbiaComingSoonTitle')}</h3>
                    <p className="text-sm mt-1">{t('serbiaComingSoonSubtitle')}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col">
            <div className="flex border-b-2 border-gray-200 mb-4">
                <TabButton title={t('dubaiTab')} isActive={activeCountry === 'dubai'} onClick={() => setActiveCountry('dubai')} />
                <TabButton title={t('serbiaTab')} isActive={activeCountry === 'serbia'} onClick={() => setActiveCountry('serbia')} />
            </div>
            {renderForm()}
        </div>
    );
};

// --- Reusable Sub-components ---

const TabButton: React.FC<{title: string; isActive: boolean; onClick: () => void}> = ({ title, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`py-2 px-4 text-sm sm:text-base font-semibold transition-colors duration-300 ${isActive ? 'border-b-2 border-brandGreen-500 text-brandGreen-600' : 'text-gray-500 hover:text-brandGreen-500'}`}
    >
        {title}
    </button>
);

const ParameterFieldsContainer: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
    </div>
);

const ParameterField: React.FC<{ id: string, label: string, value: string, icon: React.ReactNode, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, children?: React.ReactNode }> = ({ id, label, value, icon, onChange, children }) => (
    <div>
        <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-500 mb-2">
            {icon}
            <span className="ml-2">{label}</span>
        </label>
        <div className="relative">
            <input
                type="number"
                id={id}
                name={id}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brandGreen-500 focus:border-brandGreen-500 transition duration-200"
                value={value}
                onChange={onChange}
                min="0"
                step="any"
            />
        </div>
        {children && <div className="text-xs text-gray-500 mt-2 text-right">{children}</div>}
    </div>
);

const ActionButtons: React.FC<{onCalculate: () => void, onReset: () => void, isFormValid: boolean, loading: boolean, t: (key: keyof typeof translations.tr) => string }> = ({ onCalculate, onReset, isFormValid, loading, t }) => (
    <div className="mt-4 pt-6 border-t flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <button
            onClick={onCalculate}
            disabled={!isFormValid || loading}
            className="w-full bg-brandGreen-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-brandGreen-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandGreen-500 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
        >
            {loading ? <SpinnerIcon /> : <><i className="fas fa-calculator mr-2"></i> {t('calculateButton')}</>}
        </button>
         <button
            onClick={onReset}
            className="w-full bg-transparent border-2 border-brandGreen-600 text-brandGreen-600 font-bold py-3 px-6 rounded-lg hover:bg-brandGreen-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brandGreen-500 transition-all duration-300 flex items-center justify-center"
        >
            <i className="fas fa-sync-alt mr-2"></i>
            {t('resetButton')}
        </button>
    </div>
);

const ProductInputSection: React.FC<{
    inputs: { products: ProductItem[] };
    onProductChange: (id: string, field: keyof Omit<ProductItem, 'id'>, value: string) => void;
    addProduct: () => void;
    removeProduct: (id: string) => void;
    t: (key: keyof typeof translations.tr) => string;
}> = ({ inputs, onProductChange, addProduct, removeProduct, t }) => (
    <>
        <div className="space-y-4 pr-2 -mr-2 max-h-60 overflow-y-auto">
            {inputs.products.map((product, index) => (
                <div key={product.id} className="p-2 bg-gray-50 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-grow">
                             {index === 0 && <label className="text-xs text-gray-500">{t('productNameLabel')}</label>}
                            <input type="text" placeholder={t('productNamePlaceholder')} value={product.name} onChange={(e) => onProductChange(product.id, 'name', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md shadow-sm text-sm p-2"/>
                        </div>
                        <button onClick={() => removeProduct(product.id)} className="text-red-500 hover:text-red-700 disabled:opacity-50 self-end mb-1" disabled={inputs.products.length <= 1}>
                            <i className="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            {index === 0 && <label className="text-xs text-gray-500">{t('quantityLabel')}</label>}
                            <input type="number" placeholder="Adet" value={product.quantity} onChange={(e) => onProductChange(product.id, 'quantity', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md shadow-sm text-sm p-2" min="1"/>
                        </div>
                        <div className="flex-1">
                           {index === 0 && <label className="text-xs text-gray-500">{t('unitPriceLabel')}</label>}
                            <input type="number" placeholder={t('unitPricePlaceholder')} value={product.price} onChange={(e) => onProductChange(product.id, 'price', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md shadow-sm text-sm p-2" min="0"/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
         <button onClick={addProduct} className="mt-2 text-sm font-semibold text-brandGreen-600 hover:text-brandGreen-800 self-start">
            <i className="fas fa-plus mr-1"></i> {t('addProductButton')}
        </button>
    </>
);