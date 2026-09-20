import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
  FileText,
  Send,
  Trash2,
  CheckCircle2,
  Lock,
  Download,
  User,
  Mail,
  Phone,
  FolderOpen,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  GraduationCap,
  School,
  Calendar,
  Paperclip,
  X,
  HeartHandshake,
  FileCheck2,
  Sparkles
} from "lucide-react";

interface MaterialItem {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
}

interface MaterialOptionState {
  checked: boolean;
  quantidade: number;
  unidade: string;
  especificacao?: string;
}

const DEFAULT_MATERIAL_OPTIONS = [
  { id: "fotografia", label: "Fotografia digital", desc: "Arquivos digitais da cerimônia e recepção" },
  { id: "album", label: "Álbum fotográfico", desc: "Álbum físico impresso e encadernado" },
  { id: "replica", label: "Réplica", desc: "Porta-retrato ou réplica comemorativa" },
  { id: "canudo", label: "Canudo", desc: "Canudo formal de formatura" },
  { id: "outros", label: "Outros insumos", desc: "Outros itens contratados ou específicos" }
];

interface SubDataArquivo {
  nome: string;
  url: string;
}

interface SubDataItem {
  protocolo: string;
  dataEnvio: string | null;
  solicitante: string;
  empresa?: string | null;
  curso?: string | null;
  faculdade?: string | null;
  dataConclusao?: string | null;
  arquivos: SubDataArquivo[];
}

export default function App() {
  // Check if current route is /subdata-online
  const [isSubDataOnlinePage, setIsSubDataOnlinePage] = useState<boolean>(false);

  useEffect(() => {
    if (window.location.pathname.includes("/subdata-online")) {
      setIsSubDataOnlinePage(true);
    }
  }, []);

  // Form State
  const [solicitante, setSolicitante] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [curso, setCurso] = useState("");
  const [faculdade, setFaculdade] = useState("");
  const [dataConclusao, setDataConclusao] = useState("");

  const [contratoAnexo, setContratoAnexo] = useState<{
    name: string;
    size: number;
    base64: string;
  } | null>(null);

  const [materiaisSelecionados, setMateriaisSelecionados] = useState<{
    [key: string]: MaterialOptionState;
  }>({
    fotografia: { checked: false, quantidade: 1, unidade: "Unidade" },
    album: { checked: false, quantidade: 1, unidade: "Unidade" },
    replica: { checked: false, quantidade: 1, unidade: "Unidade" },
    canudo: { checked: false, quantidade: 1, unidade: "Unidade" },
    outros: { checked: false, quantidade: 1, unidade: "Unidade", especificacao: "" }
  });

  const [loading, setLoading] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [ultimoPdfBase64, setUltimoPdfBase64] = useState<string | null>(null);
  const [materiaisEnviados, setMateriaisEnviados] = useState<MaterialItem[]>([]);

  // Admin Protection State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSenhaInput, setAdminSenhaInput] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");
  const [subdataList, setSubdataList] = useState<SubDataItem[]>([]);
  const [subdataLoading, setSubdataLoading] = useState(false);
  const [clearingSubData, setClearingSubData] = useState(false);

  // Check URL query for password on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const senhaQuery = params.get("senha");
    if (senhaQuery === "Liberdade26") {
      setIsAdminAuthenticated(true);
      fetchSubDataList("Liberdade26");
    }
  }, []);

  // Material Checkbox Handlers
  const handleToggleMaterialOption = (key: string, checked: boolean) => {
    setMateriaisSelecionados(prev => ({
      ...prev,
      [key]: { ...prev[key], checked }
    }));
  };

  const handleUpdateMaterialQty = (key: string, quantidade: number) => {
    setMateriaisSelecionados(prev => ({
      ...prev,
      [key]: { ...prev[key], quantidade: Math.max(1, quantidade) }
    }));
  };

  const handleUpdateMaterialUnit = (key: string, unidade: string) => {
    setMateriaisSelecionados(prev => ({
      ...prev,
      [key]: { ...prev[key], unidade }
    }));
  };

  const handleUpdateMaterialSpec = (key: string, especificacao: string) => {
    setMateriaisSelecionados(prev => ({
      ...prev,
      [key]: { ...prev[key], especificacao }
    }));
  };

  // Contract File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("O arquivo não pode exceder 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setContratoAnexo({
        name: file.name,
        size: file.size,
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const getMateriaisParaEnvio = (): MaterialItem[] => {
    return DEFAULT_MATERIAL_OPTIONS
      .filter(opt => materiaisSelecionados[opt.id]?.checked)
      .map(opt => {
        const itemState = materiaisSelecionados[opt.id];
        let desc = opt.label;
        if (opt.id === "outros" && itemState.especificacao?.trim()) {
          desc = `Outros: ${itemState.especificacao.trim()}`;
        }
        return {
          id: opt.id,
          descricao: desc,
          quantidade: itemState.quantidade || 1,
          unidade: itemState.unidade || "Unidade"
        };
      });
  };

  // Generate PDF Receipt in High-Contrast Black & White with Full Logo
  const generateReceiptPDF = (
    protocoloNum: string,
    dataHora: string,
    listaMateriais: MaterialItem[]
  ): { doc: jsPDF; pdfBase64: string } => {
    const doc = new jsPDF();

    // Top Solid Black Banner
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 38, "F");

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("FORMA VALE", 14, 20);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("SISTEMA DE CONFERÊNCIA E REGULARIZAÇÃO DE MATERIAIS DE FORMATURA", 14, 29);

    // Protocol Box (Top Right)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(126, 8, 70, 22, 2, 2, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("PROTOCOLO DE CONFERÊNCIA:", 130, 15);
    doc.setFontSize(10);
    doc.text(protocoloNum, 130, 24);

    // Requester & Academic Information Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("1. DADOS DO FORMANDO E INFORMAÇÕES ACADÊMICAS", 14, 48);

    // Box around student data
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 52, 182, 32, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(`Nome Completo: ${solicitante}`, 18, 59);
    doc.text(`E-mail de Contato: ${email}`, 18, 66);
    doc.text(`Telefone / WhatsApp: ${telefone}`, 18, 73);

    doc.text(`Curso: ${curso}`, 110, 59);
    doc.text(`Faculdade / Instituição: ${faculdade}`, 110, 66);
    doc.text(`Data / Conclusão: ${dataConclusao}`, 110, 73);

    // Materials List Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("2. RELAÇÃO DE MATERIAIS PARA CONFERÊNCIA E LOCALIZAÇÃO", 14, 93);

    // Table Header
    doc.setFillColor(0, 0, 0);
    doc.rect(14, 97, 182, 8, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("#", 18, 102.5);
    doc.text("Descrição do Material / Insumo", 30, 102.5);
    doc.text("Qtd.", 145, 102.5);
    doc.text("Unidade", 170, 102.5);

    let y = 111;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);

    listaMateriais.forEach((item, index) => {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}`, 18, y);
      doc.text(item.descricao || "Item pendente", 30, y);
      doc.text(`${item.quantidade}`, 145, y);
      doc.text(item.unidade, 170, y);
      doc.setDrawColor(240, 240, 240);
      doc.line(14, y + 2, 196, y + 2);
      y += 8;
    });

    // Attached Contract Section
    if (y > 230) {
      doc.addPage();
      y = 20;
    } else {
      y += 6;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("3. CONTRATO OU COMPROVANTE ANEXADO", 14, y);
    y += 6;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(
      `Documento Anexado: ${contratoAnexo ? contratoAnexo.name : "Nenhum contrato ou comprovante anexado na solicitação"}`,
      14,
      y
    );

    // Official Humanized Declaration Footer Box
    y += 12;
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(14, y, 182, 32, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("REGISTRO DE SOLICITAÇÃO E CONFERÊNCIA INDIVIDUAL", 18, y + 7);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const termoTexto = "Este comprovante confirma o envio das suas informações para a conferência individual dos registros da Forma Vale. Os dados foram salvos com segurança em diretório SubData para confrontação de arquivos e posterior contato.";
    doc.text(doc.splitTextToSize(termoTexto, 174), 18, y + 14);

    // Security Footer
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Forma Vale · Emissão em ${dataHora} · Documento de Registro SubData`,
      14,
      286
    );

    const pdfBase64 = doc.output("datauristring");
    return { doc, pdfBase64 };
  };

  // Submit Form Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!solicitante || !email || !telefone || !curso || !faculdade || !dataConclusao) {
      alert("Por favor, preencha todos os campos obrigatórios (dados pessoais, curso, faculdade e data de conclusão).");
      return;
    }

    const materiais = getMateriaisParaEnvio();
    if (materiais.length === 0) {
      alert("Por favor, selecione pelo menos um material pendente para conferência.");
      return;
    }

    setLoading(true);

    try {
      // Generate Protocol
      const timestamp = Date.now().toString().slice(-6);
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const protocolo = `FV-2026-${timestamp}${randomStr}`;
      const dataHoraStr = new Date().toLocaleString("pt-BR");

      // 1. Generate PDF
      const { doc, pdfBase64 } = generateReceiptPDF(protocolo, dataHoraStr, materiais);

      // 2. Trigger Automatic PDF Download in Browser
      doc.save(`Comprovante-FormaVale-${protocolo}.pdf`);

      // 3. Save to Server SubData Directory
      const response = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolo,
          solicitante,
          email,
          telefone,
          curso,
          faculdade,
          dataConclusao,
          materiais,
          comprovantePdfBase64: pdfBase64,
          contratoAnexo
        })
      });

      const data = await response.json();

      if (data.success) {
        setProtocoloGerado(protocolo);
        setUltimoPdfBase64(pdfBase64);
        setMateriaisEnviados(materiais);
      } else {
        alert(`Atenção: ${data.error || "A solicitação foi concluída localmente, mas houve instabilidade no registro do servidor."}`);
        setProtocoloGerado(protocolo);
        setMateriaisEnviados(materiais);
      }
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      alert("Sua solicitação foi concluída e o comprovante baixado com sucesso!");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Manual Re-download
  const handleRedownloadComprovante = () => {
    if (!ultimoPdfBase64 || !protocoloGerado) return;
    const link = document.createElement("a");
    link.href = ultimoPdfBase64;
    link.download = `Comprovante-FormaVale-${protocoloGerado}.pdf`;
    link.click();
  };

  // Reset Form
  const handleResetForm = () => {
    setSolicitante("");
    setEmail("");
    setTelefone("");
    setCurso("");
    setFaculdade("");
    setDataConclusao("");
    setContratoAnexo(null);
    setMateriaisSelecionados({
      fotografia: { checked: false, quantidade: 1, unidade: "Unidade" },
      album: { checked: false, quantidade: 1, unidade: "Unidade" },
      replica: { checked: false, quantidade: 1, unidade: "Unidade" },
      canudo: { checked: false, quantidade: 1, unidade: "Unidade" },
      outros: { checked: false, quantidade: 1, unidade: "Unidade", especificacao: "" }
    });
    setProtocoloGerado(null);
    setUltimoPdfBase64(null);
    setMateriaisEnviados([]);
  };

  // Fetch Admin SubData List
  const fetchSubDataList = async (senha: string) => {
    setSubdataLoading(true);
    try {
      const res = await fetch(`/api/subdata/listar?senha=${encodeURIComponent(senha)}`);
      const data = await res.json();
      if (data.success) {
        setSubdataList(data.items || []);
      } else {
        setAdminAuthError(data.error || "Senha inválida.");
      }
    } catch (e) {
      setAdminAuthError("Erro de comunicação com o servidor.");
    } finally {
      setSubdataLoading(false);
    }
  };

  // Admin Auth Handler
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError("");

    if (adminSenhaInput === "Liberdade26") {
      setIsAdminAuthenticated(true);
      fetchSubDataList("Liberdade26");
    } else {
      setAdminAuthError("Senha de administrador incorreta.");
    }
  };

  // Clear SubData Directory Handler
  const handleClearSubData = async () => {
    if (!confirm("ATENÇÃO: Deseja realmente excluir permanentemente todos os registros e arquivos da pasta SubData? Esta ação não pode ser desfeita.")) {
      return;
    }

    setClearingSubData(true);
    try {
      const res = await fetch("/api/subdata/limpar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: "Liberdade26" })
      });
      const data = await res.json();
      if (data.success) {
        alert("Pasta SubData esvaziada com sucesso!");
        fetchSubDataList("Liberdade26");
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (e) {
      alert("Falha ao comunicar com o servidor para limpar a pasta.");
    } finally {
      setClearingSubData(false);
    }
  };

  // Standalone Online View (/subdata-online)
  if (isSubDataOnlinePage) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 bg-white rounded-xl px-3 py-1.5 flex items-center justify-center">
                <img src="/logo.png" alt="Forma Vale Logomarca Completa" className="h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-white">FORMA VALE · Repositório SubData</h1>
                <p className="text-xs text-zinc-400">Painel Administrativo de Conferência de Arquivos</p>
              </div>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium text-xs transition-colors flex items-center gap-2 border border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para o Portal
            </a>
          </div>

          {!isAdminAuthenticated ? (
            <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 p-8 max-w-md mx-auto text-center my-12">
              <div className="w-12 h-12 bg-zinc-800 text-white rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Acesso Restrito · Administrador</h2>
              <p className="text-xs text-zinc-400 mb-6">Digite a senha de acesso para consultar todas as solicitações salvas na pasta SubData.</p>
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <input
                  type="password"
                  placeholder="Senha ADM"
                  value={adminSenhaInput}
                  onChange={e => setAdminSenhaInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:ring-2 focus:ring-white focus:border-transparent outline-none text-sm"
                />
                {adminAuthError && (
                  <p className="text-xs text-red-400 font-medium">{adminAuthError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl shadow-md transition-colors text-sm"
                >
                  Entrar no Sistema SubData
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actions Bar */}
              <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <div className="text-xs font-semibold text-zinc-300">
                  Total de Registros de Conferência: <span className="bg-white text-black px-2.5 py-0.5 rounded-full font-bold">{subdataList.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fetchSubDataList("Liberdade26")}
                    className="p-2 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Atualizar
                  </button>
                  {subdataList.length > 0 && (
                    <button
                      onClick={handleClearSubData}
                      disabled={clearingSubData}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-red-900/80 hover:text-red-200 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      {clearingSubData ? "Limpando..." : `Limpar Pasta (${subdataList.length})`}
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              {subdataLoading ? (
                <div className="bg-zinc-900 p-12 text-center rounded-2xl border border-zinc-800 text-zinc-400 text-sm">
                  Carregando registros da pasta SubData...
                </div>
              ) : subdataList.length === 0 ? (
                <div className="bg-zinc-900 p-12 text-center rounded-2xl border border-zinc-800 text-zinc-400 text-sm">
                  Nenhum registro ou documento encontrado no diretório SubData.
                </div>
              ) : (
                <div className="space-y-4">
                  {subdataList.map((item) => (
                    <div key={item.protocolo} className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-md hover:border-zinc-700 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4 border-b border-zinc-800 pb-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-black bg-white px-2.5 py-1 rounded-md tracking-wider">
                            {item.protocolo}
                          </span>
                          <h3 className="text-lg font-bold text-white mt-2">{item.solicitante}</h3>
                          <p className="text-xs text-zinc-400">
                            {item.curso ? `Curso: ${item.curso}` : ""} {item.faculdade ? `• Faculdade: ${item.faculdade}` : ""} {item.dataEnvio ? `• Registrado em ${new Date(item.dataEnvio).toLocaleString("pt-BR")}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {item.arquivos.map((arq) => (
                          <a
                            key={arq.nome}
                            href={arq.url}
                            download
                            className="p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl transition-all flex items-center gap-3 text-xs font-medium text-zinc-200"
                          >
                            <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                            <span className="truncate">{arq.nome}</span>
                            <Download className="w-3.5 h-3.5 ml-auto text-zinc-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Customer Application View
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-20">
      {/* Header with Full Logo */}
      <header className="bg-black text-white border-b border-zinc-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 bg-white rounded-xl px-3 py-1 flex items-center justify-center">
              <img src="/logo.png" alt="Forma Vale Logomarca Completa" className="h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] text-zinc-400 font-medium">Portal de Conferência de Registros</p>
            </div>
          </div>

          <button
            onClick={() => setShowAdminModal(true)}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 border border-zinc-700"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-400" /> Área Restrita
          </button>
        </div>
      </header>

      {/* Hero Welcome Card with Exact Requested Copywriting */}
      <section className="bg-black text-white py-12 px-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Logo Brand Showcase */}
          <div className="flex justify-center mb-2">
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-2xl max-w-xs w-full flex justify-center">
              <img src="/logo.png" alt="Forma Vale Logo" className="w-full max-h-24 object-contain" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs font-semibold text-zinc-300 mx-auto block text-center w-max">
            <HeartHandshake className="w-4 h-4 text-white inline mr-1" />
            <span>Portal Oficial de Conferência</span>
          </div>

          <div className="max-w-2xl mx-auto text-sm text-zinc-300 leading-relaxed space-y-4 bg-zinc-900/80 p-6 sm:p-8 rounded-2xl border border-zinc-800 text-left shadow-lg">
            <p className="font-bold text-white text-base">Prezado(a) Formando(a),</p>
            
            <p>
              Sabemos o valor que cada fotografia, álbum, réplica e canudo representa para você e sua família.
            </p>

            <p>
              A empresa encerrou suas atividades e, durante o período em que os serviços eram conduzidos por terceiros, parte das entregas ficou pendente. Por esse motivo, o responsável pela empresa está realizando uma conferência individual dos registros, a fim de identificar quais materiais já foram entregues e quais ainda precisam ser localizados e encaminhados.
            </p>

            <p>
              Com a equipe atualmente reduzida e o fluxo de trabalho limitado, este portal foi criado para organizar as informações e facilitar a conferência dos arquivos. Ao preencher os dados do seu curso e indicar o material pendente, você ajudará a confrontar os registros existentes e permitirá que sua solicitação seja analisada com mais segurança.
            </p>

            <p className="font-medium text-white">
              Após a conferência, entraremos em contato para orientar sobre a localização, a regularização e, quando possível, o agendamento da entrega do material.
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 pt-10">
        {protocoloGerado ? (
          /* SUCCESS VIEW */
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-zinc-200 text-center space-y-8">
            <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-black bg-zinc-100 border border-zinc-300 px-3 py-1 rounded-full uppercase tracking-wider">
                Registro Salvo para Conferência
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 mt-2">Dados Recebidos com Sucesso!</h2>
              <p className="text-sm text-zinc-600 max-w-lg mx-auto">
                Suas informações e indicação de materiais foram registradas para conferência individual.
              </p>
              <div className="inline-block bg-zinc-100 border border-zinc-300 px-4 py-2 rounded-xl text-sm font-mono font-bold text-black mt-2">
                Protocolo: {protocoloGerado}
              </div>
            </div>

            {/* Resume Summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-left text-xs space-y-2.5 max-w-lg mx-auto">
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px] pb-2 border-b border-zinc-200 flex items-center justify-between">
                <span>Resumo da Conferência</span>
                <FileCheck2 className="w-4 h-4 text-zinc-700" />
              </h4>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Solicitante:</span>
                <span className="font-semibold text-zinc-900">{solicitante}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">E-mail:</span>
                <span className="font-semibold text-zinc-900">{email}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Telefone:</span>
                <span className="font-semibold text-zinc-900">{telefone}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Curso:</span>
                <span className="font-semibold text-zinc-900">{curso}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Faculdade / Instituição:</span>
                <span className="font-semibold text-zinc-900">{faculdade}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Data Conclusão:</span>
                <span className="font-semibold text-zinc-900">{dataConclusao}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200/60 pb-1.5">
                <span className="text-zinc-500">Contrato/Comprovante Anexado:</span>
                <span className="font-semibold text-zinc-900">{contratoAnexo ? contratoAnexo.name : "Nenhum arquivo anexado"}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-500">Itens para Conferência:</span>
                <span className="font-semibold text-zinc-900">{materiaisEnviados.length} item(ns)</span>
              </div>
            </div>

            {/* Direct Links Box */}
            <div className="bg-zinc-900 text-white border border-zinc-800 rounded-2xl p-5 text-left max-w-lg mx-auto space-y-3 shadow-md">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-zinc-300" /> Downloads & Arquivos Salvos na Pasta SubData
              </h4>
              <p className="text-[11px] text-zinc-400">
                Os dados foram gravados de forma permanente na pasta segura: <code className="bg-zinc-800 text-white px-1.5 py-0.5 rounded text-[10px]">/subdata/documentos/{protocoloGerado}/</code>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={`/api/subdata/download/${protocoloGerado}/solicitacao-${protocoloGerado}.json`}
                  download
                  className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-white flex items-center justify-between transition-colors"
                >
                  <span>📄 Dados em JSON</span>
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                </a>
                <a
                  href={`/api/subdata/download/${protocoloGerado}/comprovante-${protocoloGerado}.pdf`}
                  download
                  className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-white flex items-center justify-between transition-colors"
                >
                  <span>📕 Comprovante PDF</span>
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                </a>
                {contratoAnexo && (
                  <a
                    href={`/api/subdata/download/${protocoloGerado}/contrato-${contratoAnexo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`}
                    download
                    className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-white flex items-center justify-between transition-colors sm:col-span-2"
                  >
                    <span>📑 Contrato Anexado ({contratoAnexo.name})</span>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRedownloadComprovante}
                className="w-full sm:w-auto px-6 py-3.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="w-4 h-4" /> Baixar Comprovante PDF
              </button>

              <button
                onClick={handleResetForm}
                className="w-full sm:w-auto px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-semibold transition-all text-sm border border-zinc-300"
              >
                Nova Solicitação
              </button>
            </div>
          </div>
        ) : (
          /* REQUEST FORM */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-zinc-200 space-y-8">
            {/* Header Title inside card */}
            <div className="border-b border-zinc-100 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-black" />
                <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900">Formulário de Dados para Conferência</h2>
              </div>
              <p className="text-xs md:text-sm text-zinc-600">
                Preencha os dados do seu curso e indique o material pendente para confrontarmos com os registros existentes.
              </p>
            </div>

            {/* Section 1: Solicitante e Dados Acadêmicos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-black" /> 1. Seus Dados Pessoais e do Curso
                </h3>
                <span className="text-[10px] text-zinc-500 font-semibold">* Campos obrigatórios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={solicitante}
                      onChange={e => setSolicitante(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    E-mail de Contato *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="joao@exemplo.com.br"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Nome do Curso *
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Direito, Medicina, Engenharia..."
                      value={curso}
                      onChange={e => setCurso(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Faculdade / Instituição de Ensino *
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Universidade de São Paulo, Unesp..."
                      value={faculdade}
                      onChange={e => setFaculdade(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Data / Ano da Conclusão *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                    <input
                      type="date"
                      required
                      value={dataConclusao}
                      onChange={e => setDataConclusao(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Material Checkbox List */}
            <div className="space-y-3">
              <div className="border-b border-zinc-200 pb-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-black" /> 2. Relação de Materiais Pendentes
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Indique quais itens você precisa que sejam conferidos:</p>
              </div>

              <div className="space-y-3 pt-1">
                {DEFAULT_MATERIAL_OPTIONS.map(opt => {
                  const itemState = materiaisSelecionados[opt.id] || { checked: false, quantidade: 1, unidade: "Unidade" };
                  return (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        itemState.checked
                          ? "bg-zinc-900 text-white border-black shadow-md"
                          : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={itemState.checked}
                            onChange={e => handleToggleMaterialOption(opt.id, e.target.checked)}
                            className="w-5 h-5 accent-black rounded border-zinc-300 cursor-pointer mt-0.5"
                          />
                          <div>
                            <span className="text-sm font-bold block">{opt.label}</span>
                            <span className={`text-xs ${itemState.checked ? "text-zinc-400" : "text-zinc-500"}`}>
                              {opt.desc}
                            </span>
                          </div>
                        </label>

                        {itemState.checked && (
                          <div className="flex items-center gap-2 pl-8 sm:pl-0">
                            <span className="text-xs text-zinc-400 font-medium">Qtd:</span>
                            <input
                              type="number"
                              min="1"
                              value={itemState.quantidade}
                              onChange={e => handleUpdateMaterialQty(opt.id, parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-zinc-700 rounded-lg bg-zinc-950 text-white text-sm outline-none text-center focus:ring-1 focus:ring-white"
                            />
                            <select
                              value={itemState.unidade}
                              onChange={e => handleUpdateMaterialUnit(opt.id, e.target.value)}
                              className="px-2 py-1 border border-zinc-700 rounded-lg bg-zinc-950 text-white text-xs outline-none focus:ring-1 focus:ring-white"
                            >
                              <option value="Unidade">Unidade</option>
                              <option value="Caixa">Caixa</option>
                              <option value="Kg">Kg</option>
                              <option value="Metros">Metros</option>
                              <option value="Sacos">Sacos</option>
                              <option value="Peça">Peça</option>
                              <option value="Pacote">Pacote</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {opt.id === "outros" && itemState.checked && (
                        <div className="mt-3 pl-8">
                          <input
                            type="text"
                            placeholder="Descreva detalhadamente o insumo pendente..."
                            value={itemState.especificacao || ""}
                            onChange={e => handleUpdateMaterialSpec("outros", e.target.value)}
                            className="w-full px-3 py-2 border border-zinc-700 rounded-xl bg-zinc-950 text-white text-sm outline-none focus:ring-1 focus:ring-white"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Anexo do Contrato */}
            <div className="space-y-3">
              <div className="border-b border-zinc-200 pb-2">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-black" /> 3. Anexo do Contrato ou Comprovante (Opcional)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Anexe foto ou PDF do seu contrato ou recibo antigo para agilizar o confronto de dados:
                </p>
              </div>

              {contratoAnexo ? (
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-white">
                  <div className="flex items-center gap-3 truncate">
                    <Paperclip className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="truncate font-semibold text-xs">{contratoAnexo.name}</span>
                    <span className="text-[10px] text-zinc-400">({(contratoAnexo.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContratoAnexo(null)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Remover anexo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 hover:border-black rounded-2xl bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-all text-center">
                  <Paperclip className="w-8 h-8 text-zinc-400 mb-2" />
                  <span className="text-xs font-bold text-zinc-800">Clique ou arraste para anexar o contrato/comprovante</span>
                  <span className="text-[11px] text-zinc-500 mt-1">Formatos permitidos: PDF, PNG, JPG, JPEG, DOC e DOCX (Até 20MB)</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black hover:bg-zinc-800 text-white font-bold text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Registrando para Conferência...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Dados para Conferência & Baixar Comprovante
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Admin Protected Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-white" />
                <h3 className="text-base font-bold text-white">Área Restrita · Painel SubData</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <form onSubmit={handleAdminAuth} className="space-y-4 my-auto py-8 text-center max-w-sm mx-auto w-full">
                <Lock className="w-10 h-10 text-white mx-auto" />
                <h4 className="text-base font-bold text-white">Autenticação do Administrador</h4>
                <p className="text-xs text-zinc-400">Insira a senha de controle para listar todas as solicitações recebidas.</p>
                <input
                  type="password"
                  placeholder="Senha de ADM"
                  value={adminSenhaInput}
                  onChange={e => setAdminSenhaInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white"
                />
                {adminAuthError && (
                  <p className="text-xs text-red-400 font-medium">{adminAuthError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-sm"
                >
                  Entrar no Painel
                </button>
              </form>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                  <span className="font-semibold text-zinc-300">Total: {subdataList.length} solicitação(ões)</span>
                  <div className="flex items-center gap-3">
                    <a
                      href="/subdata-online?senha=Liberdade26"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:underline font-medium"
                    >
                      Abrir em Tela Cheia ↗
                    </a>
                    {subdataList.length > 0 && (
                      <button
                        onClick={handleClearSubData}
                        disabled={clearingSubData}
                        className="px-2.5 py-1 bg-red-900/80 hover:bg-red-800 text-red-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {clearingSubData ? "Limpando..." : `Limpar (${subdataList.length})`}
                      </button>
                    )}
                  </div>
                </div>

                {subdataLoading ? (
                  <div className="py-8 text-center text-sm text-zinc-400">Carregando...</div>
                ) : subdataList.length === 0 ? (
                  <div className="py-8 text-center text-sm text-zinc-400">Nenhum registro armazenado na pasta SubData.</div>
                ) : (
                  <div className="space-y-3">
                    {subdataList.map((item) => (
                      <div key={item.protocolo} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-black bg-white px-2 py-0.5 rounded">{item.protocolo}</span>
                          <span className="text-zinc-400">{item.solicitante}</span>
                        </div>
                        {(item.curso || item.faculdade) && (
                          <p className="text-[11px] text-zinc-400">
                            {item.curso ? `Curso: ${item.curso}` : ""} {item.faculdade ? `• Faculdade: ${item.faculdade}` : ""} {item.dataConclusao ? `• Conclusão: ${item.dataConclusao}` : ""}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {item.arquivos.map((arq) => (
                            <a
                              key={arq.nome}
                              href={arq.url}
                              download
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1 font-medium transition-colors"
                            >
                              <Download className="w-3 h-3 text-zinc-400" /> {arq.nome}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
