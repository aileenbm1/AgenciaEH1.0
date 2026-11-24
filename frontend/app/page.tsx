import SiteBlocks from "@/components/site-blocks";
import { featuredFor } from "@/lib/site-featured";
import { getSite } from "@/lib/site-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const site = await getSite();
  const blocks = site.pages.home || [];
  return <main><SiteBlocks blocks={blocks} site={site} featured={await featuredFor(blocks)} /></main>;
}
