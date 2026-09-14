/* bookmarks.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

function toggleBookmark(){

  if(!currentReader) return;

  if(!Array.isArray(currentReader.bookmarks)){
    currentReader.bookmarks = [];
  }

  const index =
    currentReader.bookmarks.indexOf(
      readerIndex
    );

  if(index >= 0){
    currentReader.bookmarks.splice(index,1);
    showToast("Bookmark dihapus");
  }else{
    currentReader.bookmarks.push(readerIndex);
    showToast("Halaman dibookmark");
  }

  dbPut(currentReader)
    .catch(console.error);

  updateBookmarkButton();
}

function showBookmarks(){

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

  if(!bookmarks.length){
    showToast("Belum ada bookmark");
    return;
  }

  const target =
    bookmarks[0];

  readerIndex =
    Math.max(
      0,
      Math.min(
        readerPages.length - 1,
        target
      )
    );

  renderReader();

  showToast(
    `Membuka bookmark halaman ${readerIndex + 1}`
  );
}
