(function () {
  function qs(selector, root) { return (root || document).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function setText(selector, text) { qsa(selector).forEach(function (el) { el.textContent = text; }); }
  function setHref(selector, href) { qsa(selector).forEach(function (el) { if (href) el.href = href; }); }
  function setImage(selector, src) { qsa(selector).forEach(function (el) { if (src) el.src = src; }); }
  function setBackground(selector, src) { qsa(selector).forEach(function (el) { if (src) el.style.backgroundImage = "linear-gradient(to bottom, rgba(0,0,0,.6), rgba(0,0,0,0)), url('" + src + "')"; }); }

  function applyMap(src) {
    qsa("[data-map-frame]").forEach(function (frame) {
      if (src) frame.src = src;
      else frame.closest(".map-panel")?.classList.add("is-empty");
    });
  }

  function applySettings(data) {
    var settings = data.settings || {};
    var images = data.images || {};
    var name = settings.restaurantName || "Spice Haven";
    setText("[data-site-name]", name);
    setText("[data-opening-hours]", settings.openingHours || "Mon-Sun: 12:00 PM - 10:30 PM");
    setHref("[data-social='facebook']", settings.facebookUrl || "#");
    setHref("[data-social='instagram']", settings.instagramUrl || "#");
    setHref("[data-social='twitter']", settings.twitterUrl || "#");
    setBackground("[data-image-bg='heroImage1']", images.heroImage1);
    setBackground("[data-image-bg='menuHeaderImage']", images.menuHeaderImage);
    setBackground("[data-image-bg='galleryHeaderImage']", images.galleryHeaderImage);
    setBackground("[data-image-bg='contactHeaderImage']", images.contactHeaderImage);
    setImage("[data-image='aboutImage1']", images.aboutImage1);
    setImage("[data-image='aboutImage2']", images.aboutImage2);
    setImage("[data-image='reservationImage']", images.reservationImage);
    applyMap(settings.googleMapsEmbed);
    document.title = document.title.replace(/Spice Haven/g, name);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var nav = document.getElementById("myTopnav");
    var hamburger = document.getElementById("navHamburger");
    var hero = document.getElementById("heroSection");

    function setHeroMargin() {
      if (nav && hero) hero.style.marginTop = nav.offsetHeight + "px";
    }
    setHeroMargin();
    window.addEventListener("resize", setHeroMargin);

    if (hamburger && nav) {
      hamburger.addEventListener("click", function () {
        nav.classList.toggle("open");
        setTimeout(setHeroMargin, 10);
      });
    }

    if (nav) {
      qsa(".nav-links a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("open");
          setTimeout(setHeroMargin, 10);
        });
      });
    }

    window.addEventListener("scroll", function () {
      if (nav) nav.style.boxShadow = window.scrollY > 10 ? "0 2px 14px rgba(0,0,0,0.14)" : "0 1px 4px rgba(0,0,0,0.08)";
    });

    var page = window.location.pathname.split("/").pop() || "index.html";
    if (nav) {
      qsa(".nav-links a", nav).forEach(function (a) {
        var href = a.getAttribute("href");
        if (href && href !== "#" && page === href) a.classList.add("active");
      });
    }

    if (window.dbApi) {
      window.dbApi.dbGetSettings().then(applySettings).catch(function () {});
    } else {
      fetch("/api/settings").then(function (res) { return res.json(); }).then(applySettings).catch(function () {});
    }
  });
})();
