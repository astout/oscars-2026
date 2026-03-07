import { Outlet, useParams } from "react-router-dom";
import BottomNav from "./BottomNav.js";

export default function PartyLayout() {
  const { academyId } = useParams<{ academyId: string }>();
  if (!academyId) return null;

  return (
    <>
      <Outlet />
      <BottomNav academyId={academyId} />
    </>
  );
}
