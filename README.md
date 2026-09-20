# Forma Vale · Solicitação de Materiais e Contratos

Central de atendimento e solicitações de materiais da **Forma Vale**. Esta aplicação permite o envio de solicitações, geração automática de comprovantes em PDF e gerenciamento seguro dos documentos.

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js**: v18+ 
- **npm** ou **yarn**

### Passo a Passo

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Executar em modo de desenvolvimento**:
   ```bash
   npm run dev
   ```

3. **Gerar build de produção**:
   ```bash
   npm run build
   ```

---

## 🛠️ Publicação na Vercel

O projeto conta com suporte nativo para funções serverless na Vercel através das rotas `/api/*` e `/subdata-online`.

### 1. Conectar Repositório
1. Acesse [vercel.com/new](https://vercel.com/new).
2. Selecione o repositório **`contatoagenciabs-dev/Forma-Vale`** (ou o seu fork/repositório equivalente).
3. Selecione a branch **`main`**.

### 2. Configurações do Projeto na Vercel
- **Framework Preset**: `Vite`
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## 🔐 Estrutura de Arquivos SubData Protegida

- **Salvação Protegida**: Todos os comprovantes e contratos anexados são armazenados com isolamento de segurança na pasta `/subdata/documentos/{protocolo}/`.
- **Acesso Administrativo**:
  - Painel Web: `/subdata-online` (Exige a senha de administrador `Liberdade26`)
  - API Rest: `/api/subdata/listar?senha=Liberdade26`

---

## 📄 Licença

Propriedade exclusiva da **Forma Vale**. Todos os direitos reservados.
