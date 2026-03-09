import { useLocation, useNavigate } from "react-router-dom";
import { FilmSlate, ChartBar, Sparkle, GearSix } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

interface BottomNavProps {
  partyId: string;
}

interface TabDef {
  label: string;
  path: string;
  icon: Icon;
}

const tabs: TabDef[] = [
  { label: "Categories", path: "categories", icon: FilmSlate },
  { label: "Leaderboard", path: "leaderboard", icon: ChartBar },
  { label: "Wagers", path: "bonus", icon: Sparkle },
  { label: "Settings", path: "settings", icon: GearSix },
];

export default function BottomNav({ partyId }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/party/${partyId}`;

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
            <tab.icon size={22} weight={isActive ? "fill" : "regular"} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
