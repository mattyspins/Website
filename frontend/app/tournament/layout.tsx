import "@/styles/tournament-theme.css";
import { bebasNeue, manrope } from "@/lib/tournamentFonts";

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`tournament-theme ${bebasNeue.variable} ${manrope.variable}`}>
      {children}
    </div>
  );
}
