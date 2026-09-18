export * from './types';
export * from './profileRepository';
export * from './consultationRepository';
export * from './clinicalNoteRepository';
export * from './prescriptionRepository';
export * from './orderRepository';
export * from './paymentEventRepository';
export * from './documentRepository';
export * from './messageRepository';
export * from './notificationRepository';
export * from './subscriptionRepository';
export * from './auditRepository';

import { profileRepository } from './profileRepository';
import { consultationRepository } from './consultationRepository';
import { clinicalNoteRepository } from './clinicalNoteRepository';
import { prescriptionRepository } from './prescriptionRepository';
import { orderRepository } from './orderRepository';
import { paymentEventRepository } from './paymentEventRepository';
import { documentRepository } from './documentRepository';
import { messageRepository } from './messageRepository';
import { notificationRepository } from './notificationRepository';
import { subscriptionRepository } from './subscriptionRepository';
import { auditRepository } from './auditRepository';

export const repositories = {
  profiles: profileRepository,
  consultations: consultationRepository,
  clinicalNotes: clinicalNoteRepository,
  prescriptions: prescriptionRepository,
  orders: orderRepository,
  paymentEvents: paymentEventRepository,
  documents: documentRepository,
  messages: messageRepository,
  notifications: notificationRepository,
  subscriptions: subscriptionRepository,
  audit: auditRepository,
};
