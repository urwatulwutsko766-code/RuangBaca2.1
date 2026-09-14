
/* =========================================================
   RUANGBACA FINAL — HARDENING PATCH
   ========================================================= */

(function(){

  /* -------------------------------------------------------
     LOAD LIBRARY PERSISTENT
     Buku hasil upload tetap muncul setelah HTML dibuka lagi.
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     READER THEME
     ------------------------------------------------------- */

  window.toggleReaderTheme = function(){

    const screen =
      document.getElementById("readerModal");

    const isDark =
      screen.classList.contains("reader-dark");

    screen.classList.remove(
      "reader-paper",
      "reader-warm",
      "reader-dark"
    );

    if(isDark){

      screen.classList.add("reader-paper");

      document.body.classList.remove("dark");

      localStorage.setItem(
        "rb_theme",
        "light"
      );

      const status =
        document.getElementById("themeStatus");

      if(status){
        status.textContent = "Terang";
      }

      showToast("Mode terang aktif");

    }else{

      screen.classList.add("reader-dark");

      document.body.classList.add("dark");

      localStorage.setItem(
        "rb_theme",
        "dark"
      );

      const status =
        document.getElementById("themeStatus");

      if(status){
        status.textContent = "Gelap";
      }

      showToast("Mode gelap aktif");
    }

    document
      .getElementById("readerMenuPanel")
      .classList.remove("show");
  };


  /* -------------------------------------------------------
     OPEN BOOK → APPLY READER SETTINGS
     ------------------------------------------------------- */

  const originalOpenBookById =
    window.openBookById;

  window.openBookById = function(id){

    originalOpenBookById(id);

    applyReaderSettingsFinal();

    const screen =
      document.getElementById("readerModal");

    if(screen){

      const savedTheme =
        localStorage.getItem("rb_theme") || "light";

      screen.classList.remove(
        "reader-paper",
        "reader-warm",
        "reader-dark"
      );

      screen.classList.add(
        savedTheme === "dark"
          ? "reader-dark"
          : "reader-paper"
      );
    }
  };


  /* -------------------------------------------------------
     EDIT CURRENT BOOK
     ------------------------------------------------------- */

  window.editCurrentBook = function(){

    if(!currentReader){
      showToast("Tidak ada buku yang sedang dibaca");
      return;
    }

    document
      .getElementById("readerMenuPanel")
      .classList.remove("show");

    openEditBook(currentReader.id);
  };


  /* -------------------------------------------------------
     DELETE CURRENT BOOK
     ------------------------------------------------------- */

  window.deleteCurrentBookFinal = async function(){

    if(!currentReader){
      showToast("Tidak ada buku yang sedang dibaca");
      return;
    }

    if(currentReader.source === "demo"){
      showToast("Buku demo tidak bisa dihapus");
      return;
    }

    const title =
      currentReader.title || "buku ini";

    const ok =
      window.confirm(
        `Hapus "${title}"?\n\n` +
        `Progress, bookmark, highlight, catatan, ` +
        `dan data buku akan ikut dihapus.`
      );

    if(!ok) return;

    const id =
      currentReader.id;

    await deleteBookById(id);
  };


  /* -------------------------------------------------------
     BOOKMARK LIST + DELETE
     ------------------------------------------------------- */

  window.showBookmarks = function(){

    if(!currentReader){
      showToast("Tidak ada buku yang sedang dibaca");
      return;
    }

    const sheet =
      document.getElementById("tocSheet");

    const list =
      document.getElementById("tocList");

    if(!sheet || !list) return;

    document
      .getElementById("readerMenuPanel")
      .classList.remove("show");

    const bookmarks =
      Array.isArray(currentReader.bookmarks)
        ? [...currentReader.bookmarks].sort((a,b)=>a-b)
        : [];

    const heading =
      sheet.querySelector("h3");

    if(heading){
      heading.textContent = "Bookmark";
    }

    if(!bookmarks.length){

      list.innerHTML =
        `<div class="search-empty">
          Belum ada bookmark.
         </div>`;

    }else{

      list.innerHTML =
        bookmarks
          .map(page=>`
            <div class="toc-row">

              <button
                class="toc-item"
                type="button"
                onclick="jumpToChapter(${Number(page)})">

                ★ Halaman ${Number(page) + 1}

                <small>
                  Buka halaman yang disimpan
                </small>

              </button>

              <button
                class="toc-delete"
                type="button"
                aria-label="Hapus bookmark"
                onclick="deleteBookmarkFinal(${Number(page)})">
                ×
              </button>

            </div>
          `)
          .join("");
    }

    sheet.classList.add("show");
  };


  window.deleteBookmarkFinal = async function(page){

    if(!currentReader) return;

    currentReader.bookmarks =
      (currentReader.bookmarks || [])
        .filter(
          item=>Number(item) !== Number(page)
        );

    await dbPut(currentReader);

    const index =
      books.findIndex(
        book=>book.id === currentReader.id
      );

    if(index >= 0){
      books[index] = currentReader;
    }

    showBookmarks();
    updateBookmarkButton();

    showToast("Bookmark dihapus");
  };


  /* -------------------------------------------------------
     APPLY FINAL SETTINGS WHEN PAGE LOADS
     ------------------------------------------------------- */

  applyReaderSettingsFinal();

  /*
   * Tunggu database siap, lalu tampilkan Library yang tersimpan.
   */
  loadPersistentLibrary();

})();
