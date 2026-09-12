/** Formata um número de telefone com máscara BR (ex: +55 (48) 9 99868-1137 ou +55 (48) 9 9986-8113). */
export function formatTelefone(val: string): string {
  if (!val) return "";
  const isExplicitInternational = val.startsWith("+");
  let digits = val.replace(/\D/g, "");
  if (!digits) return isExplicitInternational ? "+" : "";

  // Auto-prepend 55 for standard Brazil numbers without country code if they started typing DDD
  if (!isExplicitInternational && !digits.startsWith("55") && digits.length >= 2) {
    digits = "55" + digits;
  }

  if (digits.startsWith("55")) {
    const rest = digits.substring(2);
    if (rest.length === 0) return "+55";
    if (rest.length <= 2) return `+55 (${rest}`;
    if (rest.length <= 6) {
      return `+55 (${rest.substring(0, 2)}) ${rest.substring(2)}`;
    }
    if (rest.length <= 10) {
      return `+55 (${rest.substring(0, 2)}) ${rest.substring(2, 6)}-${rest.substring(6)}`;
    }
    if (rest.length <= 11) {
      return `+55 (${rest.substring(0, 2)}) ${rest.substring(2, 3)} ${rest.substring(3, 7)}-${rest.substring(7)}`;
    }
    return `+55 (${rest.substring(0, 2)}) ${rest.substring(2, 3)} ${rest.substring(3, 8)}-${rest.substring(8, 12)}`;
  }

  return "+" + digits;
}

/**
 * Gera as variações possíveis de um número (com/sem 55, com/sem nono dígito, apenas local).
 */
export function getPhoneVariations(raw: string): string[] {
  if (!raw) return [];
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return [];

  const set = new Set<string>([digits]);

  let without55 = digits;
  if (digits.startsWith("55") && digits.length >= 10) {
    without55 = digits.slice(2);
    set.add(without55);
  }

  // Se tem DDD + número (10 ou 11 dígitos)
  if (without55.length >= 10) {
    const ddd = without55.slice(0, 2);
    const rest = without55.slice(2);
    set.add(rest);

    // Se tem 9 dígitos começando com 9
    if (rest.length === 9 && rest.startsWith("9")) {
      const rest8 = rest.slice(1);
      set.add(rest8);
      set.add(ddd + rest8);
      set.add("55" + ddd + rest8);
    }
    // Se tem 8 dígitos (sem o 9 na frente)
    if (rest.length === 8) {
      const rest9 = "9" + rest;
      set.add(rest9);
      set.add(ddd + rest9);
      set.add("55" + ddd + rest9);
    }
  } else if (without55.length === 9 && without55.startsWith("9")) {
    set.add(without55.slice(1));
  } else if (without55.length === 8) {
    set.add("9" + without55);
  }

  return Array.from(set);
}

/**
 * Compara telefone cadastrado com o termo de busca de forma inteligente:
 * - Ignora máscaras (+, -, espaços, parênteses)
 * - Tolera presença ou ausência do 9º dígito móvel (ex: 9667 ou 99667 ou 48 9 9667 vs 48 9667)
 * - Tolera presença ou ausência de DDI (+55) e DDD (48)
 * - Encontra qualquer trecho (ex: 6709, 0905, 9667)
 */
export function matchesPhoneSearch(storedPhone: string, searchQuery: string): boolean {
  if (!searchQuery) return true;
  const qClean = searchQuery.trim();
  if (!qClean) return true;

  const qDigits = qClean.replace(/\D/g, "");

  // Se o usuário digitou letras (ex: nome do cliente acidentalmente no campo ou caracteres)
  if (!qDigits) {
    return String(storedPhone || "").toLowerCase().includes(qClean.toLowerCase());
  }

  const storedVars = getPhoneVariations(storedPhone);
  const queryVars = getPhoneVariations(qClean);

  // 1) Testar se qualquer variação da query é substring de qualquer variação armazenada
  for (const q of queryVars) {
    for (const s of storedVars) {
      if (s.includes(q)) return true;
    }
  }

  // 2) Caso especial onde query tem prefixo DDD + '9' + parte do número, mas stored não tem o 9
  if (qDigits.length >= 4) {
    const qSem9 = qDigits.slice(0, 2) + (qDigits[2] === "9" ? qDigits.slice(3) : qDigits.slice(2));
    const qSem55e9 =
      qDigits.startsWith("55") && qDigits.length >= 6
        ? qDigits.slice(0, 4) + (qDigits[4] === "9" ? qDigits.slice(5) : qDigits.slice(4))
        : null;

    for (const s of storedVars) {
      if (s.includes(qSem9)) return true;
      if (qSem55e9 && s.includes(qSem55e9)) return true;
    }
  }

  return false;
}

