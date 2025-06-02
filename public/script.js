import express from 'express';
import { createServer } from 'http'; // Para usar createServer diretamente
import { Server } from 'socket.io'; // Para usar Server diretamente
import path from 'path';
import fetch from 'node-fetch'; // node-fetch é um módulo ESM por padrão agora

// Necessário para __dirname e __filename em módulos ES
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);const socket = io(); // Conecta ao servidor Socket.IO
const gateStatusSpan = document.getElementById('gateStatus');
const messageDiv = document.getElementById('message');

// Função para exibir mensagens na interface
function showMessage(msg, type = 'info') {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`; // Adiciona classe para estilo (success, error)
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000); // Esconde a mensagem após 5 segundos
}

// Função para enviar comandos via POST
async function sendCommand(endpoint) {
    try {
        const response = await fetch(`/comando/${endpoint}`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            showMessage(`Comando "${endpoint}" enviado com sucesso!`, 'success');
        } else {
            showMessage(`Erro ao enviar comando "${endpoint}": ${data.message || 'Verifique o servidor.'}`, 'error');
        }
    } catch (error) {
        showMessage(`Erro de rede ao enviar comando "${endpoint}": ${error.message}`, 'error');
    }
}

// Atualizar o status do portão na UI
function updateGateStatus(status) {
    gateStatusSpan.textContent = status.charAt(0).toUpperCase() + status.slice(1); // Capitaliza a primeira letra
    gateStatusSpan.className = `status-${status.replace(/\s/g, '-')}`; // Remove espaços e adiciona classe
}

// Event Listeners para os botões
document.getElementById('btnAbrir').addEventListener('click', () => sendCommand('abrir'));
document.getElementById('btnFechar').addEventListener('click', () => sendCommand('fechar'));
document.getElementById('btnParar').addEventListener('click', () => sendCommand('parar'));
document.getElementById('btnLigarLuz').addEventListener('click', () => sendCommand('ligarLuz'));
document.getElementById('btnCadastrarControle').addEventListener('click', () => sendCommand('cadastrarControle'));
document.getElementById('btnAprenderTrajeto').addEventListener('click', () => sendCommand('aprenderTrajeto'));

// Ouve por atualizações de status do servidor via WebSocket
socket.on('statusPortao', (status) => {
    console.log('Status do portão atualizado via WebSocket:', status);
    updateGateStatus(status);
});

// Inicializa o status ao carregar a página
// O servidor já envia o status inicial no 'connection' do socket
// Caso o socket falhe, a página ficará com "Desconhecido"
