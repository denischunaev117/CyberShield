import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  LayoutGrid,
  LifeBuoy,
  Menu,
  MessageCircle,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Library,
  ScanLine,
} from "lucide-react";
import { pageNames, type PageId } from "../features/types";
const groups: {
  title: string;
  items: { id: PageId; icon: typeof BookOpen }[];
}[] = [
  {
    title: "Практика и развитие",
    items: [
      { id: "practice", icon: LayoutGrid },
      { id: "collections", icon: BookOpen },
      { id: "diagnostics", icon: ClipboardList },
      { id: "learning-plan", icon: Route },
      { id: "progress", icon: TrendingUp },
    ],
  },
  {
    title: "Защита сейчас",
    items: [
      { id: "message-check", icon: Search },
      { id: "link-check", icon: ScanLine },
      { id: "emergency", icon: LifeBuoy },
    ],
  },
  {
    title: "Для сообщества",
    items: [
      { id: "classroom", icon: Users },
      { id: "references", icon: Library },
      { id: "share", icon: MessageCircle },
      { id: "guide", icon: BookOpen },
    ],
  },
];
export default function Navigation({
  page,
  onNavigate,
  onSettings,
}: {
  page: PageId;
  onNavigate: (page: PageId) => void;
  onSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function go(id: PageId) {
    setOpen(false);
    onNavigate(id);
  }
  const nav = (label: string) => (
    <nav aria-label={label}>
      {groups.map((g) => (
        <div className="navigation-group" key={g.title}>
          <div className="navigation-group-title">{g.title}</div>
          {g.items.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`nav-button ${page === id ? "selected" : ""} ${id === "emergency" ? "help-navigation" : ""}`}
              onClick={() => go(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={25} />
              <span className="nav-text">{pageNames[id]}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <aside className="sidebar desktop-sidebar">
        <a
          className="brand"
          href="#"
          aria-label="КиберЩит — к практике"
          onClick={(e) => {
            e.preventDefault();
            go("practice");
          }}
        >
          <span className="brand-icon">
            <ShieldCheck size={29} />
          </span>
          <span className="brand-name">КиберЩит</span>
          <span className="brand-dot" />
        </a>
        <div className="brand-caption">УВЕРЕННОСТЬ В ЦИФРОВОМ МИРЕ</div>
        {nav("Основная навигация")}
        <button className="nav-button settings-link" onClick={onSettings}>
          <Settings2 size={24} />
          <span className="nav-text">Настройки удобства</span>
        </button>
        <div className="made-for">Создано для Беларуси</div>
      </aside>
      <nav className="mobile-navigation" aria-label="Быстрая навигация">
        {[
          { id: "practice" as const, icon: LayoutGrid },
          { id: "collections" as const, icon: BookOpen },
          { id: "emergency" as const, icon: LifeBuoy },
          { id: "share" as const, icon: MessageCircle },
        ].map(({ id, icon: Icon }) => (
          <button
            key={id}
            aria-current={page === id ? "page" : undefined}
            onClick={() => go(id)}
          >
            <Icon size={23} />
            <span>
              {id === "emergency" ? "Мне нужна помощь" : pageNames[id]}
            </span>
          </button>
        ))}
        <button onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Menu size={23} />
          <span>Все разделы</span>
        </button>
      </nav>
      <dialog
        className="navigation-dialog"
        aria-label="Все разделы"
        ref={dialog}
        onCancel={() => setOpen(false)}
      >
        <div className="navigation-dialog-heading">
          <h2>Все разделы</h2>
          <button
            className="close-button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          >
            <X size={27} />
          </button>
        </div>
        {nav("Разделы приложения")}
        <button
          className="secondary"
          onClick={() => {
            setOpen(false);
            onSettings();
          }}
        >
          Настройки удобства
        </button>
      </dialog>
    </>
  );
}
