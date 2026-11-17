import RealtimeTryOn from "@/components/realtime-try-on";

export default async function TryOnPage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const { productId = "" } = await searchParams;
  return <RealtimeTryOn productId={productId} />;
}
