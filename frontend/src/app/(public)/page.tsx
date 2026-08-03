import CovenantHero from "@/components/home/CovenantHero";
import Padadhikari from "@/components/home/Padadhikari";
import Ledger from "@/components/home/Ledger";
import Gallery from "@/components/home/Gallery";
import Testament from "@/components/home/Testament";
import Join from "@/components/home/Join";

export default function HomePage() {
  return (
    // No overflow-x here: `overflow-x: hidden` computes overflow-y to `auto`,
    // which turns this into a scroll container and freezes the hero's sticky
    // stage. Horizontal bleed is clipped on <body> with `clip` instead.
    <div className="flex w-full flex-col bg-paper">
      <CovenantHero />
      <Padadhikari />
      <Ledger />
      <Gallery />
      <Testament />
      <Join />
    </div>
  );
}
