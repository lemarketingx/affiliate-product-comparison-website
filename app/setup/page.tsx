import {redirect} from 'next/navigation';
import {getCurrentUser} from '../../lib/supabase/server';
import Setup from './setup';
export const dynamic='force-dynamic';
export default async function SetupPage(){if(!await getCurrentUser())redirect('/sign-in?next=%2Fsetup');return <Setup/>;}
