'use server';

export async function validarSenhaAdmin(senhaDigitada: string) {
  // 1. Atraso proposital de 3 segundos (Proteção contra Força Bruta)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 2. Verificação da senha
  const senhaCorreta = process.env.SENHA_ADMIN;
  
  return senhaDigitada === senhaCorreta;
}