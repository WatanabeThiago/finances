export type NavItem = {
  href: string;
  label: string;
  description?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início" },
  {
    href: "/servicos",
    label: "Serviços",
    description: "Catálogo e gestão dos serviços",
  },
  {
    href: "/produtos",
    label: "Produtos",
    description: "Catálogo de itens usados nos serviços",
  },
  {
    href: "/parceiros",
    label: "Parceiros",
    description: "Rede de parceiros e prestadores",
  },
  {
    href: "/vendas-lg",
    label: "Lead generation",
    description: "Captação e venda do serviço",
  },
  {
    href: "/daily-ads",
    label: "Google Ads",
    description: "Controle de gastos diários",
  },
  {
    href: "/tracking",
    label: "Tracking",
    description: "Análise do funil de vendas",
  },
];

export function navItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/vendas-lg") {
    return pathname === "/vendas-lg" || pathname.startsWith("/vendas-lg/");
  }
  if (href === "/daily-ads") {
    return pathname === "/daily-ads" || pathname.startsWith("/daily-ads/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve o título do header para rotas atuais e futuras aninhadas. */
export function titleForPathname(pathname: string): string {
  const ordered = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  for (const item of ordered) {
    if (navItemActive(pathname, item.href)) return item.label;
  }
  return "Negócio";
}
