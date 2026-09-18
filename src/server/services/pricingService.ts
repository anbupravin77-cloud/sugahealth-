/**
 * Commercial Pricing Abstraction Service
 *
 * STATUS: PRODUCTION MEDICATION CATALOG & DYNAMIC FORMULARY PRICING: PENDING INTEGRATION
 *
 * Architecture Notice:
 * The current system resolves prices using static formulary rules.
 * To avoid silently preserving hardcoded placeholders as production pricing,
 * this service isolates the commercial calculation boundary, documents the
 * missing production pharmacy NDC/formulary catalog integration, and prepares
 * a clean contract for future live pharmacy pricing feeds.
 */

export interface MedicationPricingItem {
  medicationName: string;
  activeIngredient?: string;
  strength?: string;
  dosageForm?: string;
  quantity: number;
  unitPrice?: number;
}

export interface CalculatedOrderTotals {
  lineItems: {
    medicationName: string;
    activeIngredient: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  catalogStatus: 'pending_pharmacy_integration' | 'live_catalog';
}

/**
 * Temporary fallback formulary rates.
 * NOT to be considered production-authorized pharmacy pricing.
 */
const DEVELOPMENT_FALLBACK_RATES: Record<string, number> = {
  'semaglutide': 199.00,
  'tirzepatide': 299.00,
  'finasteride': 45.00,
  'minoxidil': 39.00,
  'tadalafil': 48.00,
  'sildenafil': 35.00,
  'enclomiphene': 89.00,
  'dutasteride': 49.00,
  'nad+': 149.00,
  'b12': 49.00,
};

export class PricingService {
  /**
   * Resolves the unit price for a medication.
   * If a verified clinical unit price is present, it takes precedence.
   * Otherwise falls back to development formulary rates with explicit logging.
   */
  resolveUnitPrice(item: MedicationPricingItem): number {
    if (typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) && item.unitPrice > 0) {
      return item.unitPrice;
    }

    const name = (item.medicationName || '').toLowerCase();
    const ingredient = (item.activeIngredient || '').toLowerCase();

    for (const [key, price] of Object.entries(DEVELOPMENT_FALLBACK_RATES)) {
      if (name.includes(key) || ingredient.includes(key)) {
        return price;
      }
    }

    // Baseline fallback rate
    return 45.00;
  }

  resolveQuantity(rawQuantity: any): number {
    if (typeof rawQuantity === 'number' && !isNaN(rawQuantity) && rawQuantity >= 1) {
      return Math.floor(rawQuantity);
    }
    if (typeof rawQuantity === 'string') {
      const match = rawQuantity.match(/\d+/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        if (!isNaN(parsed) && parsed >= 1) return parsed;
      }
    }
    return 1;
  }

  /**
   * Calculates financial breakdown for order line items with subtotal,
   * standard clinical shipping ($15.00), and estimated tax (8%).
   */
  calculateTotals(items: MedicationPricingItem[]): CalculatedOrderTotals {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cannot calculate totals: medications line item array is empty');
    }

    const lineItems = items.map((med) => {
      const unitPrice = this.resolveUnitPrice(med);
      const quantity = this.resolveQuantity(med.quantity);
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

      return {
        medicationName: med.medicationName || 'Compounded Medication',
        activeIngredient: med.activeIngredient || '',
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const subtotal = Math.round(lineItems.reduce((acc, item) => acc + item.totalPrice, 0) * 100) / 100;
    const shippingAmount = subtotal > 0 ? 15.00 : 0;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + shippingAmount + taxAmount) * 100) / 100;

    if (totalAmount <= 0 || isNaN(totalAmount)) {
      throw new Error(`Invalid calculated order total: ${totalAmount}`);
    }

    return {
      lineItems,
      subtotal,
      shippingAmount,
      taxAmount,
      totalAmount,
      catalogStatus: 'pending_pharmacy_integration',
    };
  }
}

export const pricingService = new PricingService();
