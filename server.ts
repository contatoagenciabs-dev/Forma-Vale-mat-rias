import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Express json body parser limit for file attachments
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper to resolve SubData storage path (uses /tmp in Vercel serverless environment)
const getSubDataDir = (): string => {
  if (process.env.VERCEL) {
    return path.join("/tmp", "subdata", "documentos");
  }
  return path.join(process.cwd(), "subdata", "documentos");
};

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const ADMIN_PASSWORD = "Liberdade26";

// API Route: Check Admin Password
app.post("/api/admin/auth", (req: Request, res: Response) => {
  const { senha } = req.body;
  if (senha === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Acesso autorizado" });
  } else {
    res.status(401).json({ success: false, message: "Senha incorreta" });
  }
});

// API Route: Save New Material Request
app.post("/api/solicitacoes", (req: Request, res: Response) => {
  try {
    const {
      protocolo,
      solicitante,
      email,
      telefone,
      empresa,
      curso,
      faculdade,
      dataConclusao,
      materiais,
      comprovantePdfBase64,
      contratoAnexo
    } = req.body;

    if (!protocolo || !solicitante) {
      return res.status(400).json({ success: false, error: "Dados incompletos" });
    }

    const baseDir = getSubDataDir();
    const protocolDir = path.join(baseDir, protocolo);
    ensureDirectoryExists(protocolDir);

    // 1. Save Form Data JSON
    const jsonPath = path.join(protocolDir, `solicitacao-${protocolo}.json`);
    const jsonContent = {
      protocolo,
      solicitante,
      email,
      telefone,
      empresa: empresa || null,
      curso: curso || null,
      faculdade: faculdade || null,
      dataConclusao: dataConclusao || null,
      materiais,
      dataEnvio: new Date().toISOString(),
      contratoOriginalNome: contratoAnexo?.name || null
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), "utf-8");

    // 2. Save Comprovante PDF
    if (comprovantePdfBase64) {
      const pdfBuffer = Buffer.from(comprovantePdfBase64.replace(/^data:application\/pdf;base64,/, ""), "base64");
      const pdfPath = path.join(protocolDir, `comprovante-${protocolo}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
    }

    // 3. Save Contract File Attachment if present
    if (contratoAnexo && contratoAnexo.base64) {
      const fileData = contratoAnexo.base64.replace(/^data:.*;base64,/, "");
      const fileBuffer = Buffer.from(fileData, "base64");
      const sanitizeName = (contratoAnexo.name || "contrato.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      const contratoPath = path.join(protocolDir, `contrato-${sanitizeName}`);
      fs.writeFileSync(contratoPath, fileBuffer);
    }

    return res.json({
      success: true,
      protocolo,
      message: "Solicitação e documentos salvos com sucesso na pasta SubData."
    });
  } catch (error: any) {
    console.error("Erro ao salvar solicitação:", error);
    return res.status(500).json({ success: false, error: error?.message || "Erro interno do servidor" });
  }
});

// Helper function to check admin password from query or headers
const isAuthorizedAdmin = (req: Request): boolean => {
  const senha = (req.query.senha as string) || req.headers["x-admin-password"];
  return senha === ADMIN_PASSWORD;
};

// API Route: List SubData Files (Protected)
app.get("/api/subdata/listar", (req: Request, res: Response) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ success: false, error: "Acesso negado. Senha de administrador requerida." });
  }

  try {
    const baseDir = getSubDataDir();
    if (!fs.existsSync(baseDir)) {
      return res.json({ success: true, count: 0, items: [] });
    }

    const folders = fs.readdirSync(baseDir, { withFileTypes: true });
    const items = [];

    for (const folder of folders) {
      if (folder.isDirectory()) {
        const pDir = path.join(baseDir, folder.name);
        const files = fs.readdirSync(pDir);

        let jsonDetails: any = null;
        const jsonFile = files.find(f => f.endsWith(".json"));
        if (jsonFile) {
          try {
            const content = fs.readFileSync(path.join(pDir, jsonFile), "utf-8");
            jsonDetails = JSON.parse(content);
          } catch (e) {
            // ignore JSON parse error
          }
        }

        items.push({
          protocolo: folder.name,
          dataEnvio: jsonDetails?.dataEnvio || null,
          solicitante: jsonDetails?.solicitante || "Não informado",
          empresa: jsonDetails?.empresa || "Não informado",
          curso: jsonDetails?.curso || null,
          faculdade: jsonDetails?.faculdade || null,
          dataConclusao: jsonDetails?.dataConclusao || null,
          arquivos: files.map(f => ({
            nome: f,
            url: `/api/subdata/download/${folder.name}/${encodeURIComponent(f)}`
          }))
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => (b.dataEnvio || "").localeCompare(a.dataEnvio || ""));

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error: any) {
    console.error("Erro ao listar subdata:", error);
    return res.status(500).json({ success: false, error: "Falha ao ler arquivos armazenados." });
  }
});

// API Route: Download Specific SubData File
app.get("/api/subdata/download/:protocolo/:filename", (req: Request, res: Response) => {
  try {
    const { protocolo, filename } = req.params;
    const baseDir = getSubDataDir();
    const filePath = path.join(baseDir, protocolo, filename);

    // Prevent directory traversal
    if (!filePath.startsWith(baseDir)) {
      return res.status(403).send("Acesso proibido.");
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Arquivo não encontrado.");
    }

    return res.download(filePath);
  } catch (error) {
    return res.status(500).send("Erro ao processar download.");
  }
});

// API Route: Clear SubData Directory (Protected)
app.all("/api/subdata/limpar", (req: Request, res: Response) => {
  const senha = req.body?.senha || req.query?.senha || req.headers["x-admin-password"];
  if (senha !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Senha de administrador incorreta." });
  }

  try {
    const baseDir = getSubDataDir();
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.mkdirSync(baseDir, { recursive: true });
    }
    return res.json({ success: true, message: "Pasta SubData esvaziada com sucesso!" });
  } catch (error: any) {
    console.error("Erro ao limpar subdata:", error);
    return res.status(500).json({ success: false, error: "Falha ao limpar pasta SubData." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export default app for Vercel serverless integration
export default app;

// Only listen when executed directly (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  startServer();
}
