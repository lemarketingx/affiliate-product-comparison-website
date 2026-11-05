import {redirect} from 'next/navigation';
import {getCurrentUser} from '../../lib/supabase/server';
import AuthForm from '../sign-in/auth-form';
export const dynamic='force-dynamic';
export default async function Reset(){if(!await getCurrentUser())redirect('/sign-in');return <AuthForm ready recovery/>;}
