import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { authConfigured } from "../../../lib/dealpilot/auth";
import { Brand } from "../../public-shell";
import { LoginButton } from "../auth-controls";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="dp-login">
      <div className="dp-login-card">
        <Brand />
        <h1>
          מקום שקט לנהל
          <br />
          את הגילוי הבא.
        </h1>
        <p>
          כניסה פרטית למנהל DealPilot. הגישה מותרת לחשבונות GitHub שאושרו בלבד.
        </p>
        {params.error && (
          <div role="alert" className="dp-notice">
            הכניסה לא הושלמה. ודאו שהחשבון מורשה ונסו שוב.
          </div>
        )}
        {authConfigured() ? (
          <LoginButton />
        ) : (
          <div className="dp-notice">
            <ShieldCheck />
            <strong> ההתחברות טרם הוגדרה</strong>
            <p>
              נדרשת הגדרת OAuth ורשימת מנהלים מורשים בסביבת השרת. אין כניסה
              באמצעות מפתח בדיקת API.
            </p>
          </div>
        )}
        <p className="dp-auth-note">
          אין הרשמה ציבורית. ההזדהות מתבצעת אצל GitHub ללא שמירת סיסמה
          ב־DealPilot.
        </p>
        <Link className="dp-text-link" href="/">
          חזרה לאתר
        </Link>
      </div>
    </main>
  );
}
