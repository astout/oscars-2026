import { useLocation, useNavigate } from "react-router-dom";
import { ChartBar, Sparkle, GearSix } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import OscarStatuette from "./OscarStatuette.js";

interface BottomNavProps {
  academyId: string;
}

interface TabDef {
  label: string;
  path: string;
  icon?: Icon;
  custom?: true;
}

const tabs: TabDef[] = [
  { label: "Categories", path: "categories", custom: true },
  { label: "Leaderboard", path: "leaderboard", icon: ChartBar },
  { label: "Bonus", path: "bonus", icon: Sparkle },
  { label: "Settings", path: "settings", icon: GearSix },
];

export default function BottomNav({ academyId }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/party/${academyId}`;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const fullPath = `${basePath}/${tab.path}`;
        const isActive = location.pathname.startsWith(fullPath);
        return (
          <button
            key={tab.path}
            className={`nav-tab ${isActive ? "nav-tab-active" : ""}`}
            onClick={() => navigate(fullPath)}
          >
            {tab.custom ? (
              <OscarStatuette
                size={22}
                style={{ opacity: isActive ? 1 : 0.5 }}
              />
            ) : (
              tab.icon && <tab.icon size={22} weight={isActive ? "fill" : "regular"} />
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
