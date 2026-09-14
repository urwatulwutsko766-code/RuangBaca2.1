
/* =========================================================
   DATA MIGRATION
   Buku lama tetap aman ketika fitur final ditambahkan.
   ========================================================= */

(async function migrateBooks(){

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

})();
