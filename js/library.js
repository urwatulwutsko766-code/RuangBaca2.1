/* library.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

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

function openFilePicker(){
  showPage("library");
  fileInput.click();
}

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

async function runSmartRestructure(){

  if(!currentReader) return;

  document
    .getElementById("readerMenuPanel")
    .classList.remove("show");

  showProcessing(
    "Merapikan buku...",
    "Mendeteksi judul, bab, paragraf, dan teks yang berantakan."
  );

  await new Promise(
    resolve=>setTimeout(resolve,80)
  );

  const cleaned =
    smartStructureText(
      currentReader.text || ""
    );

  const metadata =
    detectBookMetadata(cleaned);

  currentReader.text =
    cleaned;

  if(
    metadata.title &&
    currentReader.source === "imported"
  ){
    currentReader.title =
      metadata.title;
  }

  if(
    metadata.author &&
    currentReader.author === "Penulis tidak diketahui"
  ){
    currentReader.author =
      metadata.author;
  }

  /*
   * Struktur bab disimpan agar nanti mudah dikembangkan
   * menjadi daftar isi dan navigasi bab.
   */
  currentReader.structure =
    metadata.chapters;

  currentReader.restructuredAt =
    new Date().toISOString();

  readerPages =
    makeReaderPages(
      currentReader.text
    );

  readerIndex =
    Math.min(
      currentReader.currentPage || 0,
      readerPages.length - 1
    );

  await dbPut(currentReader);

  const index =
    books.findIndex(
      book=>book.id === currentReader.id
    );

  if(index >= 0){
    books[index] = currentReader;
  }

  renderBooks();
  renderReader();

  hideProcessing();

  showToast("Buku berhasil dirapikan");
}

function openAddBook(){
  document
    .getElementById("addModal")
    .classList.add("show");
}

async function addManualBook(){

  const title =
    document
      .getElementById("newTitle")
      .value
      .trim();

  const author =
    document
      .getElementById("newAuthor")
      .value
      .trim();

  const status =
    document
      .getElementById("newStatus")
      .value;

  if(!title || !author){
    showToast("Judul dan penulis wajib diisi");
    return;
  }

  const book = {

    id:
      "manual-" +
      Date.now(),

    title,
    author,
    status,

    progress:
      status === "done"
        ? 100
        : 0,

    genre:"Manual",

    source:"manual",

    text:
      `${title}\n\n` +
      `Buku ini ditambahkan secara manual. ` +
      `Upload file buku untuk memasukkan isi aslinya.`,

    currentPage:0,
    bookmarks:[],
    highlights:[],
    notes:[],
    structure:[]
  };

  await dbPut(book);

  books.unshift(book);

  renderBooks();

  closeModal("addModal");

  document.getElementById("newTitle").value = "";
  document.getElementById("newAuthor").value = "";

  showPage("library");

  showToast("Buku berhasil ditambahkan");
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

function searchBooks(keyword){

  const query =
    String(keyword || "").toLowerCase().trim();

  if(!query){
    searchResults.classList.remove("show");
    searchResults.innerHTML = "";
    searchBox.classList.remove("has-value");
    return;
  }

  searchBox.classList.add("has-value");

  const results =
    books.filter(book=>{

      const title =
        String(book.title || "").toLowerCase();

      const author =
        String(book.author || "").toLowerCase();

      const content =
        String(book.text || "").toLowerCase();

      return (
        title.includes(query) ||
        author.includes(query) ||
        content.includes(query)
      );
    });

  searchResults.classList.add("show");

  if(!results.length){
    searchResults.innerHTML =
      `<div class="search-empty">
        Tidak ditemukan buku untuk “${escapeHTML(query)}”.
       </div>`;
    return;
  }

  searchResults.innerHTML =
    results.slice(0,20).map(book=>{

      const cover =
        escapeHTML(
          String(book.title || "")
            .slice(0,18)
            .toUpperCase()
        );

      return `
        <button class="search-result"
          onclick="openSearchResult('${escapeHTML(book.id)}')">

          <span class="search-result-cover">${cover}</span>

          <span class="search-result-info">
            <strong>${escapeHTML(book.title)}</strong>
            <small>${escapeHTML(book.author)}</small>
          </span>

          <span>›</span>
        </button>`;
    }).join("");
}

function openAllBooksFromStats(){

  showPage("library");

  document
    .querySelectorAll(".filter")
    .forEach(button=>{
      button.classList.toggle(
        "active",
        button.dataset.filter === "all"
      );
    });

  renderBooks(books);

  showToast(
    `${books.length} buku di Library`
  );
}

function openFinishedBooksFromStats(){

  showPage("library");

  document
    .querySelectorAll(".filter")
    .forEach(button=>{
      button.classList.toggle(
        "active",
        button.dataset.filter === "done"
      );
    });

  const finished =
    books.filter(
      book=>book.status === "done"
    );

  renderBooks(finished);

  showToast(
    `${finished.length} buku selesai`
  );
}

function openReadingTimeFromStats(){

  const pagesRead =
    books.reduce(
      (sum,book)=>
        sum + (book.currentPage || 0),
      0
    );

  const hours =
    Math.floor(pagesRead / 20);

  const minutes =
    (pagesRead * 3) % 60;

  showToast(
    `Perkiraan waktu baca: ${hours}j ${minutes}m`
  );
}
