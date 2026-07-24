import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-8">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-soft ring-1 ring-black/5">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-700">Codepath</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">Entrar</h1>
        <p className="mt-2 text-sm text-slate-500">
          Informe seu email e enviaremos um link para acessar o dashboard. Sem senha.
        </p>

        {error && <p className="mt-4 text-sm font-bold text-red-600">{decodeURIComponent(error)}</p>}

        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
