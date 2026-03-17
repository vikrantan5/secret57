import { create } from 'zustand';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  calculateTotal: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) => {
    const { items } = get();
    const existingItem = items.find((i) => i.id === item.id);

    if (existingItem) {
      set({
        items: items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      });
    } else {
      set({ items: [...items, item] });
    }
    get().calculateTotal();
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    get().calculateTotal();
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    }));
    get().calculateTotal();
  },

  clearCart: () => set({ items: [], total: 0 }),

  calculateTotal: () => {
    const { items } = get();
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    set({ total });
  },
}));
