'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState('');
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [numero, setNumero] = useState('');
  const [partido, setPartido] = useState('');
  const [arquivoLogo, setArquivoLogo] = useState<File | null>(null); 
  const [carregando, setCarregando] = useState(false);

  const login = () => {
    if (senha === (process.env.NEXT_PUBLIC_SENHA_ADMIN || 'gremio123')) {
      setAutenticado(true);
      carregarCandidatos();
    } else {
      alert('Senha incorreta');
    }
  };

  const carregarCandidatos = async () => {
    const { data } = await supabase.from('candidatos').select('*').order('votos', { ascending: false });
    if (data) setCandidatos(data);
  };

  // CONFIGURAÇÃO DO REALTIME: Atualiza os votos em tempo real sem precisar atualizar a página
  useEffect(() => {
    if (!autenticado) return;

    carregarCandidatos();

    const channel = supabase
      .channel('tabela-candidatos-mudancas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidatos' },
        () => {
          carregarCandidatos(); // Recarrega a lista automaticamente quando houver voto ou alteração
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autenticado]);

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    let caminhoImagem = '';

    if (arquivoLogo) {
      const fileExt = arquivoLogo.name.split('.').pop();
      const fileName = `${numero}-${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('logos').upload(fileName, arquivoLogo);

      if (error) {
        alert('Erro ao fazer upload da imagem: ' + error.message);
        setCarregando(false);
        return;
      }
      caminhoImagem = data.path; 
    }

    const { error: erroBanco } = await supabase.from('candidatos').insert([{ numero, partido, imagem: caminhoImagem }]);
    
    if (erroBanco) {
      alert('O banco de dados bloqueou o cadastro: ' + erroBanco.message);
    } else {
      alert('✅ Chapa cadastrada com sucesso!');
      setNumero(''); setPartido(''); setArquivoLogo(null);
      const fileInput = document.getElementById('foto-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = '';
    }
    
    setCarregando(false);
  };

  const deletar = async (id: number, imagemPath: string) => {
    if(confirm('Tem certeza que deseja excluir esta chapa?')) {
      if (imagemPath) {
        await supabase.storage.from('logos').remove([imagemPath]);
      }
      await supabase.from('candidatos').delete().eq('id', id);
    }
  };

  const zerarEleicao = async () => {
    if(confirm('⚠️ ALERTA MÁXIMO: Isso apagará TODAS as chapas e zerará todos os votos. Deseja continuar?')) {
      const { error } = await supabase.from('candidatos').delete().neq('id', 0);
      if (error) {
        alert('Erro ao zerar eleição: ' + error.message);
      } else {
        alert('Eleição zerada com sucesso!');
      }
    }
  };

  if (!autenticado) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="p-6 bg-white border rounded shadow">
          <h2 className="mb-4 text-xl text-black font-bold">Acesso Restrito</h2>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="border p-2 w-full mb-4 text-black" placeholder="Senha do gestor" />
          <button onClick={login} className="bg-blue-600 text-white px-4 py-2 w-full rounded font-bold">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Gestão da Eleição</h1>
      
      <form onSubmit={cadastrar} className="bg-gray-100 p-6 rounded mb-8 grid grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm text-black font-bold">Número (2 dígitos)</label>
          <input required maxLength={2} value={numero} onChange={(e) => setNumero(e.target.value)} className="border p-2 w-full text-black bg-white" />
        </div>
        <div>
          <label className="block text-sm text-black font-bold">Nome da Chapa</label>
          <input required value={partido} onChange={(e) => setPartido(e.target.value)} className="border p-2 w-full text-black bg-white" />
        </div>
        <div>
          <label className="block text-sm text-black font-bold">Logo (Opcional)</label>
          <input id="foto-upload" type="file" accept="image/*" onChange={(e) => setArquivoLogo(e.target.files?.[0] || null)} className="border p-1 w-full text-black bg-white" />
        </div>
        <button type="submit" disabled={carregando} className={`text-white p-2 rounded font-bold ${carregando ? 'bg-gray-400' : 'bg-green-600'}`}>
          {carregando ? 'Salvando...' : 'Cadastrar Chapa'}
        </button>
      </form>

      <h2 className="text-2xl font-bold mb-4">Resultados (Em Tempo Real 🟢)</h2>
      <table className="w-full text-left border-collapse mb-8 bg-white">
        <thead>
          <tr className="bg-gray-300">
            <th className="p-3 border text-black font-bold">Número</th>
            <th className="p-3 border text-black font-bold">Chapa</th>
            <th className="p-3 border text-black font-bold">Votos</th>
            <th className="p-3 border text-black font-bold">Ação</th>
          </tr>
        </thead>
        <tbody>
          {candidatos.map(c => (
            <tr key={c.id} className="bg-white hover:bg-gray-50">
              <td className="p-3 border font-bold text-black text-lg">{c.numero}</td>
              <td className="p-3 border text-black text-lg">{c.partido}</td>
              <td className="p-3 border font-bold text-blue-600 text-xl">{c.votos}</td>
              <td className="p-3 border">
                <button onClick={() => deletar(c.id, c.imagem)} className="text-red-600 text-sm font-bold uppercase hover:underline">Excluir</button>
              </td>
            </tr>
          ))}
          {candidatos.length === 0 && (
            <tr className="bg-white">
              <td colSpan={4} className="p-4 text-center text-gray-500 font-bold">Nenhuma chapa cadastrada.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="border-t pt-6 text-right">
        <button onClick={zerarEleicao} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded shadow">
          🗑️ Apagar Todas as Chapas e Zerar Votos
        </button>
      </div>
    </div>
  );
}