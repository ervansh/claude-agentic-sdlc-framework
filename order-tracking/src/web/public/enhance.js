// Progressive enhancement only: move focus to the error summary on re-render.
(function () {
  var summary = document.querySelector("[data-error-summary]");
  if (summary) {
    summary.focus();
  }
})();
