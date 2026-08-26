import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Navbar from "@/components/Navbar";
import PlannerExperience from "@/components/PlannerExperience";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PlannerExperience />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
