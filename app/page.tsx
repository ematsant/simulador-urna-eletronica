'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export default function Urna() {
  const [numero, setNumero] = useState('');
  const [candidato, setCandidato] = useState<any>(null);
  const [votou, setVotou] = useState(false);
  const [erro, setErro] = useState('');

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
    const { data } = await supabase.from('candidatos').select('*').eq('numero', num).single();
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

  const confirma = useCallback(async () => {
    if (!numero && !erro) return;
    
    playSound('confirma'); 
    
    if (candidato) {
      await supabase.from('candidatos').update({ votos: candidato.votos + 1 }).eq('id', candidato.id);
    }
    
    setVotou(true);
    setTimeout(() => {
      setVotou(false);
      corrige();
    }, 4000);
  }, [numero, erro, candidato, corrige]);

  const branco = useCallback(() => {
    playSound('tecla');
    setNumero('');
    setCandidato(null);
    setErro('VOTO EM BRANCO');
  }, []);

  // SUPORTE AO TECLADO FÍSICO DO COMPUTADOR
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleTecla(e.key);
      } else if (e.key === 'Enter') {
        confirma();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        corrige();
      } else if (e.key.toLowerCase() === 'b') {
        branco();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTecla, confirma, corrige, branco]);

  return (
    // overflow-hidden impede que apareçam barras de rolagem estranhas quando o zoom estiver grande
    <div className="flex h-screen w-full items-center justify-center bg-gray-200 text-black overflow-hidden">
      
      {/* MAGIA DA RESPONSIVIDADE AQUI: O zoom varia automaticamente dependendo do tamanho da tela */}
      <div className="flex bg-gray-100 p-8 rounded-lg shadow-2xl border-4 border-gray-300 transform scale-50 sm:scale-75 md:scale-90 lg:scale-125 xl:scale-150 origin-center transition-transform duration-300">
        
        {/* RESOLVENDO O GLITCH DA LINHA: min-h-[420px] dá espaço suficiente para a foto grande respirar */}
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
                      <img 
                        src={supabase.storage.from('logos').getPublicUrl(candidato.imagem).data.publicUrl} 
                        alt="Logo da Chapa" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                  )}
                </div>
              )}
              {erro && <div className="text-2xl font-bold animate-pulse mt-4 text-black">{erro}</div>}

              <div className="border-t border-black pt-2 text-xs mt-auto text-black">
                Aperte a tecla:<br/>
                VERDE para CONFIRMAR | LARANJA para CORRIGIR<br/>
                <i>(Você também pode usar o teclado do PC)</i>
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