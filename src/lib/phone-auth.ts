const CLEANER_AUTH_DOMAIN = "shalean.co.za";

export function normalizeSouthAfricanPhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");

  if (/^0\d{9}$/.test(compact)) {
    return compact;
  }

  if (/^\+27\d{9}$/.test(compact)) {
    return `0${compact.slice(3)}`;
  }

  if (/^27\d{9}$/.test(compact)) {
    return `0${compact.slice(2)}`;
  }

  return null;
}

export function isValidSouthAfricanPhone(value: string) {
  return Boolean(normalizeSouthAfricanPhone(value));
}

export function cleanerAuthEmailFromPhone(value: string) {
  const phone = normalizeSouthAfricanPhone(value);

  if (!phone) {
    return null;
  }

  return `${phone}@${CLEANER_AUTH_DOMAIN}`;
}

export function isPhoneLoginIdentifier(value: string) {
  return Boolean(normalizeSouthAfricanPhone(value));
}
