export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  tags: ('new' | 'sale')[];
  sizes?: string[];
  colors?: string[];
  stock: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type CartItem = {
  id: string;
  name:string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
};

export type Cart = {
  items: CartItem[];
};
