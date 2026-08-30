'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<'login'|'cadastro'>('login');
  const router = useRouter();

  const autenticar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) alert('Erro no cadastro: ' + error.message);
      else {
        alert('Cadastro realizado com sucesso! Fazendo login...');
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (!loginError) router.push('/urna');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) alert('Erro no login: ' + error.message);
      else router.push('/urna');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-black">
      <div className="p-8 bg-white border rounded shadow-lg max-w-sm w-full">
        <h2 className="mb-6 text-2xl font-bold text-center">
          {modo === 'login' ? 'Acesso ao Painel' : 'Nova Escola'}
        </h2>
        <form onSubmit={autenticar} className="flex flex-col gap-4">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail da Escola" className="border p-2 rounded" />
          <input required type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha (mínimo 6 caracteres)" className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">
            {modo === 'login' ? 'Entrar' : 'Cadastrar Escola'}
          </button>
        </form>
        <button onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')} className="mt-4 text-sm text-blue-600 underline w-full text-center">
          {modo === 'login' ? 'Sua escola não tem conta? Cadastre-se' : 'Já possui conta? Faça login'}
        </button>
      </div>
    </div>
  );
}