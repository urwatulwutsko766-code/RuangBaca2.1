/* notes.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

async function highlightSelection(color="yellow"){

  if(!currentReader) return;

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : "";

  if(text.length < 2){
    showToast("Pilih teks dulu");
    return;
  }

  if(!Array.isArray(currentReader.highlights)){
    currentReader.highlights = [];
  }

  const exists =
    currentReader.highlights.find(
      h => h.page === readerIndex && h.text === text
    );

  if(exists){

    currentReader.highlights =
      currentReader.highlights.filter(
        h => !(h.page === readerIndex && h.text === text)
      );

    showToast("Sorotan dihapus");

  }else{

    currentReader.highlights.push({
      page:readerIndex,
      text,
      color:["yellow","green","blue","pink"].includes(color)
        ? color
        : "yellow",
      createdAt:new Date().toISOString()
    });

    showToast("Teks disorot");
  }

  await dbPut(currentReader);

  const index =
    books.findIndex(book=>book.id === currentReader.id);

  if(index >= 0){
    books[index] = currentReader;
  }

  selection.removeAllRanges();

  document
    .getElementById("selectionToolbar")
    .classList.remove("show");

  renderReader();
}

function openNotes(){

  if(!currentReader) return;

  document
    .getElementById("readerMenuPanel")
    .classList.remove("show");

  document.getElementById("noteInput").value = "";

  renderNotes();

  document
    .getElementById("notesSheet")
    .classList.add("show");
}

function showTableOfContents(){

  if(!currentReader) return;

  document
    .getElementById("readerMenuPanel")
    .classList.remove("show");

  const chapters =
    Array.isArray(currentReader.structure)
      ? currentReader.structure
      : [];

  const list =
    document.getElementById("tocList");

  if(!chapters.length){

    list.innerHTML =
      `<div class="search-empty">
        Belum ada BAB yang terdeteksi.
        Jalankan “Analisis & rapikan” terlebih dahulu.
       </div>`;

  }else{

    list.innerHTML =
      chapters.map(chapter=>{

        const page =
          findChapterPage(chapter.title);

        return `
          <button class="toc-item"
            onclick="jumpToChapter(${page})">
            ${escapeHTML(chapter.title)}
            <small>Halaman ${page + 1}</small>
          </button>`;
      }).join("");
  }

  document
    .getElementById("tocSheet")
    .classList.add("show");
}

function jumpToChapter(page){

  readerIndex =
    Math.max(
      0,
      Math.min(
        readerPages.length - 1,
        Number(page) || 0
      )
    );

  closeSheet("tocSheet");
  renderReader();
}

function renderNotes(){

  const notes =
    Array.isArray(currentReader.notes)
      ? currentReader.notes
      : [];

  const list =
    document.getElementById("noteList");

  if(!notes.length){

    list.innerHTML =
      `<div class="search-empty">Belum ada catatan.</div>`;

    return;
  }

  list.innerHTML =
    notes.slice().reverse().map(note=>`
      <div class="note-item">
        ${escapeHTML(note.text)}
        <small>
          Halaman ${Number(note.page) + 1}
          · ${escapeHTML(note.createdAtLabel || "")}
        </small>
      </div>
    `).join("");
}
