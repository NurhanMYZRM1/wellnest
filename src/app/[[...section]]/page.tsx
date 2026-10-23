import WellnessApp from "@/components/wellness-app";
import { pages } from "@/lib/wellness";

// One URL per section so refresh and shared links keep the current section;
// any other path is a 404.
export const generateStaticParams = () => [
  { section: [] },
  ...pages.map((p) => ({ section: [p] })),
];
export const dynamicParams = false;

export default function Home() {
  return <WellnessApp />;
}
