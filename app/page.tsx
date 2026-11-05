import Portal from './portal';
import { getCurrentUser } from '../lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Home(){return <Portal signedIn={!!await getCurrentUser()}/>;}
