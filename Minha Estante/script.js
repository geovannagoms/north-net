const botao = document.getElementById("btnAdicionar");
const estante = document.getElementById("estante");
const campoTitulo = document.getElementById("campoTitulo");
const mensagemVazia = document.getElementById("mensagemVazia");

const coresLombada = ['#8CA8C7', '#C9A9A6', '#A8B896', '#D8BB8C', '#A99BC0', '#8FB9B3'];

let livros = JSON.parse(localStorage.getItem("meusLivros")) || [];

renderEstante();
atualizarContador();

botao.addEventListener("click", adicionarLivro);

campoTitulo.addEventListener("keydown", function (evento) {
  if (evento.key === "Enter") {
    adicionarLivro();
  }
});

window.addEventListener("resize", renderEstante);

function adicionarLivro() {
  const titulo = campoTitulo.value;

  if (titulo === "") {
    alert("Digite um título primeiro!");
    return;
  }

  botao.textContent = "Buscando...";
  botao.disabled = true;

  buscarLivro(titulo);
}

function buscarLivro(titulo) {
  const url = "https://openlibrary.org/search.json?q=" + encodeURIComponent(titulo) + "&limit=1";

  fetch(url)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (dados) {
      const resultado = dados.docs[0];

      if (!resultado) {
        alert("Livro não encontrado!");
        return;
      }

      const livro = {
        titulo: resultado.title,
        autor: resultado.author_name ? resultado.author_name[0] : "Autor desconhecido",
        capa: "https://covers.openlibrary.org/b/olid/" + resultado.cover_edition_key + "-L.jpg"
      };

      salvarLivro(livro);
      renderEstante();
      atualizarContador();
      campoTitulo.value = "";
    })
    .finally(function () {
      botao.textContent = "+ Adicionar livro";
      botao.disabled = false;
    });
}

function salvarLivro(livro) {
  livros.push(livro);
  localStorage.setItem("meusLivros", JSON.stringify(livros));
}

function removerLivro(indice) {
  livros.splice(indice, 1);
  localStorage.setItem("meusLivros", JSON.stringify(livros));
  renderEstante();
  atualizarContador();
}

function renderEstante() {
  estante.innerHTML = "";

  if (livros.length === 0) {
    return;
  }

  const larguraDisponivel = estante.clientWidth - 16;
  let prateleiraAtual = criarPrateleira();
  let usado = 0;

  livros.forEach(function (livro, indice) {
    const largura = larguraLivro(livro.titulo);

    if (usado + largura > larguraDisponivel && usado > 0) {
      prateleiraAtual = criarPrateleira();
      usado = 0;
    }

    usado += largura + 3;
    const lombada = criarLombada(livro, indice, largura);
    prateleiraAtual.appendChild(lombada);
  });
}

function criarPrateleira() {
  const div = document.createElement("div");
  div.className = "prateleira";

  const prancha = document.createElement("div");
  prancha.className = "prancha";
  div.appendChild(prancha);

  estante.appendChild(div);
  return div;
}

function criarLombada(livro, indice, largura) {
  const div = document.createElement("div");
  div.className = "livro";
  div.style.width = largura + "px";
  div.style.height = alturaLivro(livro.titulo) + "px";
  div.style.background = corLivro(livro.titulo);

  const btnRemover = document.createElement("button");
  btnRemover.className = "btn-remover";
  btnRemover.textContent = "×";
  btnRemover.addEventListener("click", function (evento) {
    evento.stopPropagation();
    removerLivro(indice);
  });

  const tituloEl = document.createElement("span");
  tituloEl.className = "livro-titulo";
  tituloEl.textContent = livro.titulo;

  div.appendChild(btnRemover);
  div.appendChild(tituloEl);
  return div;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function larguraLivro(titulo) {
  const h = hashStr(titulo);
  const base = 26 + titulo.length * 1.3;
  const jitter = h % 10;
  return Math.max(24, Math.min(52, Math.round(base + jitter - 5)));
}

function alturaLivro(titulo) {
  const h = hashStr(titulo + "h");
  return 150 + (h % 20);
}

function corLivro(titulo) {
  const h = hashStr(titulo + "c");
  return coresLombada[h % coresLombada.length];
}

function atualizarContador() {
  const contador = document.getElementById("contador");
  if (livros.length === 0) {
    contador.textContent = "";
    mensagemVazia.style.display = "block";
  } else if (livros.length === 1) {
    contador.textContent = "1 livro";
    mensagemVazia.style.display = "none";
  } else {
    contador.textContent = livros.length + " livros";
    mensagemVazia.style.display = "none";
  }
}