/* navigation.js — sistem RuangBaca berdasarkan struktur HTML FINAL. */

function showPage(pageId){

  pages.forEach(page=>{
    page.classList.toggle("active",page.id === pageId);
  });

  navs.forEach(nav=>{
    nav.classList.toggle("active",nav.dataset.page === pageId);
  });

  window.scrollTo({top:0,behavior:"smooth"});
}

function closeModal(id){

  const modal =
    document.getElementById(id);

  modal.classList.remove("show");

  if(id === "readerModal"){
    modal.classList.remove("controls-hidden");

    const toolbar = document.getElementById("selectionToolbar");
    const menu = document.getElementById("readerMenuPanel");

    if(toolbar) toolbar.classList.remove("show");
    if(menu) menu.classList.remove("show");
  }
}

function outsideClose(event,id){

  if(event.target.id === id){
    closeModal(id);
  }
}

function closeSheet(id){
  document.getElementById(id).classList.remove("show");
}

function outsideSheet(event,id){
  if(event.target.id === id){
    closeSheet(id);
  }
}

function toggleTheme(){

  document.body.classList.toggle("dark");

  const dark =
    document.body.classList.contains("dark");

  localStorage.setItem(
    "rb_theme",
    dark ? "dark" : "light"
  );

  document.getElementById("themeStatus").textContent =
    dark ? "Gelap" : "Terang";

  showToast(
    dark
      ? "Mode gelap aktif"
      : "Mode terang aktif"
  );
}

function openReadingSettings(){

  document
    .getElementById("settingsModal")
    .classList.add("show");

  document.getElementById("fontSize").value =
    localStorage.getItem("rb_font_size") ||
    "normal";
}

function saveReadingSettings(){

  const size =
    document.getElementById("fontSize").value;

  const value = {
    normal:"16px",
    large:"18px",
    xlarge:"20px"
  }[size];

  document.documentElement.style
    .setProperty(
      "--reader-size",
      value
    );

  localStorage.setItem(
    "rb_font_size",
    size
  );

  /*
   * Reader content menggunakan inline font-size
   * agar pengaturan langsung terlihat.
   */
  document.documentElement.style
    .setProperty("--reader-size", value);

  document.getElementById("readerText").style.fontSize =
    value;

  closeModal("settingsModal");

  showToast("Pengaturan membaca disimpan");
}
