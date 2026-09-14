
/* =========================================================
   RUANGBACA FINAL PATCH
   Fitur non-AI: reader settings, swipe, progress permanen,
   bookmark list, highlight-note, DOCX, dan metadata buku.
   ========================================================= */

(function(){

  /* -------------------------------------------------------
     DOCX
     ------------------------------------------------------- */

  const originalExtractFile = window.extractFile;

  window.extractFile = async function(file){

    const ext =
      String(file.name)
        .split(".")
        .pop()
        .toLowerCase();

    if(ext === "docx"){

      if(!window.mammoth){
        throw new Error(
          "Pembaca DOCX belum tersedia. Periksa koneksi internet."
        );
      }

      updateProcessing(
        "Mengekstrak DOCX...",
        "Membaca isi dokumen."
      );

      const arrayBuffer =
        await file.arrayBuffer();

      const result =
        await mammoth.extractRawText({
          arrayBuffer
        });

      return {
        text:result.value || ""
      };
    }

    return originalExtractFile(file);
  };


  /* -------------------------------------------------------
     BOOK METADATA / EDIT
     ------------------------------------------------------- */

  const originalOpenEditBook =
    window.openEditBook;

  window.openEditBook = function(id){

    originalOpenEditBook(id);

    const book = findBook(id);

    if(!book) return;

    const genre =
      document.getElementById("editBookGenre");

    const fileName =
      document.getElementById("editBookFileName");

    if(genre){
      genre.value = book.genre || "";
    }

    if(fileName){
      fileName.value =
        book.fileName || "Buku manual";
    }
  };


  const originalSaveBookEdits =
    window.saveBookEdits;

  window.saveBookEdits = async function(){

    const book = findBook(editingBookId);

    if(!book){
      showToast("Buku tidak ditemukan");
      return;
    }

    const genre =
      document
        .getElementById("editBookGenre")
        ?.value
        .trim();

    book.genre =
      genre || "Umum";

    await originalSaveBookEdits();

  };


  /* -------------------------------------------------------
     PROGRESS PERMANEN
     ------------------------------------------------------- */

  const originalRenderReader =
    window.renderReader;

  window.renderReader = function(){

    originalRenderReader();

    if(!currentReader) return;

    const total =
      Math.max(
        1,
        readerPages.length
      );

    const progress =
      Math.min(
        100,
        Math.round(
          ((readerIndex + 1) / total) * 100
        )
      );

    currentReader.progress = progress;

    if(progress >= 100){
      currentReader.status = "done";
    }else if(progress > 0){
      currentReader.status = "reading";
    }

    dbPut(currentReader)
      .then(()=>{
        const index =
          books.findIndex(
            b=>b.id === currentReader.id
          );

        if(index >= 0){
          books[index] = currentReader;
        }
      })
      .catch(console.error);

    updateBookmarkButton();

  };


  /* -------------------------------------------------------
     BOOKMARK LIST
     ------------------------------------------------------- */

  window.showBookmarks = function(){

    if(!currentReader){
      showToast("Tidak ada buku yang sedang dibaca");
      return;
    }

    const bookmarks =
      Array.isArray(currentReader.bookmarks)
        ? currentReader.bookmarks
        : [];

    document
      .getElementById("readerMenuPanel")
      .classList.remove("show");

    const list =
      document.getElementById("tocList");

    const sheet =
      document.getElementById("tocSheet");

    if(!list || !sheet) return;

    if(!bookmarks.length){

      list.innerHTML =
        `<div class="search-empty">
          Belum ada bookmark.
         </div>`;

    }else{

      list.innerHTML =
        bookmarks
          .slice()
          .sort((a,b)=>a-b)
          .map(page=>`
            <button class="toc-item"
              onclick="jumpToChapter(${page})">
              ★ Halaman ${Number(page) + 1}
              <small>Bookmark buku ini</small>
            </button>
          `)
          .join("");
    }

    const heading =
      sheet.querySelector("h3");

    if(heading){
      heading.textContent = "Bookmark";
    }

    sheet.classList.add("show");
  };


  /* -------------------------------------------------------
     HIGHLIGHT + CATATAN SELECTION
     ------------------------------------------------------- */

  let selectedReaderText = "";

  document.addEventListener("selectionchange",()=>{

    if(!currentReader) return;

    const selection =
      window.getSelection();

    const text =
      selection
        ? selection.toString().trim()
        : "";

    if(
      text &&
      document
        .getElementById("readerText")
        ?.contains(selection.anchorNode)
    ){
      selectedReaderText = text;

      document
        .getElementById("selectionToolbar")
        .classList.add("show");

    }else{

      /*
       * Jangan langsung menghilangkan toolbar ketika
       * user memindahkan jari dari teks ke toolbar.
       */
      setTimeout(()=>{

        const toolbar =
          document.getElementById("selectionToolbar");

        if(
          toolbar &&
          !toolbar.matches(":hover")
        ){
          toolbar.classList.remove("show");
        }

      },180);
    }
  });


  window.noteSelectedText = function(){

    if(!currentReader) return;

    if(!selectedReaderText){
      showToast("Pilih teks dulu");
      return;
    }

    const input =
      document.getElementById("noteInput");

    if(input){

      input.value =
        `Kutipan:\n"${selectedReaderText}"\n\nCatatan saya: `;

    }

    openNotes();

    setTimeout(()=>{
      input?.focus();
      input?.setSelectionRange(
        input.value.length,
        input.value.length
      );
    },80);
  };


  /* -------------------------------------------------------
     CATATAN: simpan kutipan highlight juga
     ------------------------------------------------------- */

  const originalSaveCurrentNote =
    window.saveCurrentNote;

  window.saveCurrentNote = async function(){

    if(
      currentReader &&
      selectedReaderText
    ){

      const input =
        document.getElementById("noteInput");

      const raw =
        input?.value.trim() || "";

      if(!raw){
        showToast("Tulis catatan dulu");
        return;
      }

      if(!Array.isArray(currentReader.notes)){
        currentReader.notes = [];
      }

      currentReader.notes.push({
        page:readerIndex,
        quote:selectedReaderText,
        text:raw,
        createdAt:new Date().toISOString()
      });

      await dbPut(currentReader);

      selectedReaderText = "";

      if(input) input.value = "";

      renderNotes();

      showToast("Catatan highlight disimpan");

      return;
    }

    return originalSaveCurrentNote();
  };


  /* -------------------------------------------------------
     RENDER CATATAN
     ------------------------------------------------------- */

  const originalRenderNotes =
    window.renderNotes;

  window.renderNotes = function(){

    if(!currentReader){
      return originalRenderNotes();
    }

    const notes =
      Array.isArray(currentReader.notes)
        ? currentReader.notes
        : [];

    const list =
      document.getElementById("noteList");

    if(!list) return;

    if(!notes.length){

      list.innerHTML =
        `<div class="search-empty">
          Belum ada catatan.
         </div>`;

      return;
    }

    list.innerHTML =
      notes
        .slice()
        .reverse()
        .map(note=>{

          const quote =
            note.quote
              ? `<blockquote>“${escapeHTML(note.quote)}”</blockquote>`
              : "";

          return `
            <div class="note-highlight">
              ${quote}
              <p>${escapeHTML(note.text || "")}</p>
              <small>
                Halaman ${Number(note.page || 0) + 1}
              </small>
            </div>
          `;
        })
        .join("");
  };


  /* -------------------------------------------------------
     READER SETTINGS
     ------------------------------------------------------- */

  window.openReaderSettings = function(){

    document
      .getElementById("readerMenuPanel")
      .classList.remove("show");

    const size =
      localStorage.getItem("rb_reader_final_size") || "18";

    const line =
      localStorage.getItem("rb_reader_final_line") || "1.85";

    const width =
      localStorage.getItem("rb_reader_final_width") || "680";

    const font =
      localStorage.getItem("rb_reader_final_font") || "system";

    const bg =
      localStorage.getItem("rb_reader_final_bg") || "paper";

    document.getElementById("readerSizeSetting").value = size;
    document.getElementById("readerLineSetting").value = line;
    document.getElementById("readerWidthSetting").value = width;
    document.getElementById("readerFontSetting").value = font;
    document.getElementById("readerBgSetting").value = bg;

    document
      .getElementById("readerSettingsSheet")
      .classList.add("show");
  };


  window.saveReaderSettingsFinal = function(){

    const size =
      document.getElementById("readerSizeSetting").value;

    const line =
      document.getElementById("readerLineSetting").value;

    const width =
      document.getElementById("readerWidthSetting").value;

    const font =
      document.getElementById("readerFontSetting").value;

    const bg =
      document.getElementById("readerBgSetting").value;

    localStorage.setItem(
      "rb_reader_final_size",
      size
    );

    localStorage.setItem(
      "rb_reader_final_line",
      line
    );

    localStorage.setItem(
      "rb_reader_final_width",
      width
    );

    localStorage.setItem(
      "rb_reader_final_font",
      font
    );

    localStorage.setItem(
      "rb_reader_final_bg",
      bg
    );

    applyReaderSettingsFinal();

    closeSheet("readerSettingsSheet");

    showToast("Pengaturan membaca disimpan");
  };


  window.applyReaderSettingsFinal = function(){

    const size =
      localStorage.getItem("rb_reader_final_size") || "18";

    const line =
      localStorage.getItem("rb_reader_final_line") || "1.85";

    const width =
      localStorage.getItem("rb_reader_final_width") || "680";

    const fontKey =
      localStorage.getItem("rb_reader_final_font") || "system";

    const bg =
      localStorage.getItem("rb_reader_final_bg") || "paper";

    const screen =
      document.getElementById("readerModal");

    if(!screen) return;

    screen.style.setProperty(
      "--reader-size",
      `${size}px`
    );

    screen.style.setProperty(
      "--reader-line",
      line
    );

    screen.style.setProperty(
      "--reader-width",
      `${width}px`
    );

    const fontMap = {
      system:'system-ui,-apple-system,"Segoe UI",sans-serif',
      serif:'Georgia,"Times New Roman",serif',
      sans:'Inter,system-ui,-apple-system,"Segoe UI",sans-serif',
      mono:'ui-monospace,SFMono-Regular,Menlo,monospace'
    };

    screen.style.setProperty(
      "--reader-font",
      fontMap[fontKey] || fontMap.system
    );

    screen.classList.remove(
      "reader-paper",
      "reader-warm",
      "reader-dark"
    );

    screen.classList.add(
      `reader-${bg}`
    );
  };


  /* -------------------------------------------------------
     READER PAGE SWIPE
     Hanya aktif di area isi buku.
     Vertikal tetap menjadi scroll biasa.
     ------------------------------------------------------- */

  const readerContent =
    document.getElementById("readerContent");

  if(readerContent){

    let sx = 0;
    let sy = 0;
    let cx = 0;
    let dragging = false;
    let horizontal = false;

    readerContent.addEventListener(
      "touchstart",
      event=>{

        if(event.touches.length !== 1) return;

        sx =
          event.touches[0].clientX;

        sy =
          event.touches[0].clientY;

        cx = sx;

        dragging = true;
        horizontal = false;

      },
      {passive:true}
    );

    readerContent.addEventListener(
      "touchmove",
      event=>{

        if(
          !dragging ||
          !event.touches.length
        ) return;

        cx =
          event.touches[0].clientX;

        const cy =
          event.touches[0].clientY;

        const dx = cx - sx;
        const dy = cy - sy;

        if(!horizontal){

          if(
            Math.abs(dx) < 10 &&
            Math.abs(dy) < 10
          ) return;

          if(
            Math.abs(dy) >
            Math.abs(dx) * 1.2
          ){

            /*
             * Gerakan vertikal = biarkan browser scroll.
             */
            dragging = false;
            return;
          }

          horizontal = true;
        }

        /*
         * Jangan mengubah scroll vertikal ketika user
         * sedang melakukan swipe halaman.
         */
        if(horizontal){
          event.preventDefault();
        }

      },
      {passive:false}
    );

    readerContent.addEventListener(
      "touchend",
      ()=>{

        if(!horizontal){
          dragging = false;
          return;
        }

        const dx = cx - sx;
        const threshold = 55;

        dragging = false;
        horizontal = false;

        if(Math.abs(dx) < threshold) return;

        if(dx < 0){
          readerNext();
        }else{
          readerPrev();
        }

      },
      {passive:true}
    );

    readerContent.addEventListener(
      "touchcancel",
      ()=>{
        dragging = false;
        horizontal = false;
      },
      {passive:true}
    );
  }


  /* -------------------------------------------------------
     INITIAL SETTINGS
     ------------------------------------------------------- */

  applyReaderSettingsFinal();

})();
