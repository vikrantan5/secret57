/**
 * Centralized pricing logic.
 * Use this helper across cart, checkout, payment, order summary, invoice.
 * Single source of truth — prevents amount mismatches between screens.
 */

export const GST_RATE = 0.18; // 18% GST
export const FREE_DELIVERY_THRESHOLD = 500; // ₹500 — free delivery above this
export const DELIVERY_CHARGE = 40; // ₹40 below threshold

export interface CartLineItem {
  price: number;
  quantity: number;
}

export interface OrderSummary {
  subtotal: number;
  gst: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  isFreeDelivery: boolean;
}

/**
 * Calculate full order summary for a list of cart items.
 * @param items Cart items (price + quantity)
 * @param discount Optional flat discount amount in rupees
 */
export function calculateOrderSummary(
  items: CartLineItem[] = [],
  discount = 0
): OrderSummary {
  const subtotal = (items || []).reduce(
    (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
    0
  );

  const gst = round2(subtotal * GST_RATE);

  const isFreeDelivery = items.length === 0 || subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryCharge = isFreeDelivery ? 0 : DELIVERY_CHARGE;

  const totalAmount = round2(subtotal + gst + deliveryCharge - (discount || 0));

  return {
    subtotal: round2(subtotal),
    gst,
    deliveryCharge,
    discount: round2(discount || 0),
    totalAmount,
    isFreeDelivery,
  };
}

/**
 * Same as calculateOrderSummary but takes a pre-computed subtotal.
 * Useful when subtotal is already in cart store.
 */
export function calculateSummaryFromSubtotal(
  subtotal: number,
  itemCount = 1,
  discount = 0
): OrderSummary {
  const sub = round2(subtotal || 0);
  const gst = round2(sub * GST_RATE);
  const isFreeDelivery = itemCount === 0 || sub >= FREE_DELIVERY_THRESHOLD;
  const deliveryCharge = isFreeDelivery ? 0 : DELIVERY_CHARGE;
  const totalAmount = round2(sub + gst + deliveryCharge - (discount || 0));

  return {
    subtotal: sub,
    gst,
    deliveryCharge,
    discount: round2(discount || 0),
    totalAmount,
    isFreeDelivery,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Map seller refund action → DB-compatible status value.
 * Keep frontend buttons stable (Approve / Reject / Processing / Refunded)
 * while sending the canonical lowercase tokens the DB CHECK constraint accepts.
 */
export const REFUND_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  REFUNDED: 'refunded',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];
