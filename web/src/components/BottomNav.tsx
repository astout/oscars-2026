import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, ChartBar, Sparkle, GearSix } from "@phosphor-icons/react";

interface BottomNavProps {
  academyId: string;
}

const tabs = [
  { label: "Categories", icon: Trophy, path: "categories" },
  { label: "Leaderboard", icon: ChartBar, path: "leaderboard" },
  { label: "Bonus", icon: Sparkle, path: "bonus" },
  { label: "Settings", icon: GearSix, path: "settings" },
] as const;

export default function BottomNav({ academyId }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/party/${academyId}`;

  return (
    <nav className="bottom-nav">
      {tabs.map(({ label, icon: Icon, path }) => {
        const fullPath = `${basePath}/${path}`;
        const isActive = location.pathname.startsWith(fullPath);
        return (
          <button
            key={path}
            className={`nav-tab ${isActive ? "nav-tab-active" : ""}`}
            onClick={() => navigate(fullPath)}
          >
            <Icon size={22} weight={isActive ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
