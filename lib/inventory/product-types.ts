export const PRODUCT_TYPES = ['service', 'medicine', 'food', 'treats', 'accessory'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const STOCK_PRODUCT_TYPES = ['medicine', 'food', 'treats', 'accessory'] as const;
export type StockProductType = (typeof STOCK_PRODUCT_TYPES)[number];

const TYPE_LABELS: Record<ProductType, string> = {
  service: 'Service',
  medicine: 'Medicine',
  food: 'Food',
  treats: 'Treats',
  accessory: 'Accessory',
};

export const PRODUCT_TYPE_OPTIONS = PRODUCT_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

export const STOCK_PRODUCT_TYPE_OPTIONS = STOCK_PRODUCT_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));
