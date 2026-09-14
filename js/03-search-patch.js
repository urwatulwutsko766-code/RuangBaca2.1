
/* =========================================================
   FINAL SEARCH PATCH
   ========================================================= */

(function(){

  const input =
    document.getElementById("searchInput");

  const box =
    document.getElementById("searchBox");

  const results =
    document.getElementById("searchResults");

  if(!input || !results) return;

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

  input.addEventListener(
    "input",
    ()=>renderSearch(input.value)
  );

  document
    .getElementById("searchClear")
    ?.addEventListener("click",()=>{
      input.value = "";
      renderSearch("");
    });

})();
