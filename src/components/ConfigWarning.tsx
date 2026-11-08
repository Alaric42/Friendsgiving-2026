export function ConfigWarning() {
  return (
    <div className="m-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      Supabase isn&apos;t configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart or redeploy.
    </div>
  );
}
