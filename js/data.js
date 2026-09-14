/* data.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

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

function getBookById(id){
  return books.find(
    book=>String(book.id) === String(id)
  );
}

function saveProfile(){

  const name =
    document
      .getElementById("editName")
      .value
      .trim();

  const subtitle =
    document
      .getElementById("editSubtitle")
      .value
      .trim();

  if(!name){
    showToast("Nama tidak boleh kosong");
    return;
  }

  localStorage.setItem("rb_name",name);
  localStorage.setItem(
    "rb_subtitle",
    subtitle || "Pembaca aktif"
  );

  updateProfile();

  closeModal("profileModal");

  showToast("Profil berhasil disimpan");
}

function showToast(message){

  const toast =
    document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(
      ()=>toast.classList.remove("show"),
      2200
    );
}

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
   * Jika judul yang sama muncul berulang di awal hasil PDF,
   * pertahankan satu saja.
   */
  const seenEarly = new Set();

  lines =
    lines.filter((line,index)=>{

      const normalized =
        line
          .toLowerCase()
          .replace(/\s+/g," ")
          .trim();

      if(index < 40){

        if(seenEarly.has(normalized)){
          return false;
        }

        seenEarly.add(normalized);
      }

      return true;
    });

  const result = [];
  let paragraph = "";

  function flush(){

    if(paragraph.trim()){

      result.push(
        paragraph
          .replace(/\s+/g," ")
          .trim()
      );

      paragraph = "";
    }
  }

  function looksLikeHeading(line){

    if(!line || line.length > 100){
      return false;
    }

    if(
      /^(bab|chapter|chap|bagian|part|prolog|epilog|pendahuluan|daftar isi)\b/i
        .test(line)
    ){
      return true;
    }

    return /^[A-Z0-9][A-Z0-9 .,:;!?'"()\-]{5,90}$/.test(line);
  }

/* Shared helpers / fungsi lama yang belum perlu dipisah lagi. */
async function loadPDFJS(){
  try{
    pdfjsLib = await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
    );

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  }catch(error){
    console.error("PDF.js gagal dimuat:",error);
  }
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

function findBook(id){

  return books.find(
    book => String(book.id) === String(id)
  );
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

function flush(){

    if(paragraph.trim()){

      result.push(
        paragraph
          .replace(/\s+/g," ")
          .trim()
      );

      paragraph = "";
    }
  }

function makeReaderPages(text){

  const clean =
    smartStructureText(text);

  if(!clean){
    return [
      "Tidak ada teks untuk dibaca."
    ];
  }

  const maxChars = 2400;
  const pages = [];

  let remaining = clean;

  while(remaining.length > maxChars){

    let cut =
      remaining.lastIndexOf(
        "\n\n",
        maxChars
      );

    if(cut < maxChars * .55){

      cut =
        remaining.lastIndexOf(
          ". ",
          maxChars
        );

      if(cut < maxChars * .55){
        cut =
          remaining.lastIndexOf(
            " ",
            maxChars
          );
      }else{
        cut += 1;
      }
    }

    if(cut <= 0){
      cut = maxChars;
    }

    pages.push(
      remaining
        .slice(0,cut)
        .trim()
    );

    remaining =
      remaining
        .slice(cut)
        .trim();
  }

  if(remaining){
    pages.push(remaining);
  }

  return pages;
}

function highlightMarkup(text){

  let safe = escapeHTML(text);

  const saved =
    Array.isArray(currentReader.highlights)
      ? currentReader.highlights.filter(
          h=>h.page === readerIndex
        )
      : [];

  saved.forEach(highlight=>{

    const target =
      escapeHTML(highlight.text || "");

    if(!target) return;

    const color =
      ["yellow","green","blue","pink"].includes(
        highlight.color
      )
        ? highlight.color
        : "yellow";

    safe =
      safe.split(target).join(
        `<mark class="reader-highlight ${color}">${target}</mark>`
      );
  });

  return safe;
}

function findChapterPage(title){

  const needle =
    String(title || "").toLowerCase().trim();

  for(let i=0;i<readerPages.length;i++){

    if(
      readerPages[i]
        .toLowerCase()
        .includes(needle)
    ){
      return i;
    }
  }

  return 0;
}

async function saveCurrentNote(){

  if(!currentReader) return;

  const input =
    document.getElementById("noteInput");

  const text =
    input.value.trim();

  if(!text){
    showToast("Tulis catatan dulu");
    return;
  }

  if(!Array.isArray(currentReader.notes)){
    currentReader.notes = [];
  }

  const now = new Date();

  currentReader.notes.push({
    page:readerIndex,
    text,
    createdAt:now.toISOString(),
    createdAtLabel:now.toLocaleString(
      "id-ID",
      {dateStyle:"short",timeStyle:"short"}
    )
  });

  await dbPut(currentReader);

  input.value = "";
  renderNotes();

  showToast("Catatan disimpan");
}

function detectBookMetadata(text){

  const lines =
    String(text)
      .split(/\n+/)
      .map(line=>line.trim())
      .filter(Boolean);

  let title = "";
  let author = "";
  const chapters = [];

  /*
   * Judul: ambil kandidat heading terawal yang masuk akal.
   */
  for(const line of lines.slice(0,20)){

    if(
      line.length >= 3 &&
      line.length <= 100 &&
      !/^(daftar isi|contents|copyright|isbn)\b/i.test(line) &&
      !/^\d+$/.test(line)
    ){
      title = line;
      break;
    }
  }

  /*
   * Penulis: cari pola "oleh", "by", atau "author".
   */
  for(const line of lines.slice(0,40)){

    const match =
      line.match(
        /^(?:oleh|by|author)\s*[:\-]?\s*(.+)$/i
      );

    if(match){
      author = match[1].trim();
      break;
    }
  }

  lines.forEach((line,index)=>{

    if(
      /^(bab|chapter|chap|bagian|part|prolog|epilog)\b/i
        .test(line)
    ){
      chapters.push({
        title:line,
        line:index
      });
    }

  });

  return {
    title,
    author,
    chapters
  };
}

function updateBookmarkButton(){

  if(!currentReader) return;

  const saved =
    Array.isArray(currentReader.bookmarks) &&
    currentReader.bookmarks.includes(
      readerIndex
    );

  document.getElementById("bookmarkButton").textContent =
    saved
      ? "★ Hapus bookmark halaman"
      : "☆ Bookmark halaman";
}

async function removeCurrentBook(){

  if(!currentReader) return;

  if(currentReader.source === "demo"){
    showToast("Buku demo tidak bisa dihapus");
    return;
  }

  const title =
    currentReader.title;

  await dbDelete(
    currentReader.id
  );

  books =
    books.filter(
      book=>book.id !== currentReader.id
    );

  currentReader = null;

  closeModal("readerModal");

  renderBooks();

  showToast(
    `"${title}" dihapus`
  );
}

function openSearchResult(id){
  searchResults.classList.remove("show");
  searchInput.blur();
  openBookById(id);
}

function updateProfileStats(){

  const total =
    books.length;

  const done =
    books.filter(
      book=>book.status === "done"
    ).length;

  const totalPagesRead =
    books.reduce(
      (sum,book)=>
        sum + Number(book.currentPage || 0),
      0
    );

  const hours =
    Math.floor(
      (totalPagesRead * 3) / 60
    );

  const bookCount =
    document.getElementById("bookCount");

  const doneCount =
    document.getElementById("doneCount");

  const readingHours =
    document.getElementById("readingHours");

  if(bookCount) bookCount.textContent = total;
  if(doneCount) doneCount.textContent = done;
  if(readingHours) readingHours.textContent = `${hours}h`;
}

function updateProfile(){

  const name =
    localStorage.getItem("rb_name") ||
    "RuangBaca User";

  const subtitle =
    localStorage.getItem("rb_subtitle") ||
    "Pembaca aktif";

  document.getElementById("profileName").textContent =
    name;

  document.getElementById("profileSubtitle").textContent =
    subtitle;

  const initial =
    name.charAt(0).toUpperCase();

  document.getElementById("bigAvatar").textContent =
    initial;

  document.querySelector(".profile-btn").textContent =
    initial;
}

function showProcessing(title,text){

  document.getElementById("processingTitle").textContent =
    title;

  document.getElementById("processingText").textContent =
    text;

  document
    .getElementById("processing")
    .classList.add("show");
}

function updateProcessing(title,text){

  document.getElementById("processingTitle").textContent =
    title;

  document.getElementById("processingText").textContent =
    text;
}

function hideProcessing(){

  document
    .getElementById("processing")
    .classList.remove("show");
}

function getExtension(name){

  return String(name)
    .split(".")
    .pop()
    .toLowerCase();
}

function makeTitle(name){

  return String(name)
    .replace(/\.[^.]+$/,"")
    .replace(/[_-]+/g," ")
    .replace(/\s+/g," ")
    .trim() ||
    "Buku tanpa judul";
}

function renderSearch(keyword){

    const q =
      String(keyword || "")
        .toLowerCase()
        .trim();

    box.classList.toggle(
      "has-value",
      Boolean(q)
    );

    if(!q){

      results.classList.remove("show");
      results.innerHTML = "";
      return;
    }

    const found =
      books.filter(book=>{

        const haystack = [
          book.title,
          book.author,
          book.genre,
          book.fileName,
          book.text
        ]
        .join(" ")
        .toLowerCase();

        return haystack.includes(q);
      });

    results.classList.add("show");

    if(!found.length){

      results.innerHTML =
        `<div class="search-empty">
          Tidak ditemukan buku untuk
          “${escapeHTML(q)}”.
         </div>`;

      return;
    }

    results.innerHTML =
      found
        .slice(0,15)
        .map(book=>{

          const title =
            escapeHTML(book.title || "Tanpa judul");

          const author =
            escapeHTML(
              book.author ||
              "Penulis tidak diketahui"
            );

          const cover =
            escapeHTML(
              String(book.title || "BUKU")
                .slice(0,18)
                .toUpperCase()
            );

          return `
            <button class="search-result"
              type="button"
              data-search-book="${escapeHTML(book.id)}">

              <span class="search-result-cover">
                ${cover}
              </span>

              <span class="search-result-info">
                <strong>${title}</strong>
                <small>${author}</small>
              </span>

              <span>›</span>
            </button>
          `;
        })
        .join("");

    results
      .querySelectorAll("[data-search-book]")
      .forEach(button=>{

        button.addEventListener("click",()=>{

          const id =
            button.dataset.searchBook;

          results.classList.remove("show");

          input.blur();

          openBookById(id);

        });

      });
  }

async function migrateBooks(){

  try{

    for(const book of books){

      let changed = false;

      if(!Array.isArray(book.bookmarks)){
        book.bookmarks = [];
        changed = true;
      }

      if(!Array.isArray(book.highlights)){
        book.highlights = [];
        changed = true;
      }

      if(!Array.isArray(book.notes)){
        book.notes = [];
        changed = true;
      }

      if(!Array.isArray(book.structure)){
        book.structure = [];
        changed = true;
      }

      if(!book.status){
        book.status = "unread";
        changed = true;
      }

      if(
        book.progress === undefined ||
        book.progress === null
      ){
        book.progress = 0;
        changed = true;
      }

      if(!book.genre){
        book.genre = "Umum";
        changed = true;
      }

      /*
       * Demo tidak perlu ditulis ulang terus-menerus,
       * tetapi tetap dinormalisasi di memory.
       */
      if(
        book.source !== "demo" &&
        changed
      ){
        await dbPut(book);
      }
    }

    renderBooks();
    updateProfileStats();

  }catch(error){

    console.error(
      "Migrasi data gagal:",
      error
    );

  }

}

async function loadPersistentLibrary(){

    try{

      const stored =
        await dbGetAll();

      if(!Array.isArray(stored) || !stored.length){
        renderBooks();
        updateStats();
        return;
      }

      /*
       * Demo tetap ada.
       * Buku tersimpan menggantikan versi dengan ID sama.
       */
      const map = new Map();

      books.forEach(book=>{
        map.set(String(book.id),book);
      });

      stored.forEach(book=>{
        map.set(String(book.id),book);
      });

      books =
        [...map.values()]
          .sort((a,b)=>{

            if(a.source === "demo" && b.source !== "demo"){
              return 1;
            }

            if(a.source !== "demo" && b.source === "demo"){
              return -1;
            }

            return String(
              b.importedAt || ""
            ).localeCompare(
              String(a.importedAt || "")
            );
          });

      /*
       * Normalisasi buku lama.
       */
      for(const book of books){

        if(!Array.isArray(book.bookmarks)){
          book.bookmarks = [];
        }

        if(!Array.isArray(book.highlights)){
          book.highlights = [];
        }

        if(!Array.isArray(book.notes)){
          book.notes = [];
        }

        if(!Array.isArray(book.structure)){
          book.structure = [];
        }

        if(!book.genre){
          book.genre = "Umum";
        }
      }

      renderBooks();
      updateStats();
      updateProfileStats();

    }catch(error){

      console.error(
        "Gagal memuat Library:",
        error
      );

      renderBooks();
      updateStats();
    }
  }

/* Shared bootstrap: menjaga kompatibilitas dengan inline onclick di HTML. */
window.RuangBaca = window.RuangBaca || {};
