/* profile.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

function openEditProfile(){

  document.getElementById("editName").value =
    localStorage.getItem("rb_name") ||
    "RuangBaca User";

  document.getElementById("editSubtitle").value =
    localStorage.getItem("rb_subtitle") ||
    "Pembaca aktif";

  document
    .getElementById("profileModal")
    .classList.add("show");
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

function updateStats(){

  const imported =
    books.filter(
      book=>book.source !== "demo"
    );

  const done =
    books.filter(
      book=>book.status === "done"
    ).length;

  /*
   * Waktu baca masih estimasi sederhana berdasarkan
   * halaman yang sudah dibaca.
   */
  const pagesRead =
    books.reduce(
      (sum,book)=>
        sum + (book.currentPage || 0),
      0
    );

  const hours =
    Math.floor(
      pagesRead / 20
    );

  document.getElementById("bookCount").textContent =
    books.length;

  document.getElementById("doneCount").textContent =
    done;

  document.getElementById("readingHours").textContent =
    hours + "h";
}
