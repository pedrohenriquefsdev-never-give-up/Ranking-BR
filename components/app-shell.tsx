"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  FileImage,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Trophy,
  Sun,
  UploadCloud,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { Brand } from "./brand";
import { useTheme } from "./theme-provider";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/importar", label: "Importar relatório", icon: UploadCloud },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/equipes", label: "Equipes", icon: UsersRound },
  { href: "/executivos", label: "Executivos", icon: BarChart3 },
  { href: "/gerar-arte", label: "Gerar arte", icon: FileImage },
];

const titles: Record<string, { title: string; eyebrow: string }> = {
  "/dashboard": { title: "Visão geral", eyebrow: "Painel principal" },
  "/importar": { title: "Importar relatório", eyebrow: "Novo fechamento" },
  "/rankings": { title: "Rankings", eyebrow: "Desempenho e histórico" },
  "/equipes": { title: "Equipes", eyebrow: "Estrutura comercial" },
  "/executivos": { title: "Executivos", eyebrow: "Participantes" },
  "/gerar-arte": { title: "Gerar arte", eyebrow: "Comunicação" },
  "/usuarios": { title: "Usuários", eyebrow: "Controle de acesso" },
  "/configuracoes": { title: "Configurações", eyebrow: "Administração" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = titles[pathname] ?? titles["/dashboard"];

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (loading || !user) {
    return (
      <main className="screen-loader">
        <div className="loader-mark" />
        <p>Carregando o Ranking BR...</p>
      </main>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="app-frame">
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__top">
          <Brand />
          <button className="icon-button sidebar__close" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Menu principal">
          <span className="nav-label">Operação</span>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={`nav-item ${pathname === href ? "nav-item--active" : ""}`} href={href} key={href}>
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          ))}

          <span className="nav-label nav-label--spaced">Sistema</span>
          {user.perfil === "DEV" && (
            <Link className={`nav-item ${pathname === "/usuarios" ? "nav-item--active" : ""}`} href="/usuarios">
              <UserRoundCog size={19} strokeWidth={1.9} />
              <span>Usuários</span>
            </Link>
          )}
          <Link className={`nav-item ${pathname === "/configuracoes" ? "nav-item--active" : ""}`} href="/configuracoes">
            <Settings size={19} strokeWidth={1.9} />
            <span>Configurações</span>
          </Link>
        </nav>

        <div className="sidebar__footer">
          <div className="security-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Acesso protegido</strong>
              <span>Firebase Authentication</span>
            </div>
          </div>
          <span className="version">Ranking BR • v0.2.10</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__heading">
            <button className="icon-button menu-button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
              <Menu size={21} />
            </button>
            <div>
              <span className="eyebrow">{page.eyebrow}</span>
              <h1>{page.title}</h1>
            </div>
          </div>

          <div className="topbar__actions">
            {user.demo && <span className="demo-pill">Modo demonstração</span>}
            <button className="theme-switch" type="button" onClick={toggleTheme} aria-label={`Ativar tema ${theme === "light" ? "escuro" : "claro"}`} title={`Tema ${theme === "light" ? "escuro" : "claro"}`} aria-pressed={theme === "dark"}>
              <Sun size={15} />
              <span className="theme-switch__track"><span /></span>
              <Moon size={15} />
            </button>
            <div className="user-menu">
              <span className="avatar">{user.nome.slice(0, 1).toUpperCase()}</span>
              <span className="user-menu__copy">
                <strong>{user.nome}</strong>
                <small>{user.perfil === "DEV" ? "Desenvolvedor" : "Administrador"}</small>
              </span>
              <ChevronDown size={16} />
            </div>
            <button className="icon-button" aria-label="Sair" title="Sair" onClick={handleLogout}>
              <LogOut size={19} />
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
