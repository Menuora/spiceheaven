document.addEventListener("DOMContentLoaded", async function () {
  var fullMenu = document.getElementById("fullMenuImages");
  var itemImages = document.getElementById("itemImages");
  function card(item) {
    return `<article class="gallery-card"><img src="${item.imageUrl}" alt="${item.title}"><div><span>${item.type === "menu" ? "Full Menu" : "Menu Item"}</span><h3>${item.title}</h3></div></article>`;
  }
  try {
    var gallery = [];
    if (window.dbApi) {
      gallery = await window.dbApi.dbGetGallery();
    } else {
      var response = await fetch("/api/settings");
      var data = await response.json();
      gallery = data.gallery || [];
    }
    var menus = gallery.filter(function (item) { return item.type === "menu"; });
    var items = gallery.filter(function (item) { return item.type !== "menu"; });
    fullMenu.innerHTML = menus.length ? menus.map(card).join("") : "<p class='empty-note'>Full menu images uploaded by the restaurant will appear here.</p>";
    itemImages.innerHTML = items.length ? items.map(card).join("") : "<p class='empty-note'>Individual dish images uploaded by the restaurant will appear here.</p>";
  } catch (error) {
    fullMenu.innerHTML = "<p class='empty-note'>Gallery is temporarily unavailable.</p>";
  }
});
