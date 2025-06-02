// server.js

// Importações dos módulos necessários
import express from 'express';
import { createServer } from 'http'; // Importa createServer do módulo 'http'
import { Server } from 'socket.io'; // Importa a classe Server do módulo 'socket.io'
import path from 'path';
import fetch from 'node-fetch'; // Para fazer requisições HTTP (node-fetch v3+ é ESM por padrão)

// --- Configuração para __dirname e __filename em módulos ES ---
// Em módulos ES, as variáveis globais __dirname e __filename não estão disponíveis.
// Esta é a forma padrão de recriá-las.
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- Fim da configuração __dirname/__filename ---

// Inicialização do Express e do servidor HTTP
const app = express();
const server = createServer(app); // Cria o servidor HTTP usando o aplicativo Express
const io = new Server(server);    // Inicializa o Socket.IO com o servidor HTTP

// --- Configurações da Aplicação ---
const PORT = process.env.PORT || 3000; // Define a porta do servidor, usando a variável de ambiente PORT ou 3000
const ESP_IP = '192.168.10.10'; // <<<<<< Mude para o ENDEREÇO IP DO SEU ESP8266 <<<<<<

// Variável para armazenar o status atual do portão
// Inicializada como 'desconhecido' e será atualizada pelo ESP8266
let currentGateStatus = 'desconhecido';

// --- Middlewares ---
// Serve arquivos estáticos (HTML, CSS, JavaScript) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Habilita o Express a parsear corpos de requisição no formato JSON
app.use(express.json());

// --- Função Genérica para Enviar Comandos ao ESP8266 ---
/**
 * Envia um comando HTTP GET para um endpoint específico no ESP8266.
 * @param {string} endpoint - O caminho do endpoint no ESP8266 (ex: 'abrir', 'fechar').
 * @returns {Promise<{success: boolean, message?: string}>} Objeto indicando sucesso ou falha.
 */
async function sendCommandToESP(endpoint) {
    try {
        console.log(`Tentando enviar comando para http://${ESP_IP}/${endpoint}`);
        const response = await fetch(`http://${ESP_IP}/${endpoint}`);

        if (response.ok) {
            console.log(`Comando /${endpoint} enviado com sucesso ao ESP8266.`);
            return { success: true };
        } else {
            const errorText = await response.text(); // Tenta ler a resposta para mais detalhes
            console.error(`Erro ao enviar comando /${endpoint} ao ESP8266. Status: ${response.status}, Resposta: ${errorText}`);
            return { success: false, message: `Erro ESP: ${response.status} - ${errorText}` };
        }
    } catch (error) {
        console.error(`Falha na comunicação com o ESP8266 (${ESP_IP}/${endpoint}):`, error.message);
        return { success: false, message: `Erro de conexão: ${error.message}` };
    }
}

// --- Rotas da API (Endpoints para a Interface Web) ---

// Rota para abrir o portão
app.post('/comando/abrir', async (req, res) => {
    const result = await sendCommandToESP('abrir');
    res.json(result);
});

// Rota para fechar o portão
app.post('/comando/fechar', async (req, res) => {
    const result = await sendCommandToESP('fechar');
    res.json(result);
});

// Rota para parar o portão
app.post('/comando/parar', async (req, res) => {
    const result = await sendCommandToESP('parar');
    res.json(result);
});

// Rota para ligar/desligar a luz
app.post('/comando/ligarLuz', async (req, res) => {
    const result = await sendCommandToESP('ligarLuz');
    res.json(result);
});

// Rota para cadastrar controle
app.post('/comando/cadastrarControle', async (req, res) => {
    const result = await sendCommandToESP('cadastrarControle');
    res.json(result);
});

// Rota para aprender trajeto
app.post('/comando/aprenderTrajeto', async (req, res) => {
    const result = await sendCommandToESP('aprenderTrajeto');
    res.json(result);
});

// --- Rota da API para o ESP8266 Reportar o Status ---
// Esta rota é onde o ESP8266 enviará o status atual do portão.
app.post('/statusPortao', (req, res) => {
    const { status } = req.body; // Espera um corpo JSON como {"status": "aberto"} ou {"status": "fechado"}
    if (status) {
        console.log(`Status do portão recebido do ESP8266: ${status}`);
        currentGateStatus = status; // Atualiza o status no servidor intermediário
        io.emit('statusPortao', currentGateStatus); // Envia o novo status para TODOS os clientes web conectados via WebSocket
        res.status(200).send('Status recebido com sucesso.');
    } else {
        // Retorna um erro se o status não for fornecido no corpo da requisição
        res.status(400).send('Corpo da requisição inválido. Esperado {"status": "..."}.');
    }
});

// --- WebSocket para Comunicação em Tempo Real com a Interface Web ---
// Ouve por novas conexões de clientes Socket.IO
io.on('connection', (socket) => {
    console.log('Um cliente web conectado via WebSocket');
    // Envia o status atual do portão para o cliente recém-conectado
    socket.emit('statusPortao', currentGateStatus);

    // Ouve quando um cliente se desconecta
    socket.on('disconnect', () => {
        console.log('Cliente web desconectado');
    });
});

// --- Início do Servidor ---
// O servidor começa a ouvir na porta especificada
server.listen(PORT, () => {
    console.log(`Servidor intermediário rodando na porta ${PORT}`);
    console.log(`Acesse a interface web: http://localhost:${PORT}`);
    console.log(`Certifique-se de que o ESP8266 esteja acessível em http://${ESP_IP} e responda aos comandos.`);
});
