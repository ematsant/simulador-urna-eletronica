'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { validarSenhaAdmin } from './actions'; 

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

  // Atualização em Tempo Real
  useEffect(() => {
    if (!escolaId || !autenticado) return;

    const channel = supabase
      .channel('mudancas-votos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidatos', filter: `escola_id=eq.${escolaId}` },
        () => {
          carregarCandidatos(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escolaId, autenticado]);

  // --- FUNÇÕES DE LOGIN LOCAL (TRAVA DO MESÁRIO 100% SEGURA) ---
  const entrarPainel = async () => {
    const senhaValida = await validarSenhaAdmin(senhaLocal);
    
    if (senhaValida) {
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

  // 👇 Função de criar cabine separada corretamente 👇
  const adicionarCabine = async () => {
    const num = prompt('Digite o número da nova cabine que deseja criar (ex: 1, 2, 3):');
    if (!num) return;
    
    const { error } = await supabase.from('controle_urnas').insert({
      escola_id: escolaId,
      numero_cabine: parseInt(num),
      status: 'bloqueada'
    });

    if (error) {
      alert('Erro ao criar cabine: ' + error.message);
    } else {
      alert(`✅ Cabine ${num} criada com sucesso! Você já pode acessá-la usando /urna?cabine=${num}`);
    }
  };

  // --- RENDERIZAÇÃO DAS TELAS ---
  if (!escolaId) {
    return <div className="flex h-screen items-center justify-center text-white bg-slate-900">Verificando autenticação da escola...</div>;
  }

  // TELA DE TRAVA DO MESÁRIO 
  if (!autenticado) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900">
        <div className="p-8 bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl max-w-sm w-full relative">
          <button onClick={logoutTotal} className="absolute top-4 right-4 text-sm text-red-400 font-bold hover:text-red-300 transition-colors">Sair da Escola</button>
          <h2 className="mb-4 text-2xl text-white font-bold text-center mt-4">Acesso do Mesário</h2>
          <p className="text-sm text-gray-300 mb-4 text-center">Digite a senha de gestão para acessar a urna.</p>
          <input 
            type="password" 
            value={senhaLocal} 
            onChange={(e) => setSenhaLocal(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && entrarPainel()}
            className="border border-slate-600 bg-slate-900 p-3 w-full mb-4 text-white rounded focus:border-cyan-500 outline-none" 
            placeholder="Senha secreta..." 
          />
          <button onClick={entrarPainel} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 w-full rounded-lg transition-colors">
            Destrancar Painel
          </button>
        </div>
      </div>
    );
  }

  // PAINEL DE GESTÃO LIBERADO 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestão da Eleição</h1>
          <button onClick={trancarPainel} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            🔒 Trancar Painel
          </button>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md p-6 rounded-xl shadow-2xl mb-8 border border-slate-600 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Controle de dispositivos</h2>
          <div className="flex justify-center gap-4">
            <button onClick={liberarUrnas} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-xl flex-1 transition-transform active:scale-95">
              🟢 LIBERAR PRÓXIMO VOTO
            </button>
            <button onClick={bloquearUrnas} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-lg shadow-lg text-xl flex-1 transition-transform active:scale-95">
              🔴 BLOQUEAR URNAS
            </button>
          </div>
          
          {/* 👇 Botão Adicionar Cabine no lugar certo 👇 */}
          <button onClick={adicionarCabine} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-8 rounded-lg shadow-lg text-lg mt-4 transition-transform active:scale-95">
            ➕ Adicionar Nova Cabine
          </button>
        </div>

        <form onSubmit={cadastrar} className="bg-slate-800/60 backdrop-blur-md p-6 rounded-xl mb-8 grid grid-cols-4 gap-4 items-end border border-slate-600">
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-1">Número (2 dígitos)</label>
            <input required maxLength={2} value={numero} onChange={(e) => setNumero(e.target.value)} className="border border-slate-600 p-2 w-full text-white bg-slate-900 rounded focus:border-cyan-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-1">Nome da Chapa</label>
            <input required value={partido} onChange={(e) => setPartido(e.target.value)} className="border border-slate-600 p-2 w-full text-white bg-slate-900 rounded focus:border-cyan-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-1">Logo (Opcional)</label>
            <input id="foto-upload" type="file" accept="image/*" onChange={(e) => setArquivoLogo(e.target.files?.[0] || null)} className="border border-slate-600 p-1 w-full text-white bg-slate-900 rounded" />
          </div>
          <button type="submit" disabled={carregando} className={`text-white p-2 rounded font-bold h-[42px] transition-colors ${carregando ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {carregando ? 'Salvando...' : 'Cadastrar Chapa'}
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          Resultados (Em Tempo Real <span className="animate-pulse">🟢</span>)
        </h2>
        
        <div className="overflow-hidden rounded-xl border border-slate-600 shadow-2xl mb-8">
          <table className="w-full text-left border-collapse bg-slate-800/60 backdrop-blur-md">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="p-4 border-b border-slate-600 text-gray-200 font-bold">Número</th>
                <th className="p-4 border-b border-slate-600 text-gray-200 font-bold">Chapa</th>
                <th className="p-4 border-b border-slate-600 text-gray-200 font-bold text-center">Votos</th>
                <th className="p-4 border-b border-slate-600 text-gray-200 font-bold text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map(c => (
                <tr key={c.id} className="hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0">
                  <td className="p-4 font-bold text-lg text-white">{c.numero}</td>
                  <td className="p-4 text-lg text-white">{c.partido}</td>
                  <td className="p-4 font-bold text-cyan-400 text-2xl text-center">{c.votos}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => deletar(c.id, c.imagem)} className="text-red-400 text-sm font-bold uppercase hover:text-red-300 transition-colors">Excluir</button>
                  </td>
                </tr>
              ))}
              {candidatos.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">Nenhuma chapa cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2 text-right">
          <button onClick={zerarEleicao} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors">
            🗑️ Apagar Todas as Chapas e Zerar Votos
          </button>
        </div>

      </div>
    </div>
  );
}