export interface PatientProfileShape {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  sex?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  profileCompletedAt?: string | null;
  shippingAddress?: {
    recipientName?: string | null;
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
  } | null;
}

export function isPatientProfileComplete(profile?: PatientProfileShape | null): boolean {
  if (!profile) return false;
  if (profile.profileCompletedAt) return true;

  const address = profile.shippingAddress;
  const pinOk = /^\d{6}$/.test(address?.postalCode || '');
  return Boolean(
    profile.firstName?.trim() &&
    profile.lastName?.trim() &&
    profile.phoneNumber?.trim() &&
    profile.dateOfBirth &&
    profile.sex &&
    Number(profile.heightCm) > 0 &&
    Number(profile.weightKg) > 0 &&
    address?.recipientName?.trim() &&
    address?.line1?.trim() &&
    address?.city?.trim() &&
    address?.state?.trim() &&
    pinOk &&
    (address?.country || 'India') === 'India'
  );
}