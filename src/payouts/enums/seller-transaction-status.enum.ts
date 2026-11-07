export enum SellerTransactionStatus {
  PENDING_CLEARANCE = 'PENDING_CLEARANCE', // Inside 14-day hold period
  AVAILABLE = 'AVAILABLE',                 // Cleared after 14 days, ready for payout
  PAID_OUT = 'PAID_OUT',                   // Paid to seller bank/Stripe account
  REFUNDED = 'REFUNDED',                   // Deducted due to customer refund
}
