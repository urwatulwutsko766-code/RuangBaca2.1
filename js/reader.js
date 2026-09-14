/* reader.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

function openBookById(id){

  const book =
    getBookById(id);

  if(!book){
    showToast("Buku tidak ditemukan");
    return;
  }

  currentReader = book;

  readerPages =
    makeReaderPages(book.text || "");

  readerIndex =
    Math.min(
      book.currentPage || 0,
      readerPages.length - 1
    );

  document.getElementById("readerTitle").textContent =
    book.title;

  document
    .getElementById("readerModal")
    .classList.add("show");

  document.getElementById("readerModal").classList.remove("controls-hidden");

  document.getElementById("deleteBookButton").style.display =
    book.source === "demo"
      ? "none"
      : "block";

  renderReader();
}

function readerPrev(){

  if(readerIndex <= 0) return;

  readerIndex--;

  renderReader();
}

function readerNext(){

  if(readerIndex >= readerPages.length - 1) return;

  readerIndex++;

  renderReader();
}

function toggleReaderMenu(){

  const panel =
    document.getElementById("readerMenuPanel");

  panel.classList.toggle("show");
}

function changeReaderFont(direction){

  const sizes = [
    "16px",
    "18px",
    "20px",
    "22px",
    "24px"
  ];

  const current =
    getComputedStyle(
      document.documentElement
    )
    .getPropertyValue("--reader-size")
    .trim() || "18px";

  let index =
    sizes.indexOf(current);

  if(index < 0) index = 1;

  index =
    Math.max(
      0,
      Math.min(
        sizes.length - 1,
        index + direction
      )
    );

  document.documentElement.style
    .setProperty(
      "--reader-size",
      sizes[index]
    );

  localStorage.setItem(
    "rb_reader_px",
    sizes[index]
  );

  document
    .getElementById("readerMenuPanel")
    .classList.remove("show");

  showToast(
    `Ukuran teks ${sizes[index]}`
  );
}

function toggleReaderTheme(){

  document.body.classList.toggle("dark");

  const dark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "rb_theme",
    dark ? "dark" : "light"
  );

  const status =
    document.getElementById("themeStatus");

  if(status){
    status.textContent =
      dark ? "Gelap" : "Terang";
  }

  document
    .getElementById("readerMenuPanel")
    .classList.remove("show");

  showToast(
    dark
      ? "Mode gelap aktif"
      : "Mode terang aktif"
  );
}
