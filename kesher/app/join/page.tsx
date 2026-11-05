import Join from "./join";
import { getChatGPTUser } from "../chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function JoinPage() {
  const user = await getChatGPTUser();
  return <Join user={user ? { name: user.fullName ?? "", email: user.email } : null}/>;
}
