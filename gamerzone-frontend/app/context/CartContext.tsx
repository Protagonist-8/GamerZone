"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";

export type CartItem = {
  gameId: number;
  gameName: string;
  consoleId: number;
  price: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (gameId: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addToCart(item: CartItem) {
    setItems((currentItems) => {
      const alreadyExists = currentItems.some(
        (existingItem) =>
          existingItem.gameId === item.gameId &&
          existingItem.consoleId === item.consoleId
      );

      if (alreadyExists) {
        return currentItems;
      }

      return [...currentItems, item];
    });
  }

  function removeFromCart(gameId: number) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.gameId !== gameId
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}
