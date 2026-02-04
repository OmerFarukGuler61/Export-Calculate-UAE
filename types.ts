export interface ProductItem {
    id: string;
    name: string;
    quantity: string;
    price: string;
}

export interface DubaiCalculationInputs {
    products: ProductItem[];
    profitMargin: string;
    customsDutyRate: string;
    fixedShippingCostAED: string;
    exchangeRate: string;
    melenRiskRate: string;
}

export interface SerbiaCalculationInputs {
    products: ProductItem[];
    profitMargin: string;
    customsDutyRate: string;
    fixedShippingCostRSD: string;
    exchangeRateRSD: string;
    vatRate: string;
}

export interface CalculationResults {
    totalFactoryCostUSD: number;
    totalSalePriceUSD: number;
    totalSalePriceSecondaryCurrency: number;
    secondaryCurrencyCode: 'AED' | 'RSD';
    grossProfitUSD: number;
    costIncreaseRate: number;
    totalExpenses: number; 
    productBreakdown: {
        name: string;
        factoryPrice: number;
        finalSalePrice: number;
    }[];
    shippingAndCustomsCostUSD: number;
    perUnitGrossProfitUSD: number;
    totalGrossMarginUSD: number;
    totalQuantity: number;
}