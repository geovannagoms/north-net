
// Regras locais de imagens do North.net.
// No futuro, estes mesmos limites também serão verificados no servidor.
const northMidia = (function () {
  const limites = Object.freeze({
    memorias: 10,
    conta: 5_000_000,
    imagem: 200_000,
    entrada: 10_000_000,
    lado: 1600
  });
  const chaves = ["meuPerfil", "meusPosts", "minhasMemorias", "meusGrupos", "meuTema"];

  function ler(chave) {
    const salvo = localStorage.getItem(chave);
    return salvo ? JSON.parse(salvo) : null;
  }

  function bytesImagem(valor) {
    if (typeof valor !== "string" || !valor.startsWith("data:image/")) return 0;
    const virgula = valor.indexOf(",");
    if (virgula < 0) return 0;
    const conteudo = valor.slice(virgula + 1);
    if (valor.slice(0, virgula).includes(";base64")) {
      const tamanho = conteudo.replace(/\s/g, "").length;
      const ajuste = conteudo.endsWith("==") ? 2 : conteudo.endsWith("=") ? 1 : 0;
      return Math.max(0, Math.floor(tamanho * 3 / 4) - ajuste);
    }
    try {
      return new TextEncoder().encode(decodeURIComponent(conteudo)).length;
    } catch (_) {
      return conteudo.length;
    }
  }

  function imagens(dados, resultado = []) {
    if (typeof dados === "string") {
      if (bytesImagem(dados)) resultado.push(dados);
    } else if (Array.isArray(dados)) {
      dados.forEach(function (item) { imagens(item, resultado); });
    } else if (dados && typeof dados === "object") {
      Object.entries(dados).forEach(function ([campo, valor]) {
        // Avatares históricos são cópias da foto de perfil, não novos uploads.
        if (campo !== "fotoAutor") imagens(valor, resultado);
      });
    }
    return resultado;
  }

  function uso(alteracoes = {}) {
    return chaves.reduce(function (total, chave) {
      const dados = Object.prototype.hasOwnProperty.call(alteracoes, chave)
        ? alteracoes[chave] : ler(chave);
      return total + imagens(dados).reduce(function (soma, imagem) {
        return soma + bytesImagem(imagem);
      }, 0);
    }, 0);
  }

  function formatar(bytes) {
    return (bytes / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + " MB";
  }

  function atualizarPainel() {
    const texto = document.getElementById("midiaUsoTexto");
    const barra = document.getElementById("midiaUsoBarra");
    if (!texto || !barra) return;
    try {
      const total = uso();
      const memorias = ler("minhasMemorias") || [];
      texto.textContent = formatar(total) + " de 5 MB · " + memorias.length + " de 10 memories";
      barra.max = limites.conta;
      barra.value = Math.min(total, limites.conta);
      document.getElementById("midiaUsoAviso").textContent = total >= limites.conta
        ? "Seu espaço de imagens está cheio. As fotos continuam disponíveis; remova ou substitua uma imagem para liberar espaço."
        : "As imagens não expiram. Quando o espaço acabar, você escolhe o que remover ou substituir.";
    } catch (_) {
      texto.textContent = "Não foi possível consultar o espaço de imagens.";
    }
  }

  function gravar(chave, dados) {
    try {
      if (chaves.includes(chave)) {
        const anterior = ler(chave);
        if (chave === "minhasMemorias") {
          const quantidadeAntiga = Array.isArray(anterior) ? anterior.length : 0;
          if (dados.length > limites.memorias && dados.length > quantidadeAntiga) {
            alert("Você pode guardar até 10 memories. Escolha uma para substituir ou apague uma antes de adicionar outra.");
            return false;
          }
        }

        const antigas = new Map();
        imagens(anterior).forEach(function (imagem) {
          antigas.set(imagem, (antigas.get(imagem) || 0) + 1);
        });
        for (const imagem of imagens(dados)) {
          const disponiveis = antigas.get(imagem) || 0;
          if (disponiveis) antigas.set(imagem, disponiveis - 1);
          else if (bytesImagem(imagem) > limites.imagem) {
            alert("A nova imagem precisa ter até 200 KB depois da compressão. Selecione a foto novamente para prepará-la.");
            return false;
          }
        }

        const atual = uso();
        const previsto = uso({ [chave]: dados });
        // Dados antigos acima da cota podem ser editados ou reduzidos.
        if (previsto > limites.conta && previsto > atual) {
          alert("Seu limite de imagens é 5 MB. Esta alteração usaria " + formatar(previsto) + ". Remova ou substitua uma imagem para liberar espaço. Você pode continuar publicando textos.");
          return false;
        }
      }
      localStorage.setItem(chave, JSON.stringify(dados));
    } catch (erro) {
      alert(erro.name === "QuotaExceededError"
        ? "O armazenamento deste navegador encheu. Nada desta alteração foi salvo. Baixe seus dados em settings e remova uma imagem para liberar espaço."
        : "Não foi possível salvar esta alteração. Seus dados anteriores continuam guardados.");
      return false;
    }
    atualizarPainel();
    return true;
  }

  function lerArquivo(arquivo) {
    return new Promise(function (resolve, reject) {
      const leitor = new FileReader();
      leitor.onload = function () { resolve(String(leitor.result)); };
      leitor.onerror = function () { reject(new Error("Não foi possível ler a imagem.")); };
      leitor.readAsDataURL(arquivo);
    });
  }

  async function prepararImagem(arquivo, ladoMaximo = limites.lado) {
    if (!arquivo || !/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) {
      throw new Error("Escolha uma imagem JPG, PNG, WebP ou GIF.");
    }
    if (arquivo.size > limites.entrada) {
      throw new Error("Escolha uma imagem original de até 10 MB.");
    }
    if (arquivo.type === "image/gif") {
      if (arquivo.size > limites.imagem) {
        throw new Error("O GIF precisa ter até 200 KB para manter a animação. Escolha um GIF menor ou uma foto.");
      }
      return lerArquivo(arquivo);
    }

    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    try {
      await new Promise(function (resolve, reject) {
        imagem.onload = resolve;
        imagem.onerror = function () { reject(new Error("Não foi possível abrir a imagem.")); };
        imagem.src = url;
      });
      const original = Math.max(imagem.naturalWidth, imagem.naturalHeight);
      if (!original) throw new Error("Esta imagem não tem dimensões válidas.");
      let lado = Math.min(ladoMaximo, original);
      const minimo = Math.min(320, lado);
      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");
      if (!contexto) throw new Error("Não foi possível preparar a imagem neste navegador.");

      while (true) {
        const escala = lado / original;
        canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
        contexto.clearRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
        for (const qualidade of [0.86, 0.78, 0.70, 0.62]) {
          const blob = await new Promise(function (resolve, reject) {
            canvas.toBlob(function (resultado) {
              if (resultado) resolve(resultado);
              else reject(new Error("Não foi possível comprimir a imagem."));
            }, "image/webp", qualidade);
          });
          if (blob.size <= limites.imagem) return await lerArquivo(blob);
          // Se WebP não for suportado, o navegador usa PNG.
          if (blob.type === "image/png") break;
        }
        if (lado <= minimo) break;
        lado = Math.max(minimo, Math.floor(lado * 0.82));
      }
      throw new Error("A imagem ainda passou de 200 KB. Tente recortar a foto ou escolher uma imagem mais simples.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function baixar(imagem, nome = "foto-northnet") {
    const formato = /^data:image\/([\w+.-]+)/.exec(imagem || "");
    if (!formato) return;
    const extensao = formato[1] === "jpeg" ? "jpg" : formato[1];
    const link = document.createElement("a");
    link.href = imagem;
    link.download = nome + "." + extensao;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  document.addEventListener("DOMContentLoaded", atualizarPainel);
  window.addEventListener("storage", atualizarPainel);
  if (document.readyState !== "loading") queueMicrotask(atualizarPainel);
  return { limites, uso, formatar, bytesImagem, gravar, prepararImagem, baixar, atualizarPainel };
})();

// perfil
let perfil = JSON.parse(localStorage.getItem("meuPerfil")) || {
  foto: "",
  nome: "seu nome",
  citacao: "adicione uma citação.",
  aboutMe: "conte um pouco sobre você aqui.",
  mood: "tranquila."
};

// posts (norths)
let posts = JSON.parse(localStorage.getItem("meusPosts")) || [];

renderPerfil();
renderNorths("northsLista", 4);

// O ponto faz parte da identidade visual do nome em todo o site.
function nomeNorth(nome) {
  return String(nome || "seu nome").trim().replace(/^\.+/, "") || "seu nome";
}

function aplicarAvatarNorth(elemento, foto, nome) {
  elemento.textContent = "";
  elemento.style.backgroundImage = "none";

  if (foto) {
    elemento.style.backgroundImage = "url(" + JSON.stringify(foto) + ")";
  } else {
    elemento.textContent =
      "." + nomeNorth(nome).charAt(0).toLocaleLowerCase("pt-BR");
  }
}

function renderPerfil() {
  document.getElementById("perfilNomeNorth").textContent =
    nomeNorth(perfil.nome);

  document.getElementById("perfilCitacao").textContent =
    '"' + perfil.citacao + '"';

  document.getElementById("aboutTexto").textContent =
    perfil.aboutMe || "";

  renderAboutBlocos();

  document.getElementById("moodTexto").textContent = perfil.mood;
  document.getElementById("btnMoodEmoji").textContent = perfil.moodEmoji || "😐";
  aplicarAvatarNorth(
    document.getElementById("perfilFotoNorth"),
    perfil.foto,
    perfil.nome
  );

  document.getElementById("statNorths").textContent = posts.length;
}

function renderNorths(containerId, limite) {
  const northsLista = document.getElementById(containerId);
  northsLista.innerHTML = "";

  const listaExibir = limite ? posts.slice(0, limite) : posts;

  if (listaExibir.length === 0) {
    northsLista.innerHTML = '<p class="norths-vazio">nenhum north ainda. que tal escrever o primeiro?</p>';
    return;
  }

  listaExibir.forEach(function (post) {
    const indice = posts.indexOf(post);

    const item = document.createElement("div");
    item.className = "north-item";

    const avatar = document.createElement("div");
    avatar.className = "north-avatar";
   aplicarAvatarNorth(avatar, perfil.foto, perfil.nome);

    const corpo = document.createElement("div");
    corpo.className = "north-corpo";

    const topo = document.createElement("div");
    topo.className = "north-topo";
    const autor = document.createElement("strong");
autor.textContent = "." + nomeNorth(perfil.nome);

const dataPost = document.createElement("span");
dataPost.textContent = formatarData(post.data);

topo.append(autor, dataPost);

    corpo.appendChild(topo);

    if (post.texto) {
      const textoEl = document.createElement("p");
      textoEl.className = "north-texto";
      textoEl.textContent = post.texto;
      corpo.appendChild(textoEl);
    }

    if (post.imagem) {
      const imgEl = document.createElement("img");
      imgEl.className = "north-imagem";
      imgEl.src = post.imagem;
      corpo.appendChild(imgEl);
    }

    const acoes = document.createElement("div");
    acoes.className = "north-acoes";

    const curtirEl = document.createElement("span");
    curtirEl.innerHTML = (post.curtido ? "♥" : "♡") + " curtir (" + (post.curtidas || 0) + ")";
    curtirEl.style.cursor = "pointer";
    curtirEl.addEventListener("click", function () {
      const curtido = !post.curtido;
      const novosPosts = posts.map(function (item) {
        return item === post ? Object.assign({}, item, {
          curtido: curtido,
          curtidas: Math.max(0, (item.curtidas || 0) + (curtido ? 1 : -1))
        }) : item;
      });
      if (!northMidia.gravar("meusPosts", novosPosts)) return;
      posts = novosPosts;
      renderNorths("northsLista", 4);
      if (document.getElementById("viewNorths").classList.contains("show")) {
        renderNorths("northsListaCompleta");
      }
    });

    const apagarEl = document.createElement("span");
    apagarEl.textContent = "apagar";
    apagarEl.style.cursor = "pointer";
    apagarEl.addEventListener("click", function () {
      if (!confirm("Apagar este north?")) return;
      const novosPosts = posts.filter(function (item) { return item !== post; });
      if (!northMidia.gravar("meusPosts", novosPosts)) return;
      posts = novosPosts;
      renderPerfil();
      renderNorths("northsLista", 4);
      if (document.getElementById("viewNorths").classList.contains("show")) {
        renderNorths("northsListaCompleta");
      }
    });
         acoes.appendChild(curtirEl);
    acoes.appendChild(apagarEl);
    if (post.imagem) {
      const baixarFoto = document.createElement("button");
      baixarFoto.type = "button";
      baixarFoto.textContent = "baixar foto";
      baixarFoto.addEventListener("click", function () {
        northMidia.baixar(post.imagem, "north-foto");
      });
      const removerFoto = document.createElement("button");
      removerFoto.type = "button";
      removerFoto.textContent = "remover foto";
      removerFoto.addEventListener("click", function () {
        const temTexto = Boolean(String(post.texto || "").trim());
        const aviso = temTexto
          ? "Remover só a foto e manter o texto deste north?"
          : "Este north só tem uma foto. Removê-la também apagará o north. Continuar?";
        if (!confirm(aviso)) return;
        const novosPosts = temTexto
          ? posts.map(function (item) { return item === post ? Object.assign({}, item, { imagem: "" }) : item; })
          : posts.filter(function (item) { return item !== post; });
        if (!northMidia.gravar("meusPosts", novosPosts)) return;
        posts = novosPosts;
        renderPerfil();
        renderNorths("northsLista", 4);
        if (document.getElementById("viewNorths").classList.contains("show")) {
          renderNorths("northsListaCompleta");
        }
      });
      acoes.append(baixarFoto, removerFoto);
    }
    corpo.appendChild(acoes);
    item.appendChild(avatar);
    item.appendChild(corpo);
    northsLista.appendChild(item);
  });
}

function formatarData(isoString) {
  const data = new Date(isoString);
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Comentários dos norths, salvos dentro do próprio post.
function criarComentariosNorth(post, containerId) {
  if (!post.id) {
    post.id = crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }

  const comentarios = Array.isArray(post.comentarios) ? post.comentarios : [];
  const painel = document.createElement("div");
  painel.className = "north-comentarios";
  painel.dataset.northId = String(post.id);
  painel.id = "comentarios-" + containerId + "-" + posts.indexOf(post);
  painel.hidden = true;

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "north-comentar";
  botao.dataset.northId = String(post.id);
  botao.textContent = "comentar (" + comentarios.length + ")";
  botao.setAttribute("aria-expanded", "false");
  botao.setAttribute("aria-controls", painel.id);
  botao.addEventListener("click", function () {
    painel.hidden = !painel.hidden;
    botao.setAttribute("aria-expanded", String(!painel.hidden));
    if (!painel.hidden) campo.focus();
  });

  const lista = document.createElement("div");
  lista.className = "north-comentarios-lista";
  lista.setAttribute("aria-live", "polite");
  renderComentariosNorth(lista, comentarios);

  const formulario = document.createElement("form");
  formulario.className = "north-comentario-formulario";
  const campo = document.createElement("textarea");
  campo.rows = 2;
  campo.maxLength = 500;
  campo.placeholder = "escreva um comentário...";
  campo.setAttribute("aria-label", "comentário para este north");

  const enviar = document.createElement("button");
  enviar.type = "submit";
  enviar.textContent = "enviar comentário";
  formulario.append(campo, enviar);

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (!texto || texto.length > campo.maxLength) return;
    const atual = posts.find(function (item) { return String(item.id) === String(post.id); });
    if (!atual) return;

    const anteriores = Array.isArray(atual.comentarios) ? atual.comentarios : [];
    const novos = anteriores.concat({
      autor: "." + nomeNorth(perfil.nome),
      fotoAutor: perfil.foto || "",
      texto: texto,
      data: new Date().toISOString()
    });
    const novosPosts = posts.map(function (item) {
      return item === atual ? Object.assign({}, item, { comentarios: novos }) : item;
    });

    try {
      localStorage.setItem("meusPosts", JSON.stringify(novosPosts));
    } catch (erro) {
      alert("não foi possível salvar o comentário. Verifique o espaço do navegador.");
      return;
    }

    atual.comentarios = novos;
    campo.value = "";
    // Atualiza as duas listas sem recriar os formulários ou apagar rascunhos.
    document.querySelectorAll(".north-comentarios").forEach(function (area) {
      if (area.dataset.northId === String(atual.id)) {
        renderComentariosNorth(area.querySelector(".north-comentarios-lista"), novos);
      }
    });
    document.querySelectorAll(".north-comentar").forEach(function (controle) {
      if (controle.dataset.northId === String(atual.id)) {
        controle.textContent = "comentar (" + novos.length + ")";
      }
    });
    campo.focus();
  });

  painel.append(lista, formulario);
  return { botao: botao, painel: painel };
}

function renderComentariosNorth(lista, comentarios) {
  lista.replaceChildren();
  if (!comentarios.length) {
    const vazio = document.createElement("p");
    vazio.className = "north-comentarios-vazio";
    vazio.textContent = "nenhum comentário ainda. abra a conversa ✳";
    lista.appendChild(vazio);
    return;
  }

  comentarios.forEach(function (comentario) {
    const item = document.createElement("div");
    item.className = "north-comentario-item";
    const avatar = document.createElement("div");
    avatar.className = "north-comentario-avatar";
    aplicarAvatarNorth(avatar, comentario.fotoAutor || "", comentario.autor || "usuário");

    const corpo = document.createElement("div");
    corpo.className = "north-comentario-corpo";
    const autor = document.createElement("strong");
    autor.textContent = comentario.autor || ".usuário";
    const horario = document.createElement("time");
    const data = new Date(comentario.data);
    if (!Number.isNaN(data.getTime())) {
      horario.dateTime = data.toISOString();
      horario.textContent = formatarData(comentario.data);
    }
    const texto = document.createElement("p");
    texto.textContent = comentario.texto || "";
    corpo.append(autor, horario, texto);
    item.append(avatar, corpo);
    lista.appendChild(item);
  });
}

// compositor de norths
const campoNorth = document.getElementById("campoNorth");
const campoImagemNorth = document.getElementById("campoImagemNorth");
const previewNorth = document.getElementById("previewNorth");
const btnPublicarNorth = document.getElementById("btnPublicarNorth");
let imagemNorthPendente = "";
let leituraImagemNorth = 0;
let preparandoNorth = false;

campoImagemNorth.addEventListener("change", async function () {
  const arquivo = campoImagemNorth.files[0];
  const leituraAtual = ++leituraImagemNorth;
  imagemNorthPendente = "";
  previewNorth.removeAttribute("src");
  previewNorth.style.display = "none";
  preparandoNorth = false;
  btnPublicarNorth.disabled = false;
  if (!arquivo) return;
  preparandoNorth = true;
  btnPublicarNorth.disabled = true;
  try {
    const imagem = await northMidia.prepararImagem(arquivo);
    if (leituraAtual !== leituraImagemNorth) return;
    imagemNorthPendente = imagem;
    previewNorth.src = imagem;
    previewNorth.style.display = "block";
  } catch (erro) {
    if (leituraAtual !== leituraImagemNorth) return;
    campoImagemNorth.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraImagemNorth) {
      preparandoNorth = false;
      btnPublicarNorth.disabled = false;
    }
  }
});

btnPublicarNorth.addEventListener("click", function () {
  if (preparandoNorth) return;
  const texto = campoNorth.value.trim();
  if (texto.length > 280) return;
  if (!texto && !imagemNorthPendente) {
    alert("Escreva algo ou escolha uma foto!");
    return;
  }
  criarNorth(texto, imagemNorthPendente);
});

function criarNorth(texto, imagemBase64) {
  const novo = {
    texto: texto,
    imagem: imagemBase64,
    data: new Date().toISOString(),
    curtido: false,
    curtidas: 0
  };
  const novosPosts = [novo].concat(posts);
  if (!northMidia.gravar("meusPosts", novosPosts)) return false;
  posts = novosPosts;
  campoNorth.value = "";
  campoImagemNorth.value = "";
  imagemNorthPendente = "";
  previewNorth.removeAttribute("src");
  previewNorth.style.display = "none";
  renderPerfil();
  renderNorths("northsLista", 4);
  if (document.getElementById("viewNorths").classList.contains("show")) {
    renderNorths("northsListaCompleta");
  }
  return true;
}

// view: todos os norths
document.getElementById("linkViewAllNorths").addEventListener("click", function (evento) {
  evento.preventDefault();
  renderNorths("northsListaCompleta");
  mostrarViewGrupo("viewNorths");
});

document.getElementById("voltarDeNorths").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("viewNorths").classList.remove("show");
  document.querySelector(".pagina-corpo").style.display = "";
  document.querySelector(".guestbook").style.display = "";
});

// modal de editar perfil
// modal de editar perfil
const overlayEditar = document.getElementById("overlayEditar");
const btnEditarPerfil = document.getElementById("btnEditarPerfil");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const inputFotoPerfil = document.getElementById("inputFotoPerfil");
const previewFotoPerfil = document.getElementById("previewFotoPerfil");
const inputNome = document.getElementById("inputNome");
const inputCitacao = document.getElementById("inputCitacao");
const inputAboutMe = document.getElementById("inputAboutMe");
const inputMood = document.getElementById("inputMood");

let fotoPerfilPendente = "";
let leituraFotoPerfil = 0;

function atualizarPreviewPerfil() {
  aplicarAvatarNorth(
    previewFotoPerfil,
    fotoPerfilPendente,
    inputNome.value
  );

  document.getElementById("btnRemoverFotoPerfil").hidden =
    !fotoPerfilPendente;
}

function fecharEdicaoPerfil() {
  leituraFotoPerfil++;
  btnSalvarEdicao.disabled = false;
  overlayEditar.classList.remove("show");
}

btnEditarPerfil.addEventListener("click", function () {
  inputFotoPerfil.value = "";
  fotoPerfilPendente = perfil.foto || "";

  inputNome.value = nomeNorth(perfil.nome);
  inputCitacao.value = perfil.citacao;
  inputAboutMe.value = perfil.aboutMe;
  inputMood.value = perfil.mood;

  atualizarPreviewPerfil();
  overlayEditar.classList.add("show");
});

btnCancelarEdicao.addEventListener("click", fecharEdicaoPerfil);

overlayEditar.addEventListener("click", function (evento) {
  if (evento.target === overlayEditar) fecharEdicaoPerfil();
});

inputNome.addEventListener("input", function () {
  if (!fotoPerfilPendente) atualizarPreviewPerfil();
});

document.getElementById("btnRemoverFotoPerfil").addEventListener("click", function () {
  leituraFotoPerfil++;
  inputFotoPerfil.value = "";
  fotoPerfilPendente = "";
  btnSalvarEdicao.disabled = false;
  atualizarPreviewPerfil();
});

inputFotoPerfil.addEventListener("change", async function () {
  const arquivo = inputFotoPerfil.files[0];
  if (!arquivo) return;
  const leituraAtual = ++leituraFotoPerfil;
  btnSalvarEdicao.disabled = true;
  try {
    const imagem = await northMidia.prepararImagem(arquivo, 512);
    if (leituraAtual !== leituraFotoPerfil) return;
    fotoPerfilPendente = imagem;
    atualizarPreviewPerfil();
  } catch (erro) {
    if (leituraAtual !== leituraFotoPerfil) return;
    inputFotoPerfil.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraFotoPerfil) btnSalvarEdicao.disabled = false;
  }
});

btnSalvarEdicao.addEventListener("click", function () {
  const atualizado = Object.assign({}, perfil, {
    nome: nomeNorth(inputNome.value),
    foto: fotoPerfilPendente,
    citacao: inputCitacao.value.trim() || "adicione uma citação.",
    aboutMe: inputAboutMe.value.trim() || "conte um pouco sobre você aqui.",
    mood: inputMood.value.trim() || "tranquila."
  });

    if (!northMidia.gravar("meuPerfil", atualizado)) return;

  perfil = atualizado;
  renderPerfil();
  renderNorths("northsLista", 4);

  if (document.getElementById("viewNorths").classList.contains("show")) {
    renderNorths("northsListaCompleta");
  }

  fecharEdicaoPerfil();
});

// Blocos opcionais abaixo do texto principal do about me.
function renderAboutBlocos() {
  const lista = document.getElementById("aboutBlocos");
  lista.replaceChildren();

  const blocos = Array.isArray(perfil.aboutBlocos)
    ? perfil.aboutBlocos
    : [];

  blocos.forEach(function (bloco, indice) {
    if (!bloco || !["imagem", "link"].includes(bloco.tipo)) return;

    const card = document.createElement("div");
    card.className = "about-bloco";

    if (bloco.tipo === "imagem") {
      if (!bloco.conteudo) return;

      const imagem = document.createElement("img");
      imagem.src = bloco.conteudo;
      imagem.alt = bloco.legenda || "imagem do about me";
      card.appendChild(imagem);

      if (bloco.legenda) {
        const legenda = document.createElement("small");
        legenda.textContent = bloco.legenda;
        card.appendChild(legenda);
      }
    } else {
      let url;

      try {
        url = new URL(bloco.url);
      } catch (erro) {
        return;
      }

      if (!["http:", "https:"].includes(url.protocol)) return;

      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "↗ " + (bloco.titulo || url.hostname);
      card.appendChild(link);
    }

    const acoes = document.createElement("div");
    acoes.className = "about-bloco-acoes";

    function acao(rotulo, fn, desativado) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = rotulo;
      botao.disabled = !!desativado;
      botao.addEventListener("click", fn);
      acoes.appendChild(botao);
    }

    acao("↑", function () {
      moverAboutBloco(indice, -1);
    }, indice === 0);

    acao("↓", function () {
      moverAboutBloco(indice, 1);
    }, indice === blocos.length - 1);

    acao("editar", function () {
      abrirAboutBloco(indice);
    });

    acao("excluir", function () {
      if (!confirm("excluir este bloco do about me?")) return;

      salvarAboutBlocos(
        blocos.filter(function (_, posicao) {
          return posicao !== indice;
        })
      );
    });

    card.appendChild(acoes);
    lista.appendChild(card);
  });
}

function salvarAboutBlocos(blocos) {
  const atualizado = Object.assign({}, perfil, {
    aboutBlocos: blocos
  });

    if (!northMidia.gravar("meuPerfil", atualizado)) return false;

  perfil = atualizado;
  renderAboutBlocos();
  return true;
}

function moverAboutBloco(indice, direcao) {
  const blocos = Array.isArray(perfil.aboutBlocos)
    ? perfil.aboutBlocos.slice()
    : [];

  const destino = indice + direcao;
  if (destino < 0 || destino >= blocos.length) return;

  [blocos[indice], blocos[destino]] =
    [blocos[destino], blocos[indice]];

  salvarAboutBlocos(blocos);
}

let indiceAboutEditando = null;
let imagemAboutPendente = "";
let leituraImagemAbout = 0;

const overlayAboutBloco = document.getElementById("overlayAboutBloco");

function mostrarCamposAbout() {
  const imagem =
    document.getElementById("tipoAboutBloco").value === "imagem";

  document.getElementById("camposAboutImagem").hidden = !imagem;
  document.getElementById("camposAboutLink").hidden = imagem;
}

function mostrarPreviewAbout() {
  const preview = document.getElementById("previewAboutImagem");
  preview.hidden = !imagemAboutPendente;

  if (imagemAboutPendente) {
    preview.src = imagemAboutPendente;
  } else {
    preview.removeAttribute("src");
  }
}

function abrirAboutBloco(indice) {
  const blocos = Array.isArray(perfil.aboutBlocos)
    ? perfil.aboutBlocos
    : [];

  const bloco = indice == null ? null : blocos[indice];
  if (indice != null && !bloco) return;

  indiceAboutEditando = indice;
  imagemAboutPendente =
    bloco && bloco.tipo === "imagem" ? bloco.conteudo : "";

  document.getElementById("tituloAboutBloco").textContent =
    bloco ? "editar bloco" : "adicionar ao about me";

  document.getElementById("tipoAboutBloco").value =
    bloco ? bloco.tipo : "imagem";

  document.getElementById("inputAboutLegenda").value =
    bloco && bloco.tipo === "imagem" ? bloco.legenda || "" : "";

  document.getElementById("inputAboutTitulo").value =
    bloco && bloco.tipo === "link" ? bloco.titulo : "";

  document.getElementById("inputAboutURL").value =
    bloco && bloco.tipo === "link" ? bloco.url : "";

  document.getElementById("inputAboutImagem").value = "";

  mostrarCamposAbout();
  mostrarPreviewAbout();
  overlayAboutBloco.classList.add("show");
}

function fecharAboutBloco() {
  leituraImagemAbout++;
  document.getElementById("btnSalvarAboutBloco").disabled = false;
  overlayAboutBloco.classList.remove("show");
  indiceAboutEditando = null;
}

document.getElementById("btnAdicionarAbout").addEventListener("click", function () {
  abrirAboutBloco(null);
});

document.getElementById("btnCancelarAboutBloco").addEventListener(
  "click",
  fecharAboutBloco
);

overlayAboutBloco.addEventListener("click", function (evento) {
  if (evento.target === overlayAboutBloco) fecharAboutBloco();
});

document.getElementById("tipoAboutBloco").addEventListener(
  "change",
  mostrarCamposAbout
);

document.getElementById("inputAboutImagem").addEventListener("change", async function (evento) {
  const input = evento.target;
  const arquivo = input.files[0];
  if (!arquivo) return;
  const leituraAtual = ++leituraImagemAbout;
  const botao = document.getElementById("btnSalvarAboutBloco");
  botao.disabled = true;
  try {
    const imagem = await northMidia.prepararImagem(arquivo);
    if (leituraAtual !== leituraImagemAbout) return;
    imagemAboutPendente = imagem;
    mostrarPreviewAbout();
  } catch (erro) {
    if (leituraAtual !== leituraImagemAbout) return;
    input.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraImagemAbout) botao.disabled = false;
  }
});

document.getElementById("btnSalvarAboutBloco").addEventListener("click", function () {
  const tipo = document.getElementById("tipoAboutBloco").value;
  let bloco;

  if (tipo === "imagem") {
    if (!imagemAboutPendente) {
      alert("escolha uma imagem.");
      return;
    }

    bloco = {
      tipo: "imagem",
      conteudo: imagemAboutPendente,
      legenda: document.getElementById("inputAboutLegenda").value.trim()
    };

  } else if (tipo === "link") {
    const titulo =
      document.getElementById("inputAboutTitulo").value.trim();

    let url;

    try {
      url = new URL(
        document.getElementById("inputAboutURL").value.trim()
      );
    } catch (erro) {
      alert("digite um link completo, começando com https://.");
      return;
    }

    if (!titulo || !["http:", "https:"].includes(url.protocol)) {
      alert("informe um título e um link http ou https.");
      return;
    }

    bloco = {
      tipo: "link",
      titulo: titulo,
      url: url.href
    };

  } else {
    return;
  }

  const blocos = Array.isArray(perfil.aboutBlocos)
    ? perfil.aboutBlocos.slice()
    : [];

  if (indiceAboutEditando === null) {
    if (blocos.length >= 12) {
      alert("o about me aceita até 12 blocos.");
      return;
    }

    blocos.push(bloco);
  } else {
    blocos[indiceAboutEditando] = bloco;
  }

  if (salvarAboutBlocos(blocos)) fecharAboutBloco();
});


// logout
document.getElementById("navLogout").addEventListener("click", function (evento) {
  evento.preventDefault();
  localStorage.setItem("northnetLogado", "false");
  window.location.href = "../north-net-portal/login.html";
});

// my icons
const listaEmojisIcones = ["⭐","📼","👟","💗","🎧","📷","🎮","💌","🌙","🌸","☕","🎀","🕹️","📻","💾","🧸","🎬","🍒","🦋","✨"];

perfil.icones = perfil.icones || ["⭐","📼","👟","💗"];

function renderIcones() {
  const spans = document.querySelectorAll("#iconesGrid .icone-item");
  spans.forEach(function (span, i) {
    span.textContent = perfil.icones[i];
  });
}
renderIcones();

let indiceIconeEditando = null;
const overlayIcones = document.getElementById("overlayIcones");
const iconesOpcoes = document.getElementById("iconesOpcoes");

listaEmojisIcones.forEach(function (emoji) {
  const btn = document.createElement("span");
  btn.className = "icone-opcao";
  btn.textContent = emoji;
  btn.addEventListener("click", function () {
    perfil.icones[indiceIconeEditando] = emoji;
    localStorage.setItem("meuPerfil", JSON.stringify(perfil));
    renderIcones();
    overlayIcones.classList.remove("show");
  });
  iconesOpcoes.appendChild(btn);
});

document.querySelectorAll("#iconesGrid .icone-item").forEach(function (span) {
  span.addEventListener("click", function () {
    indiceIconeEditando = parseInt(span.getAttribute("data-index"));
    overlayIcones.classList.add("show");
  });
});

document.getElementById("btnCancelarIcone").addEventListener("click", function () {
  overlayIcones.classList.remove("show");
});

overlayIcones.addEventListener("click", function (evento) {
  if (evento.target === overlayIcones) {
    overlayIcones.classList.remove("show");
  }
});

// memories
let memorias = JSON.parse(localStorage.getItem("minhasMemorias")) || [];

function renderMemoriaPrincipal() {
  const foto = document.getElementById("memoriaFotoPrincipal");
  const texto = document.getElementById("memoriaTextoPrincipal");
  if (!memorias.length) {
    foto.style.backgroundImage = "";
    texto.textContent = "nenhuma memória ainda.";
    return;
  }
  foto.style.backgroundImage = "url(" + JSON.stringify(memorias[0].foto) + ")";
  foto.style.backgroundSize = "cover";
  foto.style.backgroundPosition = "center";
  texto.textContent = memorias[0].legenda;
}

function renderGridMemorias() {
  const grid = document.getElementById("gridTodasMemorias");
  grid.replaceChildren();
  if (!memorias.length) {
    grid.innerHTML = '<p class="norths-vazio">nenhuma memory ainda.</p>';
    return;
  }
  memorias.forEach(function (mem) {
    const card = document.createElement("div");
    card.className = "memoria-card";
    const foto = document.createElement("div");
    foto.className = "memoria-card-foto";
    foto.style.backgroundImage = "url(" + JSON.stringify(mem.foto) + ")";
    const legenda = document.createElement("div");
    legenda.className = "memoria-card-legenda";
    const texto = document.createElement("span");
    texto.textContent = mem.legenda;
    const acoes = document.createElement("div");
    acoes.className = "memoria-acoes";

    function acao(rotulo, callback) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = rotulo;
      botao.addEventListener("click", callback);
      acoes.appendChild(botao);
    }
    acao("baixar", function () { northMidia.baixar(mem.foto, "memory-northnet"); });
    acao("substituir", function () { abrirFormularioMemoria(mem); });
    acao("apagar", function () {
      if (!confirm("Apagar esta memory?")) return;
      const novas = memorias.filter(function (item) { return item !== mem; });
      if (!northMidia.gravar("minhasMemorias", novas)) return;
      memorias = novas;
      renderMemoriaPrincipal();
      renderGridMemorias();
    });
    legenda.append(texto, acoes);
    card.append(foto, legenda);
    grid.appendChild(card);
  });
}

renderMemoriaPrincipal();

const overlayMemoria = document.getElementById("overlayMemoria");
const inputFotoMemoria = document.getElementById("inputFotoMemoria");
const previewMemoria = document.getElementById("previewMemoria");
const inputLegendaMemoria = document.getElementById("inputLegendaMemoria");
const seletorMemoria = document.getElementById("memoriaSubstituir");
let imagemMemoriaPendente = "";
let leituraImagemMemoria = 0;
let memoriasNoFormulario = [];

function abrirFormularioMemoria(alvo = null) {
  leituraImagemMemoria++;
  imagemMemoriaPendente = "";
  inputFotoMemoria.value = "";
  inputLegendaMemoria.value = alvo ? alvo.legenda || "" : "";
  previewMemoria.removeAttribute("src");
  previewMemoria.style.display = "none";
  document.getElementById("btnSalvarMemoria").disabled = false;
  memoriasNoFormulario = memorias.slice();
  seletorMemoria.replaceChildren();
  const opcaoInicial = document.createElement("option");
  opcaoInicial.value = "";
  opcaoInicial.textContent = "escolha a memory que será substituída";
  seletorMemoria.appendChild(opcaoInicial);
  memoriasNoFormulario.forEach(function (mem, indice) {
    const opcao = document.createElement("option");
    opcao.value = String(indice);
    opcao.textContent = (indice + 1) + ". " + (mem.legenda || "sem legenda");
    seletorMemoria.appendChild(opcao);
  });
  if (alvo) seletorMemoria.value = String(memoriasNoFormulario.indexOf(alvo));
  document.getElementById("memoriaSubstituicao").hidden = !alvo && memorias.length < northMidia.limites.memorias;
  document.getElementById("memoriaContador").textContent = memorias.length + " de 10 memories. " +
    (memorias.length > 10
      ? "As antigas foram preservadas. Apague as que escolher para ficar dentro do limite."
      : "Ao chegar a 10, escolha uma para substituir.");
  overlayMemoria.classList.add("show");
}

function fecharFormularioMemoria() {
  leituraImagemMemoria++;
  imagemMemoriaPendente = "";
  document.getElementById("btnSalvarMemoria").disabled = false;
  overlayMemoria.classList.remove("show");
}

document.getElementById("btnAddMemoria").addEventListener("click", function () {
  abrirFormularioMemoria();
});
document.getElementById("btnCancelarMemoria").addEventListener("click", fecharFormularioMemoria);
overlayMemoria.addEventListener("click", function (evento) {
  if (evento.target === overlayMemoria) fecharFormularioMemoria();
});

inputFotoMemoria.addEventListener("change", async function () {
  const arquivo = inputFotoMemoria.files[0];
  if (!arquivo) return;
  const leituraAtual = ++leituraImagemMemoria;
  const botao = document.getElementById("btnSalvarMemoria");
  botao.disabled = true;
  imagemMemoriaPendente = "";
  previewMemoria.style.display = "none";
  try {
    const imagem = await northMidia.prepararImagem(arquivo);
    if (leituraAtual !== leituraImagemMemoria) return;
    imagemMemoriaPendente = imagem;
    previewMemoria.src = imagem;
    previewMemoria.style.display = "block";
  } catch (erro) {
    if (leituraAtual !== leituraImagemMemoria) return;
    inputFotoMemoria.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraImagemMemoria) botao.disabled = false;
  }
});

document.getElementById("btnSalvarMemoria").addEventListener("click", function () {
  if (document.getElementById("btnSalvarMemoria").disabled) return;
  if (!imagemMemoriaPendente) {
    alert("Escolha uma foto e confira a prévia antes de salvar.");
    return;
  }
  const precisaSubstituir = !document.getElementById("memoriaSubstituicao").hidden;
  if (precisaSubstituir && seletorMemoria.value === "") {
    alert("Escolha qual memory deseja substituir.");
    return;
  }
  const novas = memorias.slice();
  if (precisaSubstituir) {
    const alvo = memoriasNoFormulario[Number(seletorMemoria.value)];
    const indice = novas.indexOf(alvo);
    if (indice < 0) {
      alert("Essa memory já foi removida. Abra o formulário novamente.");
      return;
    }
    if (!confirm("Substituir a memory escolhida? Baixe a foto antiga antes, se quiser guardá-la.")) return;
    novas.splice(indice, 1);
  }
  novas.unshift({
    foto: imagemMemoriaPendente,
    legenda: inputLegendaMemoria.value.trim() || "sem legenda.",
    data: new Date().toISOString()
  });
  if (!northMidia.gravar("minhasMemorias", novas)) return;
  memorias = novas;
  renderMemoriaPrincipal();
  renderGridMemorias();
  fecharFormularioMemoria();
});

// navegação da view "todas as memories"
document.getElementById("linkViewAllMemorias").addEventListener("click", function (evento) {
  evento.preventDefault();
  renderGridMemorias();
  mostrarViewGrupo("viewMemorias");
});

document.getElementById("voltarDeMemorias").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("viewMemorias").classList.remove("show");
  document.querySelector(".pagina-corpo").style.display = "";
  document.querySelector(".guestbook").style.display = "";
});

// groups: IDs persistem para que edição e navegação não dependam da posição na lista.
let grupos = JSON.parse(localStorage.getItem("meusGrupos")) || [
  { nome: "poetas do norte", bio: "pra quem escreve pra não desaparecer." },
  { nome: "fotografia analógica", bio: "cliques que não se apagam." }
];

function idNovoGrupo() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

function usuarioAtualGrupo() {
  return "." + String(perfil.nome || "seu nome").replace(/^\.+/, "").trim();
}

let migrouGrupos = false;
const idsGrupos = new Set();

grupos.forEach(function (grupo) {
  if (!grupo.id || idsGrupos.has(String(grupo.id))) {
    grupo.id = idNovoGrupo();
    migrouGrupos = true;
  }

  idsGrupos.add(String(grupo.id));

  if (!Array.isArray(grupo.membros)) {
    grupo.membros = [];
    migrouGrupos = true;
  }
});

if (migrouGrupos) {
  northMidia.gravar("meusGrupos", grupos);
}

function obterGrupo(id) {
  return grupos.find(function (grupo) {
    return String(grupo.id) === String(id);
  });
}

function mostrarViewGrupo(viewId) {
  document.querySelectorAll(".view-pagina").forEach(function (view) {
    view.classList.remove("show");
  });

  document.querySelector(".pagina-corpo").style.display = "none";
  document.querySelector(".guestbook").style.display = "none";
  document.getElementById(viewId).classList.add("show");
}

function abrirListaGrupos() {
  renderTodosGrupos();
  mostrarViewGrupo("viewGrupos");
}

function renderGruposResumo() {
  const lista = document.getElementById("listaGruposResumo");
  lista.replaceChildren();

  grupos.slice(0, 4).forEach(function (grupo) {
    const li = document.createElement("li");
    const link = document.createElement("button");
    link.type = "button";
    link.className = "grupo-resumo-link";

    const nome = document.createElement("strong");
    nome.textContent = grupo.nome;

    const bio = document.createElement("span");
    bio.textContent = grupo.bio || "sem descrição.";

    link.append(nome, bio);
    link.addEventListener("click", function () {
      abrirGrupo(grupo.id);
    });

    li.appendChild(link);
    lista.appendChild(li);
  });

  document.getElementById("statGroups").textContent = grupos.length;
}

function renderTodosGrupos() {
  const lista = document.getElementById("listaTodosGrupos");
  lista.replaceChildren();

  if (!grupos.length) {
    lista.innerHTML = '<p class="norths-vazio">nenhum grupo ainda.</p>';
    return;
  }

  grupos.forEach(function (grupo) {
    const card = document.createElement("div");
    card.className = "grupo-card";

    const info = document.createElement("button");
    info.type = "button";
    info.className = "grupo-card-info grupo-card-abrir";

    const nome = document.createElement("strong");
    nome.textContent = grupo.nome;

    const bio = document.createElement("p");
    bio.textContent = grupo.bio || "sem descrição.";

    info.append(nome, bio);
    info.addEventListener("click", function () {
      abrirGrupo(grupo.id);
    });

    const acoes = document.createElement("div");
    acoes.className = "grupo-card-acoes";

    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "grupo-card-editar";
    editar.textContent = "editar";
    editar.addEventListener("click", function () {
      abrirEdicaoGrupo(grupo.id);
    });

    const apagar = document.createElement("button");
    apagar.type = "button";
    apagar.className = "grupo-card-apagar";
    apagar.textContent = "apagar";
    apagar.addEventListener("click", function () {
      if (!confirm("Apagar este grupo?")) return;
      const novosGrupos = grupos.filter(function (item) {
        return String(item.id) !== String(grupo.id);
      });
      if (!northMidia.gravar("meusGrupos", novosGrupos)) return;
      grupos = novosGrupos;
      renderGruposResumo();
      renderTodosGrupos();
    });

    acoes.append(editar, apagar);
    card.append(info, acoes);
    lista.appendChild(card);
  });
}

renderGruposResumo();

let editandoGrupoId = null;
let grupoAbertoId = null;
let imagemGrupoPendente = "";
let grupoVoltarPara = "viewGrupos";

const overlayGrupo = document.getElementById("overlayGrupo");
const inputImagemGrupo = document.getElementById("inputImagemGrupo");
const previewImagemGrupo = document.getElementById("previewImagemGrupo");

function atualizarPreviewGrupo() {
  previewImagemGrupo.style.display = imagemGrupoPendente ? "block" : "none";

  if (imagemGrupoPendente) {
    previewImagemGrupo.src = imagemGrupoPendente;
  } else {
    previewImagemGrupo.removeAttribute("src");
  }
}

function abrirFormularioGrupo(id) {
  leituraImagemGrupo++;
  document.getElementById("btnSalvarGrupo").disabled = false;
  const grupo = id == null ? null : obterGrupo(id);
  if (id != null && !grupo) return;

  editandoGrupoId = grupo ? grupo.id : null;

  document.getElementById("tituloGrupo").textContent =
    grupo ? "editar grupo" : "criar novo grupo";

  document.getElementById("btnSalvarGrupo").textContent =
    grupo ? "salvar alterações" : "criar grupo";

  document.getElementById("inputNomeGrupo").value =
    grupo ? grupo.nome : "";

  document.getElementById("inputBioGrupo").value =
    grupo ? grupo.bio || "" : "";

  document.getElementById("inputIdiomaGrupo").value =
    grupo ? grupo.idioma || "Português" : "Português";

  document.getElementById("inputCategoriaGrupo").value =
    grupo ? grupo.categoria || "" : "";

  document.getElementById("inputLocalGrupo").value =
    grupo ? grupo.local || "" : "";

  inputImagemGrupo.value = "";
  imagemGrupoPendente = grupo ? grupo.imagem || "" : "";

  atualizarPreviewGrupo();
  overlayGrupo.classList.add("show");
}

function abrirEdicaoGrupo(id) {
  abrirFormularioGrupo(id);
}

function fecharFormularioGrupo() {
  leituraImagemGrupo++;
  overlayGrupo.classList.remove("show");
  editandoGrupoId = null;
  inputImagemGrupo.value = "";
  document.getElementById("btnSalvarGrupo").disabled = false;
}

document.getElementById("btnAddGrupo").addEventListener("click", function () {
  abrirFormularioGrupo(null);
});

document.getElementById("btnCancelarGrupo").addEventListener(
  "click",
  fecharFormularioGrupo
);

overlayGrupo.addEventListener("click", function (evento) {
  if (evento.target === overlayGrupo) fecharFormularioGrupo();
});

let leituraImagemGrupo = 0;

inputImagemGrupo.addEventListener("change", async function () {
  const arquivo = inputImagemGrupo.files[0];
  if (!arquivo) return;
  const leituraAtual = ++leituraImagemGrupo;
  const botao = document.getElementById("btnSalvarGrupo");
  botao.disabled = true;
  try {
    const imagem = await northMidia.prepararImagem(arquivo);
    if (leituraAtual !== leituraImagemGrupo) return;
    imagemGrupoPendente = imagem;
    atualizarPreviewGrupo();
  } catch (erro) {
    if (leituraAtual !== leituraImagemGrupo) return;
    inputImagemGrupo.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraImagemGrupo) botao.disabled = false;
  }
});

document.getElementById("btnSalvarGrupo").addEventListener("click", function () {
  const nome = document.getElementById("inputNomeGrupo").value.trim();

  if (!nome) {
    alert("dá um nome pro grupo!");
    return;
  }

  const categoria = document.getElementById("inputCategoriaGrupo").value;

  if (!categoria) {
    alert("escolha uma categoria!");
    return;
  }

  const anterior = editandoGrupoId == null
    ? null
    : obterGrupo(editandoGrupoId);

  if (editandoGrupoId != null && !anterior) return;

  const grupo = Object.assign({}, anterior || {}, {
    id: anterior ? anterior.id : idNovoGrupo(),
    nome: nome,
    bio: document.getElementById("inputBioGrupo").value.trim(),
    imagem: imagemGrupoPendente,
    idioma: document.getElementById("inputIdiomaGrupo").value,
    categoria: categoria,
    local: document.getElementById("inputLocalGrupo").value.trim(),
    criadoEm: anterior
      ? anterior.criadoEm || ""
      : new Date().toLocaleDateString("pt-BR"),
    proprietario: anterior
      ? anterior.proprietario || usuarioAtualGrupo()
      : usuarioAtualGrupo(),
    membros: anterior ? anterior.membros : []
  });

  const novaLista = anterior
    ? grupos.map(function (item) {
        return String(item.id) === String(grupo.id) ? grupo : item;
      })
    : [grupo].concat(grupos);

    if (!northMidia.gravar("meusGrupos", novaLista)) return;

  grupos = novaLista;
  renderGruposResumo();
  renderTodosGrupos();

  if (String(grupoAbertoId) === String(grupo.id)) {
    renderGrupoDetalhe();
  }

  fecharFormularioGrupo();
});

document.getElementById("linkViewAllGrupos").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirListaGrupos();
});

document.getElementById("voltarDeGrupos").addEventListener("click", function (evento) {
  evento.preventDefault();
  fecharTudoEVoltarHome();
});

function abrirGrupo(id) {
  if (!obterGrupo(id)) return;

  grupoVoltarPara = document.getElementById("viewGrupos").classList.contains("show")
    ? "viewGrupos"
    : "home";

  grupoAbertoId = id;
  renderGrupoDetalhe();
  mostrarViewGrupo("viewGrupoDetalhe");
}

function renderGrupoDetalhe() {
  const grupo = obterGrupo(grupoAbertoId);

  if (!grupo) {
    abrirListaGrupos();
    return;
  }

  const imagem = document.getElementById("grupoDetalheImagem");
  imagem.replaceChildren();

  if (grupo.imagem) {
    const foto = document.createElement("img");
    foto.src = grupo.imagem;
    foto.alt = "imagem de " + grupo.nome;
    imagem.appendChild(foto);
  } else {
    imagem.textContent = "✳";
  }

  document.getElementById("grupoLateralNome").textContent = grupo.nome;
  document.getElementById("grupoDetalheNome").textContent = grupo.nome;

  const quantidade = grupo.membros.length;
  document.getElementById("grupoLateralMembros").textContent =
    quantidade + (quantidade === 1 ? " membro" : " membros");

  document.getElementById("grupoDetalheIdioma").textContent =
    grupo.idioma || "não informado";

  document.getElementById("grupoDetalheCategoria").textContent =
    grupo.categoria || "não informada";

  document.getElementById("grupoDetalheLocal").textContent =
    grupo.local || "não informado";

  document.getElementById("grupoDetalheData").textContent =
    grupo.criadoEm || "data não registrada";

  document.getElementById("grupoDetalheProprietario").textContent =
    grupo.proprietario || "não registrado";

  document.getElementById("grupoDetalheBio").textContent =
    grupo.bio || "sem descrição ainda.";
renderPainelGrupo(grupo);
  const participando = grupo.membros.includes(usuarioAtualGrupo());

  document.querySelectorAll("[data-participar-grupo]").forEach(function (botao) {
    botao.textContent = participando
      ? "✓ participando · sair"
      : "+ participar do grupo";

    botao.setAttribute("aria-pressed", String(participando));
  });

  document.getElementById("btnEditarGrupoDetalhe").hidden =
    !!grupo.proprietario && grupo.proprietario !== usuarioAtualGrupo();
}

function alternarParticipacaoGrupo() {
  const grupo = obterGrupo(grupoAbertoId);
  if (!grupo) return;

  const usuario = usuarioAtualGrupo();

  const membros = grupo.membros.includes(usuario)
    ? grupo.membros.filter(function (membro) {
        return membro !== usuario;
      })
    : grupo.membros.concat(usuario);

  try {
    localStorage.setItem(
      "meusGrupos",
      JSON.stringify(
        grupos.map(function (item) {
          return item === grupo
            ? Object.assign({}, item, { membros: membros })
            : item;
        })
      )
    );
  } catch (erro) {
    alert("não foi possível salvar a participação.");
    return;
  }

  grupo.membros = membros;
  renderGrupoDetalhe();
}

document.querySelectorAll("[data-participar-grupo]").forEach(function (botao) {
  botao.addEventListener("click", alternarParticipacaoGrupo);
});

document.getElementById("btnEditarGrupoDetalhe").addEventListener("click", function () {
  abrirEdicaoGrupo(grupoAbertoId);
});

document.getElementById("voltarDeGrupoDetalhe").addEventListener("click", function (evento) {
  evento.preventDefault();

  if (grupoVoltarPara === "viewGrupos") {
    abrirListaGrupos();
  } else {
    fecharTudoEVoltarHome();
  }
});

// Membros e chat do grupo.
(function () {
  const el = function (id) { return document.getElementById(id); };
  const campo = el("chatTexto");
  const lista = el("chatMensagens");
  const emojis = ["🙂", "😂", "❤️", "✨", "😭", "🥹", "🔥", "👀", "👍", "💌"];
  let voltarMembrosAoChat = false;
  let usuarioChatId = "";
  let editandoId = null;
  let fotoPendente = "";
  let rascunhoAnterior = null;
  let leituraFoto = 0;
  let lendoFoto = false;

  function mensagensDoGrupo() {
    const grupo = obterGrupo(grupoAbertoId);
    return grupo && Array.isArray(grupo.chatMensagens) ? grupo.chatMensagens : [];
  }

  function minhaMensagem(mensagem) {
    return mensagem.autorId
      ? mensagem.autorId === usuarioChatId
      : mensagem.autor === usuarioAtualGrupo();
  }

  function gravarMensagens(mensagens) {
    const grupo = obterGrupo(grupoAbertoId);
    if (!grupo) return false;
    const atualizado = Object.assign({}, grupo, { chatMensagens: mensagens });
    const novosGrupos = grupos.map(function (item) {
      return String(item.id) === String(grupo.id) ? atualizado : item;
    });
    if (!northMidia.gravar("meusGrupos", novosGrupos)) return false;
    grupos = novosGrupos;
    return true;
  }

  function prepararHistorico() {
    try {
      const salvo = localStorage.getItem("northChatUsuarioId");
      usuarioChatId = salvo || idNovoGrupo();
      if (!salvo) localStorage.setItem("northChatUsuarioId", usuarioChatId);
    } catch (erro) {
      alert("não foi possível preparar o chat. Verifique o espaço do navegador.");
      return false;
    }
    let mudou = false;
    const ids = new Set();
    const mensagens = mensagensDoGrupo().map(function (mensagem) {
      const copia = Object.assign({}, mensagem);
      if (!copia.id || ids.has(String(copia.id))) {
        copia.id = idNovoGrupo();
        mudou = true;
      }
      ids.add(String(copia.id));
      // As mensagens antigas usavam apenas o nome do autor.
      if (!copia.autorId && copia.autor === usuarioAtualGrupo()) {
        copia.autorId = usuarioChatId;
        mudou = true;
      }
      return copia;
    });
    return !mudou || gravarMensagens(mensagens);
  }

  function fecharEmojis() {
    el("chatEmojis").hidden = true;
    el("chatEmoji").setAttribute("aria-expanded", "false");
  }

  function atualizarCompositor() {
    el("chatEdicao").hidden = !editandoId;
    el("chatEnviar").textContent = editandoId ? "salvar" : "enviar";
    el("chatEnviar").disabled = lendoFoto;
    el("chatCamera").disabled = !!editandoId || lendoFoto;
    el("chatAnexo").hidden = !fotoPendente;
    if (fotoPendente) el("chatPreviewFoto").src = fotoPendente;
    else el("chatPreviewFoto").removeAttribute("src");
  }

  function limparCompositor() {
    leituraFoto++;
    lendoFoto = false;
    editandoId = null;
    fotoPendente = "";
    rascunhoAnterior = null;
    campo.value = "";
    el("chatFoto").value = "";
    fecharEmojis();
    atualizarCompositor();
  }

  function terminarEdicao() {
    editandoId = null;
    campo.value = rascunhoAnterior ? rascunhoAnterior.texto : "";
    fotoPendente = rascunhoAnterior ? rascunhoAnterior.foto : "";
    rascunhoAnterior = null;
    fecharEmojis();
    atualizarCompositor();
    campo.focus();
  }

  function editarMensagem(id) {
    const mensagem = mensagensDoGrupo().find(function (item) { return item.id === id; });
    if (!mensagem || !minhaMensagem(mensagem)) return;
    if (!editandoId) rascunhoAnterior = { texto: campo.value, foto: fotoPendente };
    leituraFoto++;
    lendoFoto = false;
    editandoId = id;
    fotoPendente = "";
    campo.value = mensagem.texto || "";
    fecharEmojis();
    atualizarCompositor();
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  }

  function apagarMensagem(id) {
    const mensagem = mensagensDoGrupo().find(function (item) { return item.id === id; });
    if (!mensagem || !minhaMensagem(mensagem)) return;
    if (!confirm("apagar esta mensagem?")) return;
    const novas = mensagensDoGrupo().filter(function (item) { return item.id !== id; });
    if (!gravarMensagens(novas)) return;
    if (editandoId === id) terminarEdicao();
    renderMensagensGrupoChat();
  }

  function reagirMensagem(id, emoji) {
    if (!emojis.includes(emoji)) return;
    const novas = mensagensDoGrupo().map(function (mensagem) {
      if (mensagem.id !== id) return mensagem;
      const reacoes = Object.assign({}, mensagem.reacoes || {});
      const usuarios = Array.isArray(reacoes[emoji]) ? [...new Set(reacoes[emoji])] : [];
      const atualizados = usuarios.includes(usuarioChatId)
        ? usuarios.filter(function (usuario) { return usuario !== usuarioChatId; })
        : usuarios.concat(usuarioChatId);
      if (atualizados.length) reacoes[emoji] = atualizados;
      else delete reacoes[emoji];
      return Object.assign({}, mensagem, { reacoes: reacoes });
    });
    if (gravarMensagens(novas)) renderMensagensGrupoChat();
  }

  function botao(texto, acao, classe) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = texto;
    if (classe) item.className = classe;
    item.addEventListener("click", acao);
    return item;
  }

  function renderMensagensGrupoChat(irParaFim) {
    const posicao = lista.scrollTop;
    lista.replaceChildren();
    const mensagens = mensagensDoGrupo();
    if (!mensagens.length) {
      const aviso = document.createElement("p");
      aviso.className = "chat-vazio";
      aviso.textContent = "a conversa do grupo começa aqui ✳";
      lista.appendChild(aviso);
    }
    mensagens.forEach(function (mensagem) {
      const linha = document.createElement("article");
      linha.className = "chat-linha";
      linha.dataset.mensagemId = mensagem.id;
      const avatar = document.createElement("div");
      avatar.className = "chat-avatar";
      avatar.setAttribute("role", "img");
      avatar.setAttribute("aria-label", "foto de " + (mensagem.autor || "usuário"));
      aplicarAvatarNorth(avatar,
        minhaMensagem(mensagem) ? perfil.foto || "" : mensagem.fotoAutor || "",
        mensagem.autor || "usuário");

      const corpo = document.createElement("div");
      corpo.className = "chat-corpo";
      const bolha = document.createElement("div");
      bolha.className = "chat-bolha";
      const autor = document.createElement("strong");
      autor.textContent = mensagem.autor || ".usuário";
      bolha.appendChild(autor);
      if (mensagem.texto) {
        const texto = document.createElement("p");
        texto.textContent = mensagem.texto;
        bolha.appendChild(texto);
      }
      if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(mensagem.imagem || "")) {
        const foto = document.createElement("img");
        foto.src = mensagem.imagem;
        foto.alt = "foto enviada por " + (mensagem.autor || "um membro");
        bolha.appendChild(foto);
      }
      if (mensagem.editadaEm) {
        const aviso = document.createElement("small");
        aviso.className = "chat-editada";
        aviso.textContent = "editada";
        bolha.appendChild(aviso);
      }
      corpo.appendChild(bolha);

      const reacoes = document.createElement("div");
      reacoes.className = "chat-reacoes";
      emojis.forEach(function (emoji) {
        const usuarios = mensagem.reacoes && mensagem.reacoes[emoji];
        if (!Array.isArray(usuarios) || !usuarios.length) return;
        const reagiu = usuarios.includes(usuarioChatId);
        const item = botao(emoji + " " + new Set(usuarios).size,
          function () { reagirMensagem(mensagem.id, emoji); }, "chat-reacao");
        item.setAttribute("aria-pressed", String(reagiu));
        item.setAttribute("aria-label", (reagiu ? "retirar" : "adicionar") + " reação " + emoji);
        reacoes.appendChild(item);
      });
      corpo.appendChild(reacoes);

      const acoes = document.createElement("div");
      acoes.className = "chat-acoes";
      if (minhaMensagem(mensagem)) {
        acoes.append(
          botao("editar", function () { editarMensagem(mensagem.id); }),
          botao("apagar", function () { apagarMensagem(mensagem.id); })
        );
      }
      const menu = document.createElement("details");
      menu.className = "chat-reagir";
      const titulo = document.createElement("summary");
      titulo.textContent = "reagir";
      const opcoes = document.createElement("div");
      opcoes.className = "chat-opcoes-reacao";
      emojis.forEach(function (emoji) {
        const item = botao(emoji, function () { reagirMensagem(mensagem.id, emoji); });
        item.setAttribute("aria-label", "reagir com " + emoji);
        opcoes.appendChild(item);
      });
      menu.append(titulo, opcoes);
      acoes.appendChild(menu);
      corpo.appendChild(acoes);

      const horario = document.createElement("time");
      horario.className = "chat-horario";
      const data = new Date(mensagem.data);
      if (!Number.isNaN(data.getTime())) {
        horario.dateTime = data.toISOString();
        horario.textContent = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        horario.title = data.toLocaleString("pt-BR");
      }
      linha.append(avatar, corpo, horario);
      lista.appendChild(linha);
    });
    if (irParaFim) requestAnimationFrame(function () { lista.scrollTop = lista.scrollHeight; });
    else lista.scrollTop = posicao;
  }

  el("btnEntrarChatGrupo").addEventListener("click", function () {
    const grupo = obterGrupo(grupoAbertoId);
    if (!grupo || !prepararHistorico()) return;
    limparCompositor();
    voltarMembrosAoChat = false;
    el("chatNomeGrupo").textContent = grupo.nome;
    // Exibe a página e renderiza o histórico em toda entrada, inclusive após recarregar.
    mostrarViewGrupo("viewGrupoChat");
    renderMensagensGrupoChat(true);
    campo.focus();
  });

  el("chatVoltar").addEventListener("click", function () {
    limparCompositor();
    voltarMembrosAoChat = false;
    if (!obterGrupo(grupoAbertoId)) return abrirListaGrupos();
    renderGrupoDetalhe();
    mostrarViewGrupo("viewGrupoDetalhe");
  });

  el("btnVerMembrosGrupo").addEventListener("click", function () {
    const grupo = obterGrupo(grupoAbertoId);
    if (!grupo) return;
    voltarMembrosAoChat = el("viewGrupoChat").classList.contains("show");
    const membros = el("listaMembrosGrupo");
    membros.replaceChildren();
    if (!grupo.membros.length) membros.textContent = "ninguém entrou neste grupo ainda.";
    grupo.membros.forEach(function (nome) {
      const item = document.createElement("div");
      item.className = "grupo-membro";
      item.textContent = nome;
      membros.appendChild(item);
    });
    mostrarViewGrupo("viewGrupoMembros");
  });

  el("chatVerMembros").addEventListener("click", function () { el("btnVerMembrosGrupo").click(); });

  el("voltarDeGrupoMembros").addEventListener("click", function (evento) {
    evento.preventDefault();
    if (!obterGrupo(grupoAbertoId)) return abrirListaGrupos();
    if (voltarMembrosAoChat) {
      voltarMembrosAoChat = false;
      mostrarViewGrupo("viewGrupoChat");
      renderMensagensGrupoChat(true);
    } else {
      renderGrupoDetalhe();
      mostrarViewGrupo("viewGrupoDetalhe");
    }
  });

  el("chatFormulario").addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (lendoFoto || !obterGrupo(grupoAbertoId)) return;
    const texto = campo.value.trim();
    if (texto.length > campo.maxLength) return;
    const mensagens = mensagensDoGrupo();
    if (editandoId) {
      const original = mensagens.find(function (item) { return item.id === editandoId; });
      if (!original || !minhaMensagem(original)) return;
      if (!texto && !original.imagem) return;
      const novas = mensagens.map(function (item) {
        return item.id === editandoId
          ? Object.assign({}, item, { texto: texto, editadaEm: new Date().toISOString() })
          : item;
      });
      if (gravarMensagens(novas)) {
        terminarEdicao();
        renderMensagensGrupoChat();
      }
      return;
    }
    if (!texto && !fotoPendente) return;
    const nova = {
      id: idNovoGrupo(), autorId: usuarioChatId,
      autor: usuarioAtualGrupo(), fotoAutor: "",
      texto: texto, imagem: fotoPendente,
      data: new Date().toISOString(), reacoes: {}
    };
    if (gravarMensagens(mensagens.concat(nova))) {
      campo.value = "";
      fotoPendente = "";
      fecharEmojis();
      atualizarCompositor();
      renderMensagensGrupoChat(true);
      campo.focus();
    }
  });

  campo.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      el("chatFormulario").requestSubmit();
    }
  });
  el("chatCancelarEdicao").addEventListener("click", terminarEdicao);

  el("chatCamera").addEventListener("click", function () { el("chatFoto").click(); });
  el("chatFoto").addEventListener("change", async function (evento) {
    const arquivo = evento.target.files[0];
    evento.target.value = "";
    if (!arquivo || editandoId) return;
    const idGrupo = grupoAbertoId;
    const leitura = ++leituraFoto;
    lendoFoto = true;
    atualizarCompositor();
    try {
      const imagem = await northMidia.prepararImagem(arquivo);
      if (leitura !== leituraFoto || String(idGrupo) !== String(grupoAbertoId)) return;
      fotoPendente = imagem;
      campo.focus();
    } catch (erro) {
      if (leitura !== leituraFoto || String(idGrupo) !== String(grupoAbertoId)) return;
      alert(erro.message);
    } finally {
      if (leitura === leituraFoto && String(idGrupo) === String(grupoAbertoId)) {
        lendoFoto = false;
        atualizarCompositor();
      }
    }
  });
    el("chatRemoverAnexo").addEventListener("click", function () {
    leituraFoto++;
    lendoFoto = false;
    fotoPendente = "";
    atualizarCompositor();
  });

  emojis.forEach(function (emoji) {
    const item = botao(emoji, function () {
      const tamanho = campo.value.length - (campo.selectionEnd - campo.selectionStart) + emoji.length;
      if (tamanho > campo.maxLength) return;
      campo.setRangeText(emoji, campo.selectionStart, campo.selectionEnd, "end");
      fecharEmojis();
      campo.focus();
    });
    item.setAttribute("aria-label", "inserir " + emoji);
    el("chatEmojis").appendChild(item);
  });
  el("chatEmoji").addEventListener("click", function () {
    el("chatEmojis").hidden = !el("chatEmojis").hidden;
    el("chatEmoji").setAttribute("aria-expanded", String(!el("chatEmojis").hidden));
  });
  el("viewGrupoChat").addEventListener("click", function (evento) {
    if (!el("chatEmoji").contains(evento.target) && !el("chatEmojis").contains(evento.target)) fecharEmojis();
  });
  el("viewGrupoChat").addEventListener("keydown", function (evento) {
    if (evento.key !== "Escape") return;
    if (!el("chatEmojis").hidden) fecharEmojis();
    else if (editandoId) terminarEdicao();
  });
})();

// Painel do grupo: a bio continua no topo; os demais blocos ficam em grupo.painel.
let indiceBlocoEditando = null;
let imagemBlocoPendente = "";
let leituraImagemBloco = 0;

const overlayBlocoGrupo = document.getElementById("overlayBlocoGrupo");

function podeEditarPainelGrupo(grupo) {
  return !grupo.proprietario || grupo.proprietario === usuarioAtualGrupo();
}

function salvarPainelGrupo(blocos) {
  const grupo = obterGrupo(grupoAbertoId);
  if (!grupo) return false;

  const atualizado = Object.assign({}, grupo, { painel: blocos });
  const novosGrupos = grupos.map(function (item) {
    return String(item.id) === String(grupoAbertoId) ? atualizado : item;
  });

   if (!northMidia.gravar("meusGrupos", novosGrupos)) return false;

  grupos = novosGrupos;
  renderPainelGrupo(atualizado);
  return true;
}

function botaoAcaoBloco(rotulo, acao, desativado) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.textContent = rotulo;
  botao.disabled = !!desativado;
  botao.addEventListener("click", acao);
  return botao;
}

function renderPainelGrupo(grupo) {
  const lista = document.getElementById("grupoPainelBlocos");
  lista.replaceChildren();

  const blocos = Array.isArray(grupo.painel) ? grupo.painel : [];
  const podeEditar = podeEditarPainelGrupo(grupo);

  document.getElementById("btnAdicionarBlocoGrupo").hidden = !podeEditar;

  blocos.forEach(function (bloco, indice) {
    if (!bloco || !["texto", "imagem", "link"].includes(bloco.tipo)) return;

    const card = document.createElement("div");
    card.className = "grupo-bloco";

    if (bloco.tipo === "texto") {
      const texto = document.createElement("p");
      texto.textContent = bloco.conteudo || "";
      card.appendChild(texto);
    }

    if (bloco.tipo === "imagem") {
      const foto = document.createElement("img");
      foto.src = bloco.conteudo;
      foto.alt = bloco.legenda || "imagem do painel do grupo";
      card.appendChild(foto);

      if (bloco.legenda) {
        const legenda = document.createElement("span");
        legenda.textContent = bloco.legenda;
        legenda.className = "grupo-bloco-legenda";
        card.appendChild(legenda);
      }
    }

    if (bloco.tipo === "link") {
      const link = document.createElement("a");

      try {
        const url = new URL(bloco.url);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("protocolo inválido");
        }

        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "↗ " + (bloco.titulo || url.hostname);
        card.appendChild(link);
      } catch (erro) {
        return;
      }
    }

    if (podeEditar) {
      const acoes = document.createElement("div");
      acoes.className = "grupo-bloco-acoes";

      acoes.append(
        botaoAcaoBloco("↑", function () {
          moverBlocoGrupo(indice, -1);
        }, indice === 0),

        botaoAcaoBloco("↓", function () {
          moverBlocoGrupo(indice, 1);
        }, indice === blocos.length - 1),

        botaoAcaoBloco("editar", function () {
          abrirEditorBlocoGrupo(indice);
        }),

        botaoAcaoBloco("excluir", function () {
          if (!confirm("excluir este bloco?")) return;

          salvarPainelGrupo(
            blocos.filter(function (_, posicao) {
              return posicao !== indice;
            })
          );
        })
      );

      card.appendChild(acoes);
    }

    lista.appendChild(card);
  });
}

function moverBlocoGrupo(indice, deslocamento) {
  const grupo = obterGrupo(grupoAbertoId);
  if (!grupo || !podeEditarPainelGrupo(grupo)) return;

  const blocos = Array.isArray(grupo.painel) ? grupo.painel.slice() : [];
  const destino = indice + deslocamento;

  if (destino < 0 || destino >= blocos.length) return;

  [blocos[indice], blocos[destino]] = [blocos[destino], blocos[indice]];
  salvarPainelGrupo(blocos);
}

function mostrarCamposBlocoGrupo() {
  const tipo = document.getElementById("tipoBlocoGrupo").value;

  document.getElementById("camposTextoBloco").hidden = tipo !== "texto";
  document.getElementById("camposImagemBloco").hidden = tipo !== "imagem";
  document.getElementById("camposLinkBloco").hidden = tipo !== "link";
}

function mostrarPreviewBlocoGrupo() {
  const preview = document.getElementById("previewBlocoGrupo");

  preview.hidden = !imagemBlocoPendente;

  if (imagemBlocoPendente) {
    preview.src = imagemBlocoPendente;
  } else {
    preview.removeAttribute("src");
  }
}

function abrirEditorBlocoGrupo(indice) {
  const grupo = obterGrupo(grupoAbertoId);
  if (!grupo || !podeEditarPainelGrupo(grupo)) return;

  const bloco = indice == null ? null : grupo.painel[indice];
  if (indice != null && !bloco) return;

  indiceBlocoEditando = indice;
  imagemBlocoPendente =
    bloco && bloco.tipo === "imagem" ? bloco.conteudo : "";

  document.getElementById("tituloBlocoGrupo").textContent =
    bloco ? "editar bloco" : "adicionar bloco";

  document.getElementById("tipoBlocoGrupo").value =
    bloco ? bloco.tipo : "texto";

  document.getElementById("textoBlocoGrupo").value =
    bloco && bloco.tipo === "texto" ? bloco.conteudo : "";

  document.getElementById("legendaBlocoGrupo").value =
    bloco && bloco.tipo === "imagem" ? bloco.legenda || "" : "";

  document.getElementById("tituloLinkBloco").value =
    bloco && bloco.tipo === "link" ? bloco.titulo : "";

  document.getElementById("urlLinkBloco").value =
    bloco && bloco.tipo === "link" ? bloco.url : "";

  document.getElementById("imagemBlocoGrupo").value = "";

  mostrarCamposBlocoGrupo();
  mostrarPreviewBlocoGrupo();
  overlayBlocoGrupo.classList.add("show");
}

function fecharEditorBlocoGrupo() {
  leituraImagemBloco++;
  overlayBlocoGrupo.classList.remove("show");
  indiceBlocoEditando = null;
  document.getElementById("btnSalvarBlocoGrupo").disabled = false;
}

document.getElementById("btnAdicionarBlocoGrupo").addEventListener("click", function () {
  abrirEditorBlocoGrupo(null);
});

document.getElementById("btnCancelarBlocoGrupo").addEventListener(
  "click",
  fecharEditorBlocoGrupo
);

overlayBlocoGrupo.addEventListener("click", function (evento) {
  if (evento.target === overlayBlocoGrupo) fecharEditorBlocoGrupo();
});

document.getElementById("tipoBlocoGrupo").addEventListener(
  "change",
  mostrarCamposBlocoGrupo
);

document.getElementById("imagemBlocoGrupo").addEventListener("change", async function (evento) {
  const input = evento.target;
  const arquivo = input.files[0];
  if (!arquivo) return;
  const leituraAtual = ++leituraImagemBloco;
  const botao = document.getElementById("btnSalvarBlocoGrupo");
  botao.disabled = true;
  try {
    const imagem = await northMidia.prepararImagem(arquivo);
    if (leituraAtual !== leituraImagemBloco) return;
    imagemBlocoPendente = imagem;
    mostrarPreviewBlocoGrupo();
  } catch (erro) {
    if (leituraAtual !== leituraImagemBloco) return;
    input.value = "";
    alert(erro.message);
  } finally {
    if (leituraAtual === leituraImagemBloco) botao.disabled = false;
  }
});

document.getElementById("btnSalvarBlocoGrupo").addEventListener("click", function () {
  const grupo = obterGrupo(grupoAbertoId);
  if (!grupo || !podeEditarPainelGrupo(grupo)) return;

  const tipo = document.getElementById("tipoBlocoGrupo").value;
  let bloco;

  if (tipo === "texto") {
    const conteudo = document.getElementById("textoBlocoGrupo").value.trim();

    if (!conteudo) {
      alert("escreva o texto do bloco.");
      return;
    }

    bloco = { tipo: "texto", conteudo: conteudo };

  } else if (tipo === "imagem") {
    if (!imagemBlocoPendente) {
      alert("escolha uma imagem.");
      return;
    }

    bloco = {
      tipo: "imagem",
      conteudo: imagemBlocoPendente,
      legenda: document.getElementById("legendaBlocoGrupo").value.trim()
    };

  } else if (tipo === "link") {
    const titulo = document.getElementById("tituloLinkBloco").value.trim();
    const endereco = document.getElementById("urlLinkBloco").value.trim();
    let url;

    try {
      url = new URL(endereco);
    } catch (erro) {
      alert("digite um link completo, começando com https://.");
      return;
    }

    if (!titulo || !["http:", "https:"].includes(url.protocol)) {
      alert("informe um título e um link http ou https.");
      return;
    }

    bloco = { tipo: "link", titulo: titulo, url: url.href };

  } else {
    return;
  }

  const blocos = Array.isArray(grupo.painel) ? grupo.painel.slice() : [];

  if (indiceBlocoEditando === null) {
    if (blocos.length >= 12) {
      alert("o painel aceita até 12 blocos.");
      return;
    }

    blocos.push(bloco);
  } else {
    blocos[indiceBlocoEditando] = bloco;
  }

  if (salvarPainelGrupo(blocos)) fecharEditorBlocoGrupo();
});

// friends (fictícios por enquanto)
const listaFriends = [
  { nome: ".clara", status: "online" },
  { nome: ".gui", status: "online" },
  { nome: ".isa", status: "away" },
  { nome: ".luan", status: "offline" },
  { nome: ".montevideo", status: "online" },
  { nome: ".sabrina", status: "online" },
  { nome: ".nik", status: "away" },
  { nome: ".manu", status: "offline" }
];

document.getElementById("statFriends").textContent = listaFriends.length;

function renderTodosFriends() {
  const lista = document.getElementById("listaTodosFriends");
  lista.innerHTML = "";

  listaFriends.forEach(function (amigo) {
    const card = document.createElement("div");
    card.className = "friend-card";
    card.innerHTML =
      '<div class="friend-card-foto"></div>' +
      "<strong>" + amigo.nome + "</strong>" +
      '<span class="status-' + amigo.status + '">' + amigo.status + "</span>";
    lista.appendChild(card);
  });
}

function abrirViewFriends(evento) {
  evento.preventDefault();
  renderTodosFriends();
  mostrarViewGrupo("viewFriends");
}

document.getElementById("linkViewAllFriends").addEventListener("click", abrirViewFriends);
document.getElementById("linkViewAllOnline").addEventListener("click", abrirViewFriends);

document.querySelectorAll(".voltar-friends").forEach(function (link) {
  link.addEventListener("click", function (evento) {
    evento.preventDefault();
    document.getElementById("viewFriends").classList.remove("show");
    document.querySelector(".pagina-corpo").style.display = "";
    document.querySelector(".guestbook").style.display = "";
  });
});
// guestbook
let recados = JSON.parse(localStorage.getItem("meuGuestbook")) || [
  { nome: ".clara", texto: "sua escrita me pega sempre. continue.", data: "2026-08-25T22:21:00", resposta: "" },
  { nome: ".gui", texto: "essa foto da cidade ficou incrível!", data: "2026-08-25T20:17:00", resposta: "" },
  { nome: ".isa", texto: "você vê o mundo diferente. é bonito isso.", data: "2026-08-24T23:02:00", resposta: "" }
];

function criarRecadoEl(recado, indice) {
  const div = document.createElement("div");
  div.className = "recado";

  const cabecalho = document.createElement("div");
  cabecalho.className = "recado-cabecalho";
  cabecalho.innerHTML =
    '<div class="recado-avatar"></div><strong>' + recado.nome + "</strong><span>" + formatarData(recado.data) + "</span>";

  const texto = document.createElement("p");
  texto.textContent = recado.texto;

  const acoes = document.createElement("div");
  acoes.className = "recado-acoes";

  const deleteLink = document.createElement("a");
  deleteLink.href = "#";
  deleteLink.textContent = "delete";
  deleteLink.addEventListener("click", function (evento) {
    evento.preventDefault();
    if (confirm("apagar este recado?")) {
      const novosRecados = recados.filter(function (_, posicao) {
        return posicao !== indice;
      });
      if (!northMidia.gravar("meuGuestbook", novosRecados)) return;
      recados = novosRecados;
      renderGuestbook();
    }
  });

  const separador = document.createTextNode(" | ");

  const replyLink = document.createElement("a");
  replyLink.href = "#";
  replyLink.textContent = "reply";
  replyLink.addEventListener("click", function (evento) {
    evento.preventDefault();
    indiceRespondendo = indice;
    document.getElementById("inputResposta").value = recado.resposta || "";
    document.getElementById("overlayResponder").classList.add("show");
  });

  acoes.appendChild(deleteLink);
  acoes.appendChild(separador);
  acoes.appendChild(replyLink);

  div.appendChild(cabecalho);
  div.appendChild(texto);

  if (recado.resposta) {
    const respostaEl = document.createElement("div");
    respostaEl.className = "recado-resposta";
    respostaEl.innerHTML = "<strong>você respondeu:</strong> " + recado.resposta;
    div.appendChild(respostaEl);
  }

  div.appendChild(acoes);
  return div;
}

function renderGuestbook() {
  const resumo = document.getElementById("guestbookGridResumo");
  resumo.innerHTML = "";
  recados.slice(0, 3).forEach(function (recado) {
    const indiceReal = recados.indexOf(recado);
    resumo.appendChild(criarRecadoEl(recado, indiceReal));
  });

  if (document.getElementById("viewGuestbook").classList.contains("show")) {
    const completo = document.getElementById("guestbookGridCompleto");
    completo.innerHTML = "";
    recados.forEach(function (recado, indice) {
      completo.appendChild(criarRecadoEl(recado, indice));
    });
  }
}

renderGuestbook();

let indiceRespondendo = null;

document.getElementById("linkViewAllGuestbook").addEventListener("click", function (evento) {
  evento.preventDefault();
  const completo = document.getElementById("guestbookGridCompleto");
  completo.innerHTML = "";
  recados.forEach(function (recado, indice) {
    completo.appendChild(criarRecadoEl(recado, indice));
  });
  mostrarViewGrupo("viewGuestbook");
});

document.getElementById("voltarDeGuestbook").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("viewGuestbook").classList.remove("show");
  document.querySelector(".pagina-corpo").style.display = "";
  document.querySelector(".guestbook").style.display = "";
});

// sign guestbook
const overlaySign = document.getElementById("overlaySign");

document.getElementById("linkSignGuestbook").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("inputNomeSign").value = "";
  document.getElementById("inputTextoSign").value = "";
  overlaySign.classList.add("show");
});

document.getElementById("btnCancelarSign").addEventListener("click", function () {
  overlaySign.classList.remove("show");
});

overlaySign.addEventListener("click", function (evento) {
  if (evento.target === overlaySign) overlaySign.classList.remove("show");
});

document.getElementById("btnSalvarSign").addEventListener("click", function () {
  const nome = document.getElementById("inputNomeSign").value.trim() || ".visitante";
  const texto = document.getElementById("inputTextoSign").value.trim();

  if (texto === "") {
    alert("escreve um recado!");
    return;
  }

  const novosRecados = [{ nome: nome, texto: texto, data: new Date().toISOString(), resposta: "" }].concat(recados);
  if (!northMidia.gravar("meuGuestbook", novosRecados)) return;
  recados = novosRecados;
  renderGuestbook();
  overlaySign.classList.remove("show");
});

// responder
const overlayResponder = document.getElementById("overlayResponder");

document.getElementById("btnCancelarResposta").addEventListener("click", function () {
  overlayResponder.classList.remove("show");
});

overlayResponder.addEventListener("click", function (evento) {
  if (evento.target === overlayResponder) overlayResponder.classList.remove("show");
});

document.getElementById("btnSalvarResposta").addEventListener("click", function () {
  const resposta = document.getElementById("inputResposta").value.trim();
  if (indiceRespondendo == null || !recados[indiceRespondendo]) return;
  const novosRecados = recados.map(function (recado, indice) {
    return indice === indiceRespondendo
      ? Object.assign({}, recado, { resposta: resposta })
      : recado;
  });
  if (!northMidia.gravar("meuGuestbook", novosRecados)) return;
  recados = novosRecados;
  renderGuestbook();
  overlayResponder.classList.remove("show");
});
// settings
let preferencias = JSON.parse(localStorage.getItem("minhasPreferencias")) || {
  notificacoes: true
};

document.getElementById("checkNotificacoes").checked = preferencias.notificacoes;

document.getElementById("checkNotificacoes").addEventListener("change", function (evento) {
  preferencias.notificacoes = evento.target.checked;
  localStorage.setItem("minhasPreferencias", JSON.stringify(preferencias));
});

document.getElementById("linkSettings").addEventListener("click", function (evento) {
  evento.preventDefault();
  mostrarViewGrupo("viewSettings");
});

document.getElementById("voltarDeSettings").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("viewSettings").classList.remove("show");
  document.querySelector(".pagina-corpo").style.display = "";
  document.querySelector(".guestbook").style.display = "";
});

document.getElementById("btnTrocarSenha").addEventListener("click", function () {
  const novaSenha = document.getElementById("inputNovaSenha").value;
  if (novaSenha === "") {
    alert("digite uma senha nova!");
    return;
  }
  const conta = JSON.parse(localStorage.getItem("northnetConta"));
  if (conta) {
    conta.senha = novaSenha;
    localStorage.setItem("northnetConta", JSON.stringify(conta));
    alert("senha atualizada!");
    document.getElementById("inputNovaSenha").value = "";
  }
});

document.getElementById("btnExportarDados").addEventListener("click", function () {
  const dados = {
    perfil: perfil,
    posts: posts,
    memorias: memorias,
    grupos: grupos,
    recados: recados,
    preferencias: preferencias,
    tema: tema
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meus-dados-northnet.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btnApagarConta").addEventListener("click", function () {
  const confirmar = confirm("tem certeza? isso apaga TUDO (perfil, posts, memories, groups, guestbook) e não pode ser desfeito.");
  if (!confirmar) return;
  localStorage.clear();
  window.location.href = "../north-net-portal/login.html";
});
// quick north: navegação
function fecharTudoEVoltarHome() {
  document.querySelectorAll(".view-pagina").forEach(function (view) {
    view.classList.remove("show");
  });
  document.querySelector(".pagina-corpo").style.display = "";
  document.querySelector(".guestbook").style.display = "";
}

function abrirEmBreve(titulo) {
  document.querySelectorAll(".view-pagina").forEach(function (view) {
    view.classList.remove("show");
  });
  document.querySelector(".pagina-corpo").style.display = "none";
  document.querySelector(".guestbook").style.display = "none";
  document.getElementById("tituloEmBreve").textContent = titulo;
  document.getElementById("viewEmBreve").classList.add("show");
}

document.getElementById("qnExplore").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirEmBreve("explore");
});

document.getElementById("qnSignals").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirEmBreve("signals");
});

document.getElementById("qnFriends").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirViewFriends(evento);
});

document.getElementById("qnFavorites").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirEmBreve("favorites");
});

document.getElementById("qnGroups").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirListaGrupos();
});

document.getElementById("qnNorthFm").addEventListener("click", function (evento) {
  evento.preventDefault();
  abrirEmBreve("north.fm");
});

document.getElementById("voltarDeEmBreve").addEventListener("click", function (evento) {
  evento.preventDefault();
  fecharTudoEVoltarHome();
});
// paletas de cor (cada família tem 5 tons: do mais forte ao mais claro)
const paletas = {
  azul:   ["#0F2647", "#16294E", "#1E3A6E", "#3A5FA8", "#7AA0D6"],
  rosa:   ["#7A1F4E", "#9E2A63", "#C23B7E", "#E06BA0", "#F0A3C6"],
  verde:  ["#144D34", "#1E6B47", "#2C8F5F", "#4AB37F", "#8BD3AC"],
  roxo:   ["#3B1E63", "#512A85", "#6E3FA8", "#9165C9", "#BC9AE0"],
  amarelo:["#7A5A00", "#9C7500", "#C79600", "#E0B92E", "#F0D579"],
  vermelho:["#6E1414", "#8F1D1D", "#B32E2E", "#D65454", "#EFA0A0"],
  cinza:  ["#1C1F26", "#2E323C", "#4A4F5C", "#767C8C", "#B4B8C4"]
};

let tema = JSON.parse(localStorage.getItem("meuTema")) || {
  familia: "azul",
  tomIndice: 2,
  escuro: false,
  headerCor: "",
  headerImagem: ""
};

function aplicarTema() {
  const tons = paletas[tema.familia];
  const escura = tons[Math.max(tema.tomIndice - 1, 0)];
  const media = tons[tema.tomIndice];

  document.documentElement.style.setProperty("--cor-escura", escura);
  document.documentElement.style.setProperty("--cor-media", media);

  document.body.classList.toggle("tema-escuro", tema.escuro);

  northMidia.gravar("meuTema", tema);
}

aplicarTema();

// só roda o resto se os elementos de settings existirem nessa página
const checkModoEscuro = document.getElementById("checkModoEscuro");
if (checkModoEscuro) {
  checkModoEscuro.checked = tema.escuro;

  checkModoEscuro.addEventListener("change", function (evento) {
    tema.escuro = evento.target.checked;
    aplicarTema();
  });

  const paletaFamilias = document.getElementById("paletaFamilias");
  const paletaTons = document.getElementById("paletaTons");

  function renderPaletaFamilias() {
    paletaFamilias.innerHTML = "";
    Object.keys(paletas).forEach(function (nomeFamilia) {
      const swatch = document.createElement("span");
      swatch.className = "familia-swatch" + (nomeFamilia === tema.familia ? " selecionada" : "");
      swatch.style.background = paletas[nomeFamilia][2];
      swatch.title = nomeFamilia;
      swatch.addEventListener("click", function () {
        tema.familia = nomeFamilia;
        tema.tomIndice = 2;
        aplicarTema();
        renderPaletaFamilias();
        renderPaletaTons();
      });
      paletaFamilias.appendChild(swatch);
    });
  }

  function renderPaletaTons() {
    paletaTons.innerHTML = "";
    paletas[tema.familia].forEach(function (cor, indice) {
      const swatch = document.createElement("span");
      swatch.className = "tom-swatch" + (indice === tema.tomIndice ? " selecionado" : "");
      swatch.style.background = cor;
      swatch.addEventListener("click", function () {
        tema.tomIndice = indice;
        aplicarTema();
        renderPaletaTons();
      });
      paletaTons.appendChild(swatch);
    });
  }

  renderPaletaFamilias();
  renderPaletaTons();

  // customização do header
  const inputHeaderImagem = document.getElementById("inputHeaderImagem");
  const headerCorOpcoes = document.getElementById("headerCorOpcoes");
  let leituraHeaderImagem = 0;

  ["#1E3A6E", "#C23B7E", "#2C8F5F", "#6E3FA8", "#C79600"].forEach(function (cor) {
    const swatch = document.createElement("span");
    swatch.className = "tom-swatch";
    swatch.style.background = cor;
    swatch.addEventListener("click", function () {
      leituraHeaderImagem++;
      const atualizado = Object.assign({}, tema, { headerCor: cor, headerImagem: "" });
      if (!northMidia.gravar("meuTema", atualizado)) return;
      tema = atualizado;
      inputHeaderImagem.value = "";
      aplicarHeaderCustom();
    });
    headerCorOpcoes.appendChild(swatch);
  });

  inputHeaderImagem.addEventListener("change", async function () {
    const arquivo = inputHeaderImagem.files[0];
    if (!arquivo) return;
    const leituraAtual = ++leituraHeaderImagem;
    try {
      const imagem = await northMidia.prepararImagem(arquivo);
      if (leituraAtual !== leituraHeaderImagem) return;
      const atualizado = Object.assign({}, tema, { headerImagem: imagem, headerCor: "" });
      if (!northMidia.gravar("meuTema", atualizado)) return;
      tema = atualizado;
      aplicarHeaderCustom();
    } catch (erro) {
      if (leituraAtual !== leituraHeaderImagem) return;
      inputHeaderImagem.value = "";
      alert(erro.message);
    }
  });

  document.getElementById("btnResetarHeader").addEventListener("click", function () {
    leituraHeaderImagem++;
    const atualizado = Object.assign({}, tema, { headerCor: "", headerImagem: "" });
    if (!northMidia.gravar("meuTema", atualizado)) return;
    tema = atualizado;
    inputHeaderImagem.value = "";
    aplicarHeaderCustom();
  });
}

function aplicarHeaderCustom() {
  const topo = document.querySelector(".topo");
  if (!topo) return;
  if (tema.headerImagem) {
    topo.style.background = "url('" + tema.headerImagem + "') center/cover no-repeat";
  } else if (tema.headerCor) {
    topo.style.background = tema.headerCor;
  } else {
    topo.style.background = "";
  }
}
aplicarHeaderCustom();

// O explore do topo usa o mesmo acesso que o explore da lateral.
document.getElementById("navExplore").addEventListener("click", function (evento) {
  evento.preventDefault();
  document.getElementById("qnExplore").click();
});

// Clique no emoji do mood para escolher outro.
(function () {
  const botao = document.getElementById("btnMoodEmoji");
  const menu = document.getElementById("moodEmojis");
  const opcoes = ["😐", "🙂", "😊", "🥰", "😎", "🤔", "🥹", "😭", "😴", "😤", "🤯", "🫠", "🤩", "🙃", "🥺", "😌", "💭", "✨", "💗", "🔥"];

  function fechar() {
    menu.hidden = true;
    botao.setAttribute("aria-expanded", "false");
  }

  opcoes.forEach(function (emoji) {
    const opcao = document.createElement("button");
    opcao.type = "button";
    opcao.textContent = emoji;
    opcao.setAttribute("aria-label", "usar " + emoji + " no mood");
    opcao.addEventListener("click", function () {
      const atualizado = Object.assign({}, perfil, { moodEmoji: emoji });
      try {
        localStorage.setItem("meuPerfil", JSON.stringify(atualizado));
      } catch (erro) {
        alert("não foi possível salvar o emoji. Verifique o espaço do navegador.");
        return;
      }
      perfil = atualizado;
      renderPerfil();
      fechar();
      botao.focus();
    });
    menu.appendChild(opcao);
  });

  botao.addEventListener("click", function () {
    menu.hidden = !menu.hidden;
    botao.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", function (evento) {
    if (!botao.contains(evento.target) && !menu.contains(evento.target)) fechar();
  });
  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !menu.hidden) {
      fechar();
      botao.focus();
    }
  });
})();