// Controle Financeiro — Rev25
// Ao publicar uma versão nova, basta trocar o número abaixo: o app baixa sozinho e recarrega.
const VERSAO = "1";
// Cache com nome próprio desta revisão: não apaga nem é apagado pelas outras revisões do mesmo domínio
const PREFIXO = "cf-rev25-";
const CACHE_NAME = PREFIXO + VERSAO;
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];
// Biblioteca de Excel (.xlsx) de CDN externo — se falhar, o resto do app instala normalmente
const ARQUIVOS_EXTERNOS = [
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

// Instala: baixa tudo SEMPRE da rede ({cache:"reload"}), nunca do cache HTTP do navegador.
// (Antes, o navegador podia entregar um index.html antigo guardado e o app "não atualizava".)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ARQUIVOS.map((u) => new Request(u, { cache: "reload" }))).then(() =>
        cache.addAll(ARQUIVOS_EXTERNOS).catch(() => {})
      )
    )
  );
  self.skipWaiting();
});

// Ativa: apaga só os caches antigos DESTA revisão
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((c) => c.startsWith(PREFIXO) && c !== CACHE_NAME)
          .map((c) => caches.delete(c))
      )
    ).then(() => self.clients.claim())
  );
});

function fetchComTimeout(request, ms){
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then((resp) => { clearTimeout(timer); resolve(resp); })
                   .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", (event) => {
  if(event.request.method !== "GET") return;

  // Abrir o app: entrega o index.html do cache na hora (rápido e offline).
  // A checagem de versão nova acontece em paralelo e, se houver, a página recarrega sozinha.
  if(event.request.mode === "navigate"){
    event.respondWith(
      caches.match("./index.html").then((resp) => resp || fetchComTimeout(event.request, 2500))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      // Sem rede e sem cache: devolve erro limpo (antes devolvia a página, o que gerava erro de script)
      return fetchComTimeout(event.request, 2500).catch(() => new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});
