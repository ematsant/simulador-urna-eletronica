'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Admin() {
  // 1. Estados de Autenticação
  const [escolaId, setEscolaId] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [senhaLocal, setSenhaLocal] = useState('');

  // 2. Estados de Dados
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [numero, setNumero] = useState('');
  const [partido, setPartido] = useState('');
  const [arquivoLogo, setArquivoLogo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Verifica se a escola está logada no Supabase
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/'; 
        return;
      }
      setEscolaId(session.user.id);
    };
    checkAuth();
  }, []);

  // Carrega as chapas APENAS quando o mesário colocar a senha corretamente
  useEffect(() => {
    if (escolaId && autenticado) {
      carregarCandidatos();
    }
  }, [escolaId, autenticado]);

  const carregarCandidatos = async () => {
    const { data } = await supabase
      .from('candidatos')
      .select('*')
      .eq('escola_id', escolaId)
      .order('votos', { ascending: false });
    if (data) setCandidatos(data);
  };

  // 🟢 A MÁGICA DO TEMPO REAL RESTAURADA AQUI 🟢
  useEffect(() => {
    if (!escolaId || !autenticado) return;

    const channel = supabase
      .channel('mudancas-votos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidatos', filter: `escola_id=eq.${escolaId}` },
        () => {
          carregarCandidatos(); // Atualiza a tabela na hora sem precisar de F5!
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escolaId, autenticado]);
  // ------------------------------------------------

  // --- FUNÇÕES DE LOGIN LOCAL (TRAVA DO MESÁRIO) ---
  const entrarPainel = () => {
    if (senhaLocal === (process.env.NEXT_PUBLIC_SENHA_ADMIN || 'gremio123')) {
      setAutenticado(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const trancarPainel = () => {
    setAutenticado(false);
    setSenhaLocal(''); 
  };

  const logoutTotal = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // --- FUNÇÕES DE CADASTRO E CONTROLE ---
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

    const { error: erroBanco } = await supabase.from('candidatos').insert([{
      numero,
      partido,
      imagem: caminhoImagem,
      escola_id: escolaId
    }]);

    if (erroBanco) {
      alert('Erro ao cadastrar: ' + erroBanco.message);
    } else {
      alert('✅ Chapa cadastrada com sucesso!');
      setNumero(''); setPartido(''); setArquivoLogo(null);
      const fileInput = document.getElementById('foto-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      carregarCandidatos();
    }

    setCarregando(false);
  };

  const deletar = async (id: number, imagemPath: string) => {
    if (confirm('Tem certeza que deseja excluir esta chapa?')) {
      if (imagemPath) await supabase.storage.from('logos').remove([imagemPath]);
      await supabase.from('candidatos').delete().eq('id', id);
      carregarCandidatos();
    }
  };

  const zerarEleicao = async () => {
    if (confirm('⚠️ ALERTA MÁXIMO: Isso apagará TODAS as chapas e zerará todos os votos desta escola. Deseja continuar?')) {
      const { error } = await supabase.from('candidatos').delete().eq('escola_id', escolaId);
      if (error) alert('Erro ao zerar eleição: ' + error.message);
      else {
        alert('Eleição zerada com sucesso!');
        carregarCandidatos();
      }
    }
  };

  const liberarUrnas = async () => {
    const { error } = await supabase.from('controle_urnas').update({ status: 'liberada' }).eq('escola_id', escolaId);
    if (error) alert('Erro ao liberar urnas: ' + error.message);
    else alert('🟢 Sinal enviado! A urna está liberada.');
  };

  const bloquearUrnas = async () => {
    const { error } = await supabase.from('controle_urnas').update({ status: 'bloqueada' }).eq('escola_id', escolaId);
    if (error) alert('Erro ao bloquear urnas: ' + error.message);
    else alert('🔴 Urnas bloqueadas com sucesso!');
  };

  // --- RENDERIZAÇÃO DAS TELAS ---
  if (!escolaId) {
    return <div className="flex h-screen items-center justify-center text-white bg-gray-900">Verificando autenticação da escola...</div>;
  }

  if (!autenticado) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="p-8 bg-white border rounded shadow max-w-sm w-full relative">
          <button onClick={logoutTotal} className="absolute top-4 right-4 text-sm text-red-600 font-bold hover:underline">Sair da Escola</button>
          <h2 className="mb-4 text-2xl text-black font-bold text-center mt-4">Acesso do Mesário</h2>
          <p className="text-sm text-gray-600 mb-4 text-center">Digite a senha de gestão para acessar a urna.</p>
          <input 
            type="password" 
            value={senhaLocal} 
            onChange={(e) => setSenhaLocal(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && entrarPainel()}
            className="border-2 border-gray-300 p-3 w-full mb-4 text-black rounded focus:border-blue-500 outline-none" 
            placeholder="Senha secreta..." 
          />
          <button onClick={entrarPainel} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 w-full rounded transition-colors">
            Destrancar Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestão da Eleição</h1>
        <button onClick={trancarPainel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          🔒 Trancar Painel
        </button>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg shadow-2xl mb-8 border-4 border-gray-700 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Controle das Cabines</h2>
        <div className="flex justify-center gap-4">
          <button onClick={liberarUrnas} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-xl flex-1 transition-transform active:scale-95">
            🟢 LIBERAR PRÓXIMO VOTO
          </button>
          <button onClick={bloquearUrnas} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-xl flex-1 transition-transform active:scale-95">
            🔴 BLOQUEAR URNAS
          </button>
        </div>
      </div>

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
        <button type="submit" disabled={carregando} className={`text-white p-2 rounded font-bold ${carregando ? 'bg-gray-400' : 'bg-blue-600'}`}>
          {carregando ? 'Salvando...' : 'Cadastrar Chapa'}
        </button>
      </form>

      <h2 className="text-2xl font-bold mb-4">Resultados (Em Tempo Real 🟢)</h2>
      <table className="w-full text-left border-collapse mb-8 bg-white shadow">
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