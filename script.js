
const formulario = document.getElementById("form-tarefa");
const campoNome = document.getElementById("nome-tarefa");
const campoData = document.getElementById("data-tarefa");
const campoHora = document.getElementById("hora-tarefa");
const listaTarefas = document.getElementById("lista-tarefas");
const mensagemVazia = document.getElementById("mensagem-vazia");
const aviso = document.getElementById("aviso");
const botaoNotificacoes = document.getElementById("botao-notificacoes");

const totalTarefas = document.getElementById("total-tarefas");
const totalPendentes = document.getElementById("total-pendentes");
const totalConcluidas = document.getElementById("total-concluidas");

const CHAVE = "meuOrganizadorTarefas";
let filtroAtual = "todas";
let audioContexto = null;
let temporizadorAviso;

// Recupera as tarefas que foram salvas no navegador.
let tarefas = [];

try {
    tarefas = JSON.parse(localStorage.getItem(CHAVE)) || [];

    if (!Array.isArray(tarefas)) {
        tarefas = [];
    }
} catch (erro) {
    tarefas = [];
}

// Coloca a data de hoje como valor inicial.
function dataDeHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

campoData.value = dataDeHoje();

// Salva a lista no armazenamento local.
function salvarTarefas() {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(tarefas));
    } catch (erro) {
        mostrarAviso("Não foi possível salvar as tarefas neste navegador.");
    }
}

// Transforma a data e o horário em um objeto Date.
function obterDataHora(tarefa) {
    return new Date(`${tarefa.data}T${tarefa.hora}:00`);
}

// Formata a data para o padrão brasileiro.
function formatarData(data) {
    const partes = data.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Mostra um aviso dentro da página.
function mostrarAviso(mensagem) {
    aviso.textContent = mensagem;
    aviso.classList.add("visivel");

    clearTimeout(temporizadorAviso);

    temporizadorAviso = setTimeout(() => {
        aviso.classList.remove("visivel");
    }, 5000);
}

// Prepara o áudio após uma interação do usuário.
function prepararAudio() {
    if (!audioContexto) {
        const AudioContexto =
            window.AudioContext || window.webkitAudioContext;

        if (AudioContexto) {
            audioContexto = new AudioContexto();
        }
    }

    if (audioContexto?.state === "suspended") {
        audioContexto.resume().catch(() => {});
    }
}

// Produz um pequeno som de alarme.
function tocarAlarme() {
    if (!audioContexto || audioContexto.state !== "running") {
        return;
    }

    const oscilador = audioContexto.createOscillator();
    const volume = audioContexto.createGain();

    oscilador.type = "sine";
    oscilador.frequency.value = 880;

    volume.gain.setValueAtTime(0.001, audioContexto.currentTime);
    volume.gain.exponentialRampToValueAtTime(
        0.2,
        audioContexto.currentTime + 0.03
    );
    volume.gain.exponentialRampToValueAtTime(
        0.001,
        audioContexto.currentTime + 0.45
    );

    oscilador.connect(volume);
    volume.connect(audioContexto.destination);

    oscilador.start();
    oscilador.stop(audioContexto.currentTime + 0.5);
}

// Pede permissão para notificações do navegador.
async function ativarNotificacoes() {
    prepararAudio();

    if (!("Notification" in window)) {
        mostrarAviso("Seu navegador não oferece notificações.");
        return;
    }

    try {
        const permissao = await Notification.requestPermission();

        if (permissao === "granted") {
            mostrarAviso("Notificações ativadas! ♡");
            botaoNotificacoes.textContent = "🔔 Notificações ativadas";
        } else {
            mostrarAviso(
                "As notificações não foram autorizadas. Os avisos na página continuam funcionando."
            );
        }
    } catch (erro) {
        mostrarAviso("Não foi possível ativar as notificações.");
    }
}

botaoNotificacoes.addEventListener("click", ativarNotificacoes);

// Adiciona uma tarefa nova.
formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();
    prepararAudio();

    const nome = campoNome.value.trim();
    const data = campoData.value;
    const hora = campoHora.value;

    if (!nome || !data || !hora) {
        mostrarAviso("Preencha o nome, a data e o horário! ♡");
        return;
    }

    const novaData = new Date(`${data}T${hora}:00`);

    if (Number.isNaN(novaData.getTime())) {
        mostrarAviso("Confira a data e o horário.");
        return;
    }

    const agora = new Date();

    if (novaData < agora) {
        mostrarAviso("Escolha um horário futuro, por favor! ♡");
        return;
    }

    const tarefa = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        nome: nome,
        data: data,
        hora: hora,
        concluida: false,
        avisada: false
    };

    tarefas.push(tarefa);
    salvarTarefas();
    mostrarTarefas();

    formulario.reset();
    campoData.value = dataDeHoje();
    campoNome.focus();

    mostrarAviso("Tarefa adicionada com carinho! 🌷");
});

// Desenha novamente a lista de tarefas.
function mostrarTarefas() {
    listaTarefas.replaceChildren();

    const tarefasOrdenadas = [...tarefas].sort((a, b) => {
        return obterDataHora(a) - obterDataHora(b);
    });

    const tarefasFiltradas = tarefasOrdenadas.filter(tarefa => {
        if (filtroAtual === "pendentes") {
            return !tarefa.concluida;
        }

        if (filtroAtual === "concluidas") {
            return tarefa.concluida;
        }

        return true;
    });

    tarefasFiltradas.forEach(tarefa => {
        const item = document.createElement("li");
        item.className = "tarefa";

        if (tarefa.concluida) {
            item.classList.add("concluida");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "check-tarefa";
        checkbox.checked = tarefa.concluida;
        checkbox.setAttribute(
            "aria-label",
            `Concluir tarefa: ${tarefa.nome}`
        );

        checkbox.addEventListener("change", function() {
            tarefa.concluida = checkbox.checked;
            salvarTarefas();
            mostrarTarefas();

            if (tarefa.concluida) {
                mostrarAviso("Mais uma tarefa concluída! ✨");
            }
        });

        const conteudo = document.createElement("div");
        conteudo.className = "conteudo-tarefa";

        const nome = document.createElement("p");
        nome.className = "nome-tarefa";
        nome.textContent = tarefa.nome;

        const horario = document.createElement("p");
        horario.className = "horario-tarefa";
        horario.textContent = `📅 ${formatarData(tarefa.data)} às ${tarefa.hora}`;

        conteudo.append(nome, horario);

        if (tarefa.concluida) {
            const etiqueta = document.createElement("span");
            etiqueta.className = "etiqueta";
            etiqueta.textContent = "✓ Feita com sucesso!";
            conteudo.appendChild(etiqueta);
        }

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "botao-excluir";
        excluir.textContent = "Excluir";
        excluir.setAttribute("aria-label", `Excluir ${tarefa.nome}`);

        excluir.addEventListener("click", function() {
            tarefas = tarefas.filter(item => item.id !== tarefa.id);
            salvarTarefas();
            mostrarTarefas();
            mostrarAviso("Tarefa excluída. ♡");
        });

        item.append(checkbox, conteudo, excluir);
        listaTarefas.appendChild(item);
    });

    mensagemVazia.hidden = tarefasFiltradas.length > 0;

    if (tarefasFiltradas.length === 0) {
        mensagemVazia.textContent =
            filtroAtual === "pendentes"
                ? "Você não tem tarefas pendentes! 🌷"
                : filtroAtual === "concluidas"
                    ? "Nenhuma tarefa concluída por enquanto. ♡"
                    : "Sua listinha está vazia por enquanto. ♡";
    }

    totalTarefas.textContent = tarefas.length;
    totalPendentes.textContent =
        tarefas.filter(tarefa => !tarefa.concluida).length;
    totalConcluidas.textContent =
        tarefas.filter(tarefa => tarefa.concluida).length;
}

// Controla os filtros da lista.
document.querySelectorAll(".filtro").forEach(botao => {
    botao.addEventListener("click", function() {
        filtroAtual = botao.dataset.filtro;

        document.querySelectorAll(".filtro").forEach(outroBotao => {
            outroBotao.classList.remove("ativo");
        });

        botao.classList.add("ativo");
        mostrarTarefas();
    });
});

// Verifica se chegou a hora de alguma tarefa.
function verificarHorarios() {
    const agora = new Date();
    let houveAlteracao = false;

    tarefas.forEach(tarefa => {
        if (tarefa.concluida || tarefa.avisada) {
            return;
        }

        const horario = obterDataHora(tarefa);

        if (Number.isNaN(horario.getTime())) {
            return;
        }

        if (agora >= horario) {
            tarefa.avisada = true;
            houveAlteracao = true;

            const mensagem = `⏰ Está na hora de: ${tarefa.nome}!`;

            mostrarAviso(mensagem);
            tocarAlarme();

            if (
                "Notification" in window &&
                Notification.permission === "granted"
            ) {
                try {
                    new Notification("Hora da sua tarefa! 🌷", {
                        body: tarefa.nome
                    });
                } catch (erro) {
                    console.log("Notificação indisponível.");
                }
            }
        }
    });

    if (houveAlteracao) {
        salvarTarefas();
    }
}

// Inicializa a página.
mostrarTarefas();
verificarHorarios();

// Confere os horários uma vez por segundo.
setInterval(verificarHorarios, 1000);

// Atualiza os avisos quando você volta à aba.
document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
        verificarHorarios();
    }
});


const audioAlarme = new Audio("alarme.mp3");
audioAlarme.loop = true;
audioAlarme.volume = 0.7;

const caixaAlarme = document.getElementById("caixa-alarme");
const mensagemAlarme = document.getElementById("mensagem-alarme");
const botaoDesligar = document.getElementById("desligar-alarme");

function iniciarAlarme(nomeTarefa) {
    mensagemAlarme.textContent = `Está na hora de: ${nomeTarefa}! ♡`;

    caixaAlarme.hidden = false;

    audioAlarme.currentTime = 0;

    audioAlarme.play().catch(() => {
        mostrarAviso(
            "O navegador bloqueou o áudio. Clique na página e tente novamente."
        );
    });

    botaoDesligar.focus();
}

function desligarAlarme() {
    audioAlarme.pause();
    audioAlarme.currentTime = 0;

    caixaAlarme.hidden = true;

    mostrarAviso("Alarme desligado. Bom trabalho! 🌷");
}

botaoDesligar.addEventListener("click", desligarAlarme);
