/* =========================================================
   KONFIGURASI PDF.JS
   ========================================================= */

let pdfjsLib = null;

(async function loadPDFJS(){
  try{
    pdfjsLib = await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
    );

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  }catch(error){
    console.error("PDF.js gagal dimuat:",error);
  }
})();


/* =========================================================
   DATA + DATABASE
   ========================================================= */

const DB_NAME = "RuangBacaFundamental";
const DB_VERSION = 2;
const STORE = "books";

let books = [
  {
    id:"builtin-alchemist",
    title:"The Alchemist",
    author:"Paulo Coelho",
    status:"reading",
    progress:62,
    genre:"Novel",
    source:"demo",
    text:"The Alchemist\n\nBuku demo RuangBaca. Upload PDF/TXT/EPUB untuk memasukkan buku sebenarnya."
  },
  {
    id:"builtin-atomic",
    title:"Atomic Habits",
    author:"James Clear",
    status:"unread",
    progress:0,
    genre:"Nonfiksi",
    source:"demo",
    text:"Atomic Habits\n\nBuku demo RuangBaca."
  },
  {
    id:"builtin-ikigai",
    title:"Ikigai",
    author:"Héctor García",
    status:"done",
    progress:100,
    genre:"Pengembangan diri",
    source:"demo",
    text:"Ikigai\n\nBuku demo RuangBaca."
  },
  {
    id:"builtin-deepwork",
    title:"Deep Work",
    author:"Cal Newport",
    status:"unread",
    progress:0,
    genre:"Produktivitas",
    source:"demo",
    text:"Deep Work\n\nBuku demo RuangBaca."
  }
];

let dbPromise = null;

function openDB(){

  if(dbPromise) return dbPromise;

  dbPromise = new Promise((resolve,reject)=>{

    const request =
      indexedDB.open(DB_NAME,DB_VERSION);

    request.onupgradeneeded = ()=>{
      const db = request.result;

      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE,{keyPath:"id"});
      }
    };

    request.onsuccess = ()=>resolve(request.result);
    request.onerror = ()=>reject(request.error);

  });

  return dbPromise;
}

async function dbPut(book){

  const db = await openDB();

  return new Promise((resolve,reject)=>{

    const tx = db.transaction(STORE,"readwrite");

    tx.objectStore(STORE).put(book);

    tx.oncomplete = resolve;
    tx.onerror = ()=>reject(tx.error);

  });
}

async function dbGetAll(){

  const db = await openDB();

  return new Promise((resolve,reject)=>{

    const tx = db.transaction(STORE,"readonly");
    const request = tx.objectStore(STORE).getAll();

    request.onsuccess = ()=>resolve(request.result || []);
    request.onerror = ()=>reject(request.error);

  });
}

async function dbDelete(id){

  const db = await openDB();

  return new Promise((resolve,reject)=>{

    const tx = db.transaction(STORE,"readwrite");

    tx.objectStore(STORE).delete(id);

    tx.oncomplete = resolve;
    tx.onerror = ()=>reject(tx.error);

  });
}


/* =========================================================
   NAVIGASI
   ========================================================= */

const pages = document.querySelectorAll(".page");
const navs = document.querySelectorAll(".nav");

function showPage(pageId){

  pages.forEach(page=>{
    page.classList.toggle("active",page.id === pageId);
  });

  navs.forEach(nav=>{
    nav.classList.toggle("active",nav.dataset.page === pageId);
  });

  window.scrollTo({top:0,behavior:"smooth"});
}

navs.forEach(nav=>{
  nav.addEventListener("click",()=>{
    showPage(nav.dataset.page);
  });
});


/* =========================================================
   RENDER BUKU
   ========================================================= */

function escapeHTML(value){
  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function bookCard(book){

  const title = escapeHTML(book.title);
  const author = escapeHTML(book.author);

  const cover =
    escapeHTML(book.title.toUpperCase())
      .replace(/\s+/g,"<br>");

  const progress =
    book.status === "done"
      ? "Selesai"
      : book.status === "reading"
        ? `${Math.round(book.progress || 0)}% selesai`
        : "Belum dibaca";

  return `
    <article class="book-card"
      onclick="openBookById('${escapeHTML(book.id)}')">

      <div class="book-cover">
        <span class="cover-label">${cover}</span>
      </div>

      <h4>${title}</h4>
      <p>${author}</p>
      <small>${progress}</small>

    </article>
  `;
}

function renderBooks(list = books){

  const grids =
    document.querySelectorAll(
      ".book-grid, .library-grid, #bookGrid, #libraryGrid"
    );

  grids.forEach(grid=>{

    /*
     * Home recommendation / continue-reading containers
     * may use their own markup. Only replace normal book grids.
     */
    if(!grid) return;

    const cards =
      list.map(book=>{

        const status =
          book.status === "done"
            ? "Selesai"
            : book.status === "reading"
              ? "Sedang dibaca"
              : "Belum dibaca";

        return `
          <article class="book-card" data-book-id="${escapeHTML(book.id)}">

            <button
              class="book-card-main"
              type="button"
              onclick="openBookById('${escapeHTML(book.id)}')">

              <div class="book-cover">
                ${escapeHTML(
                  String(book.title || "BUKU")
                    .slice(0,22)
                    .toUpperCase()
                )}
              </div>

              <h3>${escapeHTML(book.title || "Tanpa judul")}</h3>

              <p>${escapeHTML(book.author || "Penulis tidak diketahui")}</p>

              <small>
                ${status}
                ${
                  Number(book.progress || 0) > 0
                    ? ` · ${Number(book.progress)}%`
                    : ""
                }
              </small>

            </button>

            <div class="book-card-actions">

              <button
                class="book-edit"
                type="button"
                onclick="openEditBook('${escapeHTML(book.id)}')">
                Edit
              </button>

              <button
                class="book-delete"
                type="button"
                onclick="confirmDeleteBook('${escapeHTML(book.id)}')">
                Hapus
              </button>

            </div>

          </article>
        `;
      }).join("");

    grid.innerHTML =
      cards ||
      `<div class="search-empty">
        Belum ada buku.
       </div>`;
  });

  updateProfileStats();
}


/* =========================================================
   KELOLA BUKU
   ========================================================= */

let editingBookId = null;

function findBook(id){

  return books.find(
    book => String(book.id) === String(id)
  );
}

function openEditBook(id){

  const book = findBook(id);

  if(!book){
    showToast("Buku tidak ditemukan");
    return;
  }

  editingBookId = book.id;

  document.getElementById("editBookTitle").value =
    book.title || "";

  document.getElementById("editBookAuthor").value =
    book.author || "";

  document.getElementById("editBookStatus").value =
    book.status || "unread";

  document.getElementById("editBookText").value =
    book.text || "";

  document
    .getElementById("editBookSheet")
    .classList.add("show");
}

async function saveBookEdits(){

  const book =
    findBook(editingBookId);

  if(!book){
    showToast("Buku tidak ditemukan");
    return;
  }

  const title =
    document
      .getElementById("editBookTitle")
      .value.trim();

  const author =
    document
      .getElementById("editBookAuthor")
      .value.trim();

  const status =
    document
      .getElementById("editBookStatus")
      .value;

  const text =
    document
      .getElementById("editBookText")
      .value.trim();

  if(!title){
    showToast("Judul buku wajib diisi");
    return;
  }

  book.title = title;
  book.author =
    author || "Penulis tidak diketahui";
  book.status = status;

  if(text){
    book.text = text;

    /*
     * Jika isi diubah manual, struktur dan halaman
     * dibuat ulang agar reader mengikuti isi terbaru.
     */
    book.structure =
      detectBookMetadata(
        smartStructureText(text)
      ).chapters || [];

    if(
      currentReader &&
      currentReader.id === book.id
    ){
      currentReader = book;

      readerPages =
        makeReaderPages(book.text);

      readerIndex =
        Math.min(
          book.currentPage || 0,
          Math.max(0,readerPages.length - 1)
        );
    }
  }

  await dbPut(book);

  const index =
    books.findIndex(
      item => item.id === book.id
    );

  if(index >= 0){
    books[index] = book;
  }

  renderBooks();

  document
    .getElementById("editBookSheet")
    .classList.remove("show");

  editingBookId = null;

  showToast("Perubahan buku disimpan");
}

function confirmDeleteBook(id){

  const book = findBook(id);

  if(!book) return;

  const ok =
    window.confirm(
      `Hapus buku "${book.title}"?\n\n` +
      `Progress, bookmark, highlight, dan catatan ` +
      `untuk buku ini juga akan dihapus.`
    );

  if(ok){
    deleteBookById(id);
  }
}

async function deleteBookById(id){

  const book = findBook(id);

  if(!book) return;

  /*
   * dbDelete dipakai agar file/data permanen benar-benar
   * hilang dari penyimpanan lokal.
   */
  if(typeof dbDelete === "function"){
    await dbDelete(book.id);
  }

  books =
    books.filter(
      item => item.id !== book.id
    );

  if(
    currentReader &&
    currentReader.id === book.id
  ){

    currentReader = null;
    readerPages = [];
    readerIndex = 0;

    const reader =
      document.getElementById("readerModal");

    if(reader){
      reader.classList.remove("show");
    }
  }

  renderBooks();

  updateProfileStats();

  showToast("Buku dihapus");
}

async function deleteEditingBook(){

  const book = findBook(editingBookId);

  if(!book) return;

  const ok =
    window.confirm(
      `Yakin hapus "${book.title}"?\n\n` +
      `Tindakan ini tidak bisa dibatalkan.`
    );

  if(!ok) return;

  closeSheet("editBookSheet");

  await deleteBookById(book.id);

  editingBookId = null;
}


function openFilePicker(){
  showPage("library");
  fileInput.click();
}

fileInput.addEventListener("change",async event=>{

  const file = event.target.files[0];

  if(!file) return;

  try{

    showProcessing(
      "Memproses buku...",
      `Membaca ${file.name}`
    );

    const result =
      await extractFile(file);

    if(!result.text.trim()){
      throw new Error(
        "Tidak ditemukan teks."
      );
    }

    updateProcessing(
      "Merapikan struktur...",
      "Membersihkan paragraf, heading, dan pemisah halaman."
    );

    const cleaned =
      smartStructureText(result.text);

    const metadata =
      detectBookMetadata(cleaned);

    const title =
      metadata.title || makeTitle(file.name);

    const book = {
      id:
        "book-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2),

      title,
      author:
        metadata.author ||
        "Penulis tidak diketahui",

      status:"unread",
      progress:0,

      genre:
        getExtension(file.name).toUpperCase(),

      source:"imported",

      fileName:file.name,
      fileSize:file.size,

      text:cleaned,

      structure:metadata.chapters || [],
      currentPage:0,
      bookmarks:[],
      highlights:[],
      notes:[],

      importedAt:
        new Date().toISOString()
    };

    await dbPut(book);

    books.unshift(book);

    renderBooks();

    document.getElementById("importStatus").textContent =
      `✓ ${title} berhasil ditambahkan · ` +
      `${cleaned.length.toLocaleString("id-ID")} karakter`;

    document
      .getElementById("importStatus")
      .classList.add("show");

    hideProcessing();

    showToast("Buku berhasil ditambahkan");

    showPage("library");

  }catch(error){

    console.error(error);

    hideProcessing();

    showToast(
      error.message ||
      "Gagal membaca file."
    );

  }finally{

    fileInput.value = "";

  }

});


/* =========================================================
   EXTRACTOR UTAMA
   ========================================================= */

async function extractFile(file){

  const ext = getExtension(file.name);

  if(ext === "pdf"){
    return await extractPDF(file);
  }

  if(["txt","md"].includes(ext)){
    return {
      text:await file.text()
    };
  }

  if(["html","htm"].includes(ext)){

    const raw = await file.text();

    const doc =
      new DOMParser()
        .parseFromString(raw,"text/html");

    doc
      .querySelectorAll(
        "script,style,noscript,nav,footer,header"
      )
      .forEach(el=>el.remove());

    return {
      text:doc.body
        ? doc.body.innerText
        : raw
    };
  }

  if(ext === "epub"){
    return await extractEPUB(file);
  }

  throw new Error(
    "Format belum didukung."
  );
}


/* =========================================================
   PDF → TEXT
   Jika teks PDF kosong/minim, otomatis masuk OCR.
   ========================================================= */

async function extractPDF(file){

  if(!pdfjsLib){

    /*
     * Beri waktu singkat bila module masih loading.
     */
    for(let i=0;i<30 && !pdfjsLib;i++){
      await new Promise(r=>setTimeout(r,300));
    }
  }

  if(!pdfjsLib){
    throw new Error(
      "PDF.js gagal dimuat. Periksa koneksi internet."
    );
  }

  const buffer =
    await file.arrayBuffer();

  const pdf =
    await pdfjsLib
      .getDocument({data:buffer})
      .promise;

  let text = "";
  let pagesWithText = 0;

  /*
   * Ekstraksi teks normal.
   */
  for(
    let pageNumber=1;
    pageNumber<=pdf.numPages;
    pageNumber++
  ){

    updateProcessing(
      "Mengekstrak teks PDF...",
      `Halaman ${pageNumber} dari ${pdf.numPages}`
    );

    const page =
      await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const pageText =
      content.items
        .map(item=>item.str || "")
        .join(" ")
        .replace(/\s+/g," ")
        .trim();

    if(pageText){
      pagesWithText++;
      text += pageText + "\n\n";
    }
  }

  /*
   * Jika hampir tidak ada teks, kemungkinan PDF adalah scan.
   * Jalankan OCR.
   */
  if(
    pagesWithText === 0 ||
    text.trim().length < 100
  ){

    if(!window.Tesseract){
      throw new Error(
        "OCR tidak tersedia. Periksa koneksi internet."
      );
    }

    text =
      await extractPDFWithOCR(pdf);
  }

  return {text};
}


/* =========================================================
   PDF SCAN → OCR
   ========================================================= */

async function extractPDFWithOCR(pdf){

  let output = "";

  const worker =
    await Tesseract.createWorker(
      "ind",
      1,
      {
        logger:message=>{

          if(
            message.status === "recognizing text"
          ){

            const percent =
              Math.round(
                (message.progress || 0) * 100
              );

            updateProcessing(
              "OCR PDF scan...",
              `Membaca halaman · ${percent}%`
            );
          }
        }
      }
    );

  try{

    for(
      let pageNumber=1;
      pageNumber<=pdf.numPages;
      pageNumber++
    ){

      updateProcessing(
        "OCR PDF scan...",
        `Halaman ${pageNumber} dari ${pdf.numPages}`
      );

      const page =
        await pdf.getPage(pageNumber);

      const viewport =
        page.getViewport({scale:1.5});

      const canvas =
        document.createElement("canvas");

      canvas.width =
        Math.ceil(viewport.width);

      canvas.height =
        Math.ceil(viewport.height);

      const context =
        canvas.getContext("2d");

      await page.render({
        canvasContext:context,
        viewport
      }).promise;

      const result =
        await worker.recognize(canvas);

      const pageText =
        result.data.text
          .replace(/\r/g,"\n")
          .trim();

      if(pageText){
        output +=
          pageText + "\n\n";
      }
    }

  }finally{

    await worker.terminate();

  }

  return output;
}


/* =========================================================
   EPUB → XHTML → TEXT
   ========================================================= */

async function extractEPUB(file){

  if(!window.JSZip){
    throw new Error(
      "Library EPUB belum tersedia."
    );
  }

  const zip =
    await JSZip.loadAsync(file);

  /*
   * container.xml menentukan lokasi OPF.
   */
  const containerFile =
    zip.file("META-INF/container.xml");

  if(!containerFile){
    throw new Error(
      "EPUB tidak memiliki container.xml."
    );
  }

  const containerXML =
    await containerFile.async("text");

  const containerDoc =
    new DOMParser()
      .parseFromString(
        containerXML,
        "application/xml"
      );

  const rootfile =
    containerDoc.querySelector(
      "rootfile"
    );

  if(!rootfile){
    throw new Error(
      "Struktur EPUB tidak valid."
    );
  }

  const opfPath =
    rootfile.getAttribute(
      "full-path"
    );

  const opfFile =
    zip.file(opfPath);

  if(!opfFile){
    throw new Error(
      "File OPF EPUB tidak ditemukan."
    );
  }

  const opfXML =
    await opfFile.async("text");

  const opfDoc =
    new DOMParser()
      .parseFromString(
        opfXML,
        "application/xml"
      );

  const basePath =
    opfPath.includes("/")
      ? opfPath.slice(
          0,
          opfPath.lastIndexOf("/") + 1
        )
      : "";

  const manifest = {};

  opfDoc
    .querySelectorAll("manifest > item")
    .forEach(item=>{
      manifest[
        item.getAttribute("id")
      ] = item.getAttribute("href");
    });

  const spine =
    [...opfDoc.querySelectorAll(
      "spine > itemref"
    )];

  let output = "";

  for(
    let i=0;
    i<spine.length;
    i++
  ){

    updateProcessing(
      "Mengekstrak EPUB...",
      `Bagian ${i+1} dari ${spine.length}`
    );

    const id =
      spine[i].getAttribute("idref");

    const href =
      manifest[id];

    if(!href) continue;

    const normalized =
      decodeURIComponent(
        basePath + href
      ).replace(
        /^\/+/,
        ""
      );

    const entry =
      zip.file(normalized);

    if(!entry) continue;

    const raw =
      await entry.async("text");

    const doc =
      new DOMParser()
        .parseFromString(
          raw,
          "text/html"
        );

    doc
      .querySelectorAll(
        "script,style,noscript,nav"
      )
      .forEach(el=>el.remove());

    if(doc.body){
      output +=
        doc.body.innerText +
        "\n\n";
    }
  }

  return {text:output};
}


/* =========================================================
   SMART STRUCTURE
   Ini adalah engine lokal, bukan AI cloud.
   Fungsinya membersihkan hasil extraction dan menyusun
   paragraf/heading agar reader lebih nyaman.
   ========================================================= */

function smartStructureText(raw){

  let text =
    String(raw || "")
      .replace(/\r\n/g,"\n")
      .replace(/\r/g,"\n")
      .replace(/\u00a0/g," ")
      .replace(/[ \t]+/g," ");

  let lines =
    text
      .split("\n")
      .map(line=>line.trim())
      .filter(Boolean);

  /*
   * Hapus baris yang biasanya merupakan header/footer PDF.
   * Nomor halaman tunggal juga dibuang.
   */
  lines =
    lines.filter(line=>{

      if(/^\d+$/.test(line)) return false;

      if(
        /^(page|halaman)\s+\d+(\s+of\s+\d+|\s+dari\s+\d+)?$/i
          .test(line)
      ){
        return false;
      }

      return true;
    });

  /*
   * Jika judul yang sama munc
