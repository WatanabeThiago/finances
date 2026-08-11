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
