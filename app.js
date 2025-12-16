document.addEventListener("DOMContentLoaded", () => {

  const contenedor = document.getElementById("lista-productos");
  const paginacion = document.getElementById("paginacion");
  const loader = document.getElementById("legacy-loader");

  const modalImg = document.getElementById("modalImg");
  const modalTitulo = document.getElementById("modalTitulo");
  const modalPrecio = document.getElementById("modalPrecio");
  const modalTallas = document.getElementById("modalTallas");
  const productoModal = document.getElementById("productoModal");

  const btnTodos = document.getElementById("btnTodos");
  const btnOriginal = document.getElementById("btnOriginal");
  const btnG5 = document.getElementById("btnG5");

  let productos = [];
  let productosFiltrados = [];
  let pagina = 1;
  let filtroActivo = "todos";

  const POR_PAGINA = 12;
  const MAX_REQUESTS = 6;
  const idsCargados = new Set();

  /* ================= UTILIDADES ================= */

  function limpiarTitulo(titulo) {
    return titulo
      .replace(/\b(importado|original|calidad|g5|5g|1\.1|premium|replica|réplica|copy|version|versión|top quality)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function calcularPrecio(costo) {
    const precio = costo / 0.6;
    return Math.round(precio / 50) * 50;
  }

  function mostrarSkeletons() {
    contenedor.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      contenedor.innerHTML += `
        <div class="col">
          <div class="card skeleton">
            <div class="skeleton-img"></div>
            <div class="card-body">
              <div class="skeleton-line medium"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>`;
    }
  }

  /* ================= CARGA DE PRODUCTOS ================= */

  async function cargarProductos() {
    mostrarSkeletons();
    productos = [];
    idsCargados.clear();

    let sinceId = 0;

    for (let i = 0; i < MAX_REQUESTS; i++) {
      const res = await fetch(`https://snkrsmayoreo.mx/products.json?limit=250&since_id=${sinceId}`);
      const data = await res.json();

      if (!data.products || data.products.length === 0) break;

      data.products.forEach(p => {
        if (idsCargados.has(p.id)) return;
        idsCargados.add(p.id);

        const tituloLower = p.title.toLowerCase();

        // ❌ Excluir pacas / paquetes
        if (/paca|paquete|pack|docena|mayoreo/.test(tituloLower)) return;

        // ✔ ORIGINAL
        const esOriginal = /importado|original/.test(tituloLower);

        // ✔ G5 + CALIDAD
        const esG5 = /g5|5g|1\.1|calidad|premium|replica|réplica|copy|version|versión|top quality/.test(tituloLower);

        if (!esOriginal && !esG5) return;

        productos.push({
          id: p.id,
          titulo: limpiarTitulo(p.title),
          tipo: esOriginal ? "original" : "g5",
          imagenes: p.images.map(img => img.src),
          precio: calcularPrecio(parseFloat(p.variants[0]?.price || 0)),
          tallas: p.variants.filter(v => v.available).map(v => v.title).join(", ")
        });
      });

      sinceId = data.products[data.products.length - 1].id;
    }

    // ORIGINAL primero
    productos.sort((a, b) => a.tipo === "original" ? -1 : 1);

    aplicarFiltro();
    loader.style.display = "none";
  }

  /* ================= RENDER ================= */

  function render() {
    contenedor.innerHTML = "";

    const inicio = (pagina - 1) * POR_PAGINA;
    const visibles = productosFiltrados.slice(inicio, inicio + POR_PAGINA);

    visibles.forEach(p => {
      contenedor.innerHTML += `
        <div class="col fade-in">
          <div class="card producto" data-producto='${JSON.stringify(p)}'>
            <span class="badge ${p.tipo === "original" ? "badge-importado" : "badge-calidad"} position-absolute m-2">
              ${p.tipo === "original" ? "ORIGINAL" : "G5"}
            </span>
            <img src="${p.imagenes[0]}" class="card-img-top">
            <div class="card-body">
              <h6>${p.titulo}</h6>
              <div class="card-price">$${p.precio} MXN</div>
              <div class="card-sizes">Tallas: ${p.tallas || "N/D"}</div>
            </div>
          </div>
        </div>`;
    });

    renderPaginacion();
    activarModal();
  }

  function renderPaginacion() {
    paginacion.innerHTML = "";
    const totalPaginas = Math.ceil(productosFiltrados.length / POR_PAGINA);
    if (totalPaginas <= 1) return;

    const rango = 2;
    let inicio = Math.max(1, pagina - rango);
    let fin = Math.min(totalPaginas, pagina + rango);

    if (pagina > 1) {
      paginacion.innerHTML += `<button class="btn btn-outline-dark m-1" onclick="cambiarPagina(${pagina - 1})">«</button>`;
    }

    for (let i = inicio; i <= fin; i++) {
      paginacion.innerHTML += `
        <button class="btn ${i === pagina ? "btn-dark" : "btn-outline-dark"} m-1"
        onclick="cambiarPagina(${i})">${i}</button>`;
    }

    if (pagina < totalPaginas) {
      paginacion.innerHTML += `<button class="btn btn-outline-dark m-1" onclick="cambiarPagina(${pagina + 1})">»</button>`;
    }
  }

  window.cambiarPagina = (p) => {
    pagina = p;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ================= MODAL ================= */

  function activarModal() {
    document.querySelectorAll(".producto").forEach(card => {
      card.onclick = () => {
        const p = JSON.parse(card.dataset.producto);

        modalImg.src = p.imagenes[0];
        modalTitulo.textContent = p.titulo;
        modalPrecio.textContent = `$${p.precio} MXN`;
        modalTallas.textContent = p.tallas || "N/D";

        const galeria = document.getElementById("modalGaleria");
        galeria.innerHTML = "";

        p.imagenes.forEach(img => {
          const thumb = document.createElement("img");
          thumb.src = img;
          thumb.className = "modal-thumb";
          thumb.onclick = () => modalImg.src = img;
          galeria.appendChild(thumb);
        });

        new bootstrap.Modal(productoModal).show();
      };
    });
  }

  /* ================= FILTROS ================= */

  btnTodos.onclick = () => {
    filtroActivo = "todos";
    pagina = 1;
    activarBoton(btnTodos);
    aplicarFiltro();
  };

  btnOriginal.onclick = () => {
    filtroActivo = "original";
    pagina = 1;
    activarBoton(btnOriginal);
    aplicarFiltro();
  };

  btnG5.onclick = () => {
    filtroActivo = "g5";
    pagina = 1;
    activarBoton(btnG5);
    aplicarFiltro();
  };

  function activarBoton(btn) {
    [btnTodos, btnOriginal, btnG5].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function aplicarFiltro() {
    if (filtroActivo === "todos") {
      productosFiltrados = [...productos];
    } else {
      productosFiltrados = productos.filter(p => p.tipo === filtroActivo);
    }
    render();
  }

  /* ================= INIT ================= */

  cargarProductos();

});
