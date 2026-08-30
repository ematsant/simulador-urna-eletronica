'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function UrnaContent() {
  const [numero, setNumero] = useState('');
  const [candidato, setCandidato] = useState<any>(null);
  const [votou, setVotou] = useState(false);
  const [erro, setErro] = useState('');
  
  // Estados de Segurança e Controle Remoto
  const [statusUrna, setStatusUrna] = useState('bloqueada');
  const [escolaId, setEscolaId] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const cabineId = parseInt(searchParams.get('cabine') || '1');

  // 1. Verifica se a escola está logada e registra a Urna no banco
  useEffect(() => {
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/'; 
        return;
      }
      
      const userEscola = session.user.id;
      setEscolaId(userEscola);

      const { data } = await supabase
        .from('controle_urnas')
        .select('status')
        .eq('escola_id', userEscola)
        .eq('numero_cabine', cabineId)
        .single();

      if (data) {
        setStatusUrna(data.status);
      } else {
        await supabase.from('controle_urnas').insert({
          escola_id: userEscola,
          numero_cabine: cabineId,
          status: 'bloqueada'
        });
      }
    };
    setup();
  }, [cabineId]);

  // 2. Realtime: Fica "escutando" o seu celular de forma BLINDADA
  useEffect(() => {
    if (!escolaId) return;

    const channel = supabase
      .channel(`urna-${cabineId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'controle_urnas', filter: `escola_id=eq.${escolaId}` },
        (payload) => {
          if (!payload.new.numero_cabine || payload.new.numero_cabine === cabineId) {
            setStatusUrna(payload.new.status);
            
            if (payload.new.status === 'liberada') {
              setNumero('');
              setCandidato(null);
              setErro('');
              setVotou(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [escolaId, cabineId]);

  const playSound = (tipo: 'tecla' | 'confirma') => {
    const audio = new Audio(`/${tipo}.mp3`);
    audio.play().catch(() => {}); 
  };

  const handleTecla = useCallback((valor: string) => {
    if (votou || numero.length >= 2) return;
    playSound('tecla');
    setNumero((prev) => prev + valor);
  }, [votou, numero]);

  useEffect(() => {
    if (numero.length === 2) {
      buscarCandidato(numero);
    }
  }, [numero]);

  const buscarCandidato = async (num: string) => {
    const { data } = await supabase
      .from('candidatos')
      .select('*')
      .eq('numero', num)
      .eq('escola_id', escolaId) 
      .single();
      
    if (data) {
      setCandidato(data);
      setErro('');
    } else {
      setCandidato(null);
      setErro('VOTO NULO');
    }
  };

  const corrige = useCallback(() => {
    playSound('tecla');
    setNumero('');
    setCandidato(null);
    setErro('');
  }, []);

  const branco = useCallback(() => {
    playSound('tecla');
    setNumero('');
    setCandidato(null);
    setErro('VOTO EM BRANCO');
  }, []);

  const confirma = useCallback(async () => {
    if (!numero && !erro) return;
    playSound('confirma'); 
    
    if (candidato) {
      await supabase.from('candidatos').update({ votos: candidato.votos + 1 }).eq('id', candidato.id);
    }
    
    setVotou(true);
    
    setTimeout(async () => {
      await supabase.from('controle_urnas')
        .update({ status: 'bloqueada' })
        .eq('escola_id', escolaId)
        .eq('numero_cabine', cabineId);
    }, 3000);
  }, [numero, erro, candidato, escolaId, cabineId]);

  useEffect(() => {
    if (statusUrna === 'bloqueada') return; 
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleTecla(e.key);
      else if (e.key === 'Enter') confirma();
      else if (e.key === 'Backspace' || e.key === 'Delete') corrige();
      else if (e.key.toLowerCase() === 'b') branco();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTecla, confirma, corrige, branco, statusUrna]);

  // --------------------------------------------------------
  // Função de Logout Corrigida (Força a saída)
  // --------------------------------------------------------
  const fazerLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; 
  };

  if (statusUrna === 'bloqueada') {
    return (
      // 👇 A mágica do gradiente acontece aqui na classe bg-gradient-to-br 👇
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white relative">
        <button 
          onClick={fazerLogout} 
          className="absolute top-8 right-8 bg-gray-700 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-colors border-2 border-gray-600"
        >
          Sair da Conta
        </button>

        <div className="text-center bg-gray-800 p-12 rounded-xl shadow-2xl border-4 border-gray-600">
          <div className="text-6xl mb-6 animate-pulse">🔴</div>
          <h1 className="text-4xl font-bold mb-4">Urna Bloqueada</h1>
          <p className="text-xl text-gray-300">Aguardando autorização do mesário...</p>
          <p className="mt-4 text-sm text-gray-500 font-bold">Cabine {cabineId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-200 text-black overflow-hidden">
      <div className="flex bg-gray-100 p-8 rounded-lg shadow-2xl border-4 border-gray-300 transform scale-50 sm:scale-75 md:scale-90 lg:scale-125 xl:scale-150 origin-center transition-transform duration-300">
        
        <div className="w-[450px] min-h-[420px] bg-gray-50 border-2 border-gray-400 p-6 flex flex-col justify-between">
          {votou ? (
            <div className="flex-1 flex items-center justify-center text-5xl font-bold text-black">FIM</div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold uppercase text-black">Seu voto para</p>
                <h2 className="text-2xl font-bold text-center mt-2 text-black">Grêmio Estudantil</h2>
              </div>
              
              <div className="flex items-center space-x-2 my-2">
                <span className="text-sm text-black">Número:</span>
                <div className="flex space-x-1">
                  <div className="w-8 h-10 border border-black flex items-center justify-center text-2xl font-bold text-black bg-white">{numero[0] || ''}</div>
                  <div className="w-8 h-10 border border-black flex items-center justify-center text-2xl font-bold text-black bg-white">{numero[1] || ''}</div>
                </div>
              </div>

              {candidato && (
                <div className="flex justify-between items-start w-full">
                  <div className="text-sm mt-4">
                    <p className="text-xl text-black">Chapa: <b className="font-bold text-2xl">{candidato.partido}</b></p>
                  </div>
                  {candidato.imagem && (
                    <div className="w-44 h-44 border border-black p-1 bg-white ml-2 flex-shrink-0">
                      <img src={supabase.storage.from('logos').getPublicUrl(candidato.imagem).data.publicUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              )}
              {erro && <div className="text-2xl font-bold animate-pulse mt-4 text-black">{erro}</div>}

              <div className="border-t border-black pt-2 text-xs mt-auto text-black">
                Aperte a tecla:<br/>
                VERDE para CONFIRMAR | LARANJA para CORRIGIR
              </div>
            </>
          )}
        </div>

        <div className="w-[250px] bg-gray-800 ml-6 p-4 rounded-md flex flex-col justify-end">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => handleTecla(num.toString())} className="bg-gray-900 text-white p-3 text-xl font-bold rounded shadow-sm shadow-black active:translate-y-1">{num}</button>
            ))}
            <div className="col-start-2">
              <button onClick={() => handleTecla('0')} className="bg-gray-900 text-white w-full p-3 text-xl font-bold rounded shadow-sm shadow-black active:translate-y-1">0</button>
            </div>
          </div>
          <div className="flex space-x-2 h-12">
            <button onClick={branco} className="bg-white flex-1 text-xs font-bold uppercase rounded shadow-sm shadow-black active:translate-y-1 text-black">Branco</button>
            <button onClick={corrige} className="bg-orange-500 flex-1 text-xs font-bold uppercase rounded shadow-sm shadow-black active:translate-y-1 text-black">Corrige</button>
            <button onClick={confirma} className="bg-green-500 flex-1 text-xs font-bold uppercase rounded shadow-sm shadow-black active:translate-y-1 h-14 -mt-2 text-black">Confirma</button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Urna() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white bg-gray-900">Carregando urna...</div>}>
      <UrnaContent />
    </Suspense>
  );
}