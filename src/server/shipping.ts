import crypto from 'crypto';
import { config } from './config';

export interface ShippingProvider {
  createShipment(orderId: string, orderData: any): Promise<{
    shipmentId: string;
    trackingNumber: string;
    carrier: string;
    labelUrl: string;
  }>;
}

export class DefaultShippingProvider implements ShippingProvider {
  async createShipment(orderId: string, orderData: any) {
    if (!config.shipping.isConfigured) {
      if (config.env === 'production') {
        throw new Error('Shipping provider not configured in production. Cannot create shipment.');
      }
      
      console.warn('SHIPPING_API_KEY is missing. Using Mock Shipping Provider in dev/test mode.');
      
      return {
        shipmentId: `mock_shp_${crypto.randomBytes(8).toString('hex')}`,
        trackingNumber: `MOCKTRK${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        carrier: 'MockShip Express',
        labelUrl: `/mock-label/${orderId}.pdf`
      };
    }

    // Stub for actual implementation
    throw new Error("Shipping integration requires implementation with real SDK (e.g. Shippo/EasyPost).");
  }
}
