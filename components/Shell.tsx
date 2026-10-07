"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenText, Boxes, CircleGauge, DatabaseZap, Gavel, Menu, Route, X } from "lucide-react";
import { useState } from "react";

const nav = [
  ["/", "Network", CircleGauge], ["/publishers", "Publishers", DatabaseZap], ["/covenants", "Covenants", BookOpenText],
  ["/cases", "Decision lab", Gavel], ["/mandates", "Mandates", Route], ["/service", "Service", Boxes],
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="shell">
    <aside className={open ? "rail open" : "rail"}>
      <div className="brand"><span className="brandMark"><Activity size={19}/></span><div><strong>VERIDUCT</strong><small>covenant network</small></div><button className="mobileClose" onClick={() => setOpen(false)}><X/></button></div>
      <nav>{nav.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={path === href ? "active" : ""}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div className="railFoot"><span className="pulse"/>Studionet · 61999</div>
    </aside>
    <main><header className="topbar"><button className="mobileMenu" onClick={() => setOpen(true)}><Menu/></button><div className="crumb">Consensus operations / <b>{nav.find(x => x[0] === path)?.[1] || "Workspace"}</b></div><div className="networkChip"><span/>FINALITY MODE</div></header>{children}</main>
  </div>;
}
