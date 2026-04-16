import { RemoteConsole } from "@/components/remote/remote-console";

type Props = {
  searchParams: Promise<{ room?: string | string[] }>;
};

function pickRoom(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "demo";
  return value?.trim() || "demo";
}

export default async function RemotePage({ searchParams }: Props) {
  const params = await searchParams;
  const room = pickRoom(params.room);
  return <RemoteConsole room={room} />;
}
