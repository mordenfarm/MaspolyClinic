export const normalizeZimbabwePhone = (value: FormDataEntryValue | string | null | undefined): string => {
  const raw = String(value || '').replace(/\D/g, '');
  if (!raw) return '';
  if (raw.startsWith('263')) return `+${raw}`;
  if (raw.startsWith('0')) return `+263${raw.slice(1)}`;
  return `+263${raw}`;
};

export const whatsappLink = (phone: string | undefined, message: string): string => {
  const normalized = normalizeZimbabwePhone(phone);
  const digits = normalized.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
