import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { matchPath, NavLink, Outlet, useLocation } from "react-router-dom";
import { FaAngleDown, FaAngleLeft, FaAngleRight, FaSignOutAlt } from "react-icons/fa";
import logo from "@/shared/assets/arno_logo.png";
import { useAuth } from "@/features/auth";
import { NAV_SECTIONS, type NavSection } from "@/features/layout/nav-links";
import { duration, ease, pageTransition, pageVariants, pageVariantsReduced } from "@/shared/lib/motion";
import type { Period } from "@/shared/hooks/use-period";
import PeriodControl from "@/shared/ui/PeriodControl";
import "@/shared/styles/layout.css";

const SIDEBAR_KEY = "arno.sidebar-collapsed";
const SECTIONS_KEY = "arno.sidebar-sections";

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

function sectionMatchesPath(section: NavSection, pathname: string) {
  return section.items.some((link) => matchPath({ path: link.to, end: link.end ?? false }, pathname));
}

function readOpenSections(sectionIds: string[], activeId?: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, boolean>;
      const next: Record<string, boolean> = {};
      for (const id of sectionIds) {
        next[id] = saved[id] ?? id === activeId;
      }
      if (activeId) next[activeId] = true;
      return next;
    }
  } catch {
    /* ignore */
  }
  return Object.fromEntries(sectionIds.map((id) => [id, id === activeId]));
}

function persistOpenSections(open: Record<string, boolean>) {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(open));
  } catch {
    /* ignore quota / private mode */
  }
}

export default function Layout({ year, month, setYear, setMonth }: Period) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { user, name, role, logout } = useAuth();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((link) => role && link.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
  const activeSectionId = sections.find((section) => sectionMatchesPath(section, location.pathname))?.id;
  const sectionKey = sections.map((section) => section.id).join("|");
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    readOpenSections(
      sections.map((section) => section.id),
      sections.find((section) => sectionMatchesPath(section, location.pathname))?.id,
    ),
  );
  const roleLabel = role === "admin" ? "Administrador" : "Tesoureiro";
  const navId = useId();
  const animatePanels = !collapsed && !reduceMotion;

  useEffect(() => {
    const ids = sectionKey.split("|").filter(Boolean);
    if (ids.length === 0) return;
    setOpenSections((current) => {
      const needsHydrate = ids.some((id) => !(id in current));
      if (needsHydrate) {
        const next = readOpenSections(ids, activeSectionId);
        persistOpenSections(next);
        return next;
      }
      if (activeSectionId && !current[activeSectionId]) {
        const next = { ...current, [activeSectionId]: true };
        persistOpenSections(next);
        return next;
      }
      return current;
    });
  }, [activeSectionId, sectionKey]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }

  function toggleSection(id: string) {
    setOpenSections((current) => {
      const next = { ...current, [id]: !current[id] };
      persistOpenSections(next);
      return next;
    });
  }

  return (
    <div className={`shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar__brand">
          <img src={logo} alt="" />
          <span>
            <strong>Arno Friedrich</strong>
            <small>Tesouraria · 43 RS</small>
          </span>
        </div>
        <button
          type="button"
          className="sidebar__toggle"
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={toggleCollapsed}
        >
          {collapsed ? <FaAngleRight /> : <FaAngleLeft />}
        </button>
        <nav id="sidebar-nav" aria-label="Tesouraria">
          {sections.map((section) => {
            const panelId = `${navId}-${section.id}`;
            const isOpen = collapsed || Boolean(openSections[section.id]);
            const isActiveSection = section.id === activeSectionId;
            const SectionIcon = section.icon;
            const itemCount = section.items.length;
            const toggleHint = isOpen ? "Recolher" : "Expandir";

            return (
              <div
                key={section.id}
                className={`side-section${isOpen ? " is-open" : ""}${isActiveSection ? " is-active" : ""}`}
              >
                {collapsed ? (
                  <div className="side-section__marker" title={section.label} aria-hidden>
                    <SectionIcon />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="side-section__toggle"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    title={`${toggleHint} ${section.label}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="side-section__heading">
                      <SectionIcon className="side-section__icon" aria-hidden />
                      <span className="side-section__label">{section.label}</span>
                      <span className="side-section__count" aria-hidden>
                        {itemCount}
                      </span>
                    </span>
                    <FaAngleDown className="side-section__chevron" aria-hidden />
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      className="side-section__panel"
                      role="group"
                      aria-label={section.label}
                      initial={animatePanels ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={
                        animatePanels
                          ? {
                              height: 0,
                              opacity: 0,
                              transition: {
                                height: { duration: 0.28, ease },
                                opacity: { duration: 0.16, ease },
                              },
                            }
                          : { height: "auto", opacity: 1, transition: { duration: 0 } }
                      }
                      transition={
                        animatePanels
                          ? {
                              height: { duration: 0.32, ease },
                              opacity: { duration: duration.fast, ease, delay: 0.02 },
                            }
                          : { duration: 0 }
                      }
                      style={{ overflow: "hidden" }}
                    >
                      <div className="side-section__links">
                        {section.items.map((link) => (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            title={link.label}
                            className={({ isActive }) => `side-link ${isActive ? "is-active" : ""}`}
                          >
                            <link.icon />
                            <span className="side-link__label">{link.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
        <div className="sidebar__foot">
          <small className="muted sidebar__user" style={{ color: "rgba(244,241,234,.7)" }}>
            {name ?? user}
            <br />
            {roleLabel}
          </small>
          <button className="btn btn-outline" type="button" onClick={logout} title="Sair">
            <FaSignOutAlt />
            <span className="sidebar__foot-label">Sair</span>
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div>
            <strong>Grupo Escoteiro Arno Friedrich</strong>
            <div className="muted">Área administrativa da tesouraria</div>
          </div>
          <div className="topbar__period">
            <PeriodControl year={year} month={month} setYear={setYear} setMonth={setMonth} />
          </div>
        </div>
        <div className="content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-transition"
              variants={reduceMotion ? pageVariantsReduced : pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Outlet context={{ year, month, setYear, setMonth }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
