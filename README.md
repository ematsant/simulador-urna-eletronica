# Simulador de Urna Eletrônica 🗳️

Um projeto web de simulador da urna eletrônica brasileira, desenvolvido para fins educacionais e para ser utilizado em votações de Grêmio Estudantil nas escolas[cite: 1, 2].

## 📖 Sobre o Projeto

Este projeto foi criado com o objetivo de imitar o formato, os sons e a interface de uma urna eletrônica real[cite: 1, 2]. Ele serve não apenas como uma ferramenta prática, moderna e segura para as eleições escolares[cite: 1, 2], mas também como um meio interativo de educar os alunos sobre como funciona o processo de votação no Brasil[cite: 1, 2]. 

## ✨ Funcionalidades

- **Interface Realista**: O layout foi projetado para simular o visor e o teclado da urna original[cite: 1].
- **Interatividade e Acessibilidade**: 
  - Os botões possuem um efeito visual de clique ("afundar")[cite: 1].
  - Emite os clássicos sons de digitação e o som longo de confirmação de voto[cite: 1, 2].
  - Suporte total para digitação através do teclado físico do computador.
- **Lógica de Votação Completa**: 
  - Reconhece o número da chapa (2 dígitos) e exibe o nome e a logo em tempo real[cite: 1, 2].
  - Suporta as opções de **VOTO EM BRANCO** e **VOTO NULO**[cite: 1, 2].
  - Botões de **CORRIGE** e **CONFIRMA** totalmente funcionais[cite: 1, 2].
- **Painel de Administração Restrito**:
  - Acesso protegido por senha para os gestores da escola.
  - Cadastro de chapas com número, nome e upload de imagem (logo) direto para a nuvem[cite: 1, 2].
  - Contagem de votos atualizada em tempo real[cite: 1].
  - Opções para excluir chapas individualmente ou zerar toda a eleição para um novo pleito[cite: 1].

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando uma arquitetura web moderna e escalável:
- **Next.js / React**: Framework principal para a construção da interface e rotas.
- **Tailwind CSS**: Para estilização rápida, responsiva e efeitos visuais.
- **Supabase**: Backend como serviço (BaaS) utilizado para:
  - **Database (PostgreSQL)**: Armazenamento seguro das chapas e contagem de votos[cite: 2, 3].
  - **Storage**: Armazenamento em nuvem das fotos/logos das chapas[cite: 1].
  - **Realtime**: Atualização instantânea dos resultados no painel de gestão.

## 🚀 Como executar o projeto localmente

Para rodar este projeto na sua máquina, você precisará do Node.js instalado e de um projeto configurado no Supabase.

1. Faça o clone deste repositório.
2. Abra o terminal na pasta do projeto e instale as dependências:
   ```bash
   npm install