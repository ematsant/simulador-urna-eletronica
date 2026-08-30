'use server';

export async function validarSenhaAdmin(senhaDigitada: string) {
  // Como este arquivo tem 'use server', ele consegue ler a SENHA_ADMIN com total segurança
  const senhaOficial = process.env.SENHA_ADMIN;
  
  // Retorna verdadeiro se a senha estiver certa, e falso se estiver errada
  return senhaDigitada === senhaOficial;
}