function load(){
  reset();

  chrome.storage.sync.get(["ratingMin", "ratingMax", "dateMin", "dateMax", "useRatingMin", "useRatingMax", "useDateMin", "useDateMax", "cumulativeMode", "stackedMode", "mergedAccountsGroups", "showRatingsSection", "showTagsSection", "showUnsolvedSection", "showToSolveSection", "toSolveMaxIndex", "toSolveMaxRating", "toSolveContestsCount", "toSolveSinceDate", "toSolveIncludeLive", "toSolveIncludeVirtual"], data => {
    if (data.ratingMin != "undefined" && data.useRatingMin){
      $("#ratingMinSpan").text(data.ratingMin);
      $("#ratingMin").val(data.ratingMin);
    }
    if (data.ratingMax != "undefined" && data.useRatingMax){
      $("#ratingMaxSpan").text(data.ratingMax);
      $("#ratingMax").val(data.ratingMax);
    }
    if (data.dateMin != "undefined" && data.useDateMin){
      $("#dateMinSpan").text(timeToDate(data.dateMin));
      $("#dateMin").val(timeToDate(data.dateMin));
    }
    if (data.dateMax != "undefined" && data.useDateMax){
      $("#dateMaxSpan").text(timeToDate(data.dateMax));
      $("#dateMax").val(timeToDate(data.dateMax));
    }
    if (data.cumulativeMode !== undefined) {
      $("#cumulativeMode").prop("checked", data.cumulativeMode);
    }
    if (data.stackedMode !== undefined) {
      $("#stackedMode").prop("checked", data.stackedMode);
    } else {
      $("#stackedMode").prop("checked", true);
    }

    $("#showRatingsSection").prop("checked", data.showRatingsSection !== undefined ? data.showRatingsSection : true);
    $("#showTagsSection").prop("checked", data.showTagsSection !== undefined ? data.showTagsSection : false);
    $("#showUnsolvedSection").prop("checked", data.showUnsolvedSection !== undefined ? data.showUnsolvedSection : false);
    $("#showToSolveSection").prop("checked", data.showToSolveSection !== undefined ? data.showToSolveSection : true);

    $("#toSolveMaxIndex").val(data.toSolveMaxIndex || "E");
    $("#toSolveMaxRating").val(data.toSolveMaxRating !== undefined ? data.toSolveMaxRating : "");
    if (data.toSolveContestsCount !== undefined && data.toSolveContestsCount !== "") {
      $("#toSolveContestsCount").val(data.toSolveContestsCount);
    } else if (!data.toSolveSinceDate) {
      $("#toSolveContestsCount").val(5);
    } else {
      $("#toSolveContestsCount").val("");
    }
    $("#toSolveSinceDate").val(data.toSolveSinceDate || "");
    $("#toSolveIncludeLive").prop("checked", data.toSolveIncludeLive !== undefined ? data.toSolveIncludeLive : true);
    $("#toSolveIncludeVirtual").prop("checked", data.toSolveIncludeVirtual !== undefined ? data.toSolveIncludeVirtual : true);

    let groups = (data.mergedAccountsGroups && Array.isArray(data.mergedAccountsGroups)) ? data.mergedAccountsGroups : [];
    const lines = groups.map(grp => (Array.isArray(grp) ? grp.join(", ") : ""));
    $("#mergedAccountsText").val(lines.join("\n"));

    applyRatingColors();
  });

}

function update(){
  const newRatingMin = $("#ratingMin").val();
  const newRatingMax = $("#ratingMax").val();
  const newDateMin = $("#dateMin").val();
  const newDateMax = $("#dateMax").val();
  const cumulativeMode = $("#cumulativeMode").is(":checked");
  const stackedMode = $("#stackedMode").is(":checked");
  const showRatingsSection = $("#showRatingsSection").is(":checked");
  const showTagsSection = $("#showTagsSection").is(":checked");
  const showUnsolvedSection = $("#showUnsolvedSection").is(":checked");
  const showToSolveSection = $("#showToSolveSection").is(":checked");
  const toSolveMaxIndex = $("#toSolveMaxIndex").val() || "E";
  const toSolveMaxRating = $("#toSolveMaxRating").val();
  const rawContestsCount = $("#toSolveContestsCount").val().trim();
  const toSolveSinceDate = $("#toSolveSinceDate").val().trim();
  let toSolveContestsCount = rawContestsCount !== "" ? parseInt(rawContestsCount, 10) : "";
  if (toSolveContestsCount === "" && !toSolveSinceDate) {
    toSolveContestsCount = 5;
  }
  const toSolveIncludeLive = $("#toSolveIncludeLive").is(":checked");
  const toSolveIncludeVirtual = $("#toSolveIncludeVirtual").is(":checked");

  const rawMergedText = $("#mergedAccountsText").val() || "";
  const lines = rawMergedText.split("\n");
  const parsedGroups = [];
  for (const line of lines) {
    const handles = line.split(",")
      .map(h => h.trim())
      .filter(h => h.length > 0);
    const uniqueHandles = [];
    const seen = new Set();
    for (const h of handles) {
      const lower = h.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueHandles.push(h);
      }
    }
    if (uniqueHandles.length > 1) {
      parsedGroups.push(uniqueHandles);
    }
  }

  chrome.storage.sync.set({
    ratingMin: newRatingMin,
    ratingMax: newRatingMax,
    dateMin: dateToTime(newDateMin),
    dateMax: dateToTime(newDateMax),
    useRatingMin: (newRatingMin != ""),
    useRatingMax: (newRatingMax != ""),
    useDateMin: (newDateMin != ""),
    useDateMax: (newDateMax != ""),
    cumulativeMode: cumulativeMode,
    stackedMode: stackedMode,
    mergedAccountsGroups: parsedGroups,
    showRatingsSection: showRatingsSection,
    showTagsSection: showTagsSection,
    showUnsolvedSection: showUnsolvedSection,
    showToSolveSection: showToSolveSection,
    toSolveMaxIndex: toSolveMaxIndex,
    toSolveMaxRating: toSolveMaxRating,
    toSolveContestsCount: toSolveContestsCount,
    toSolveSinceDate: toSolveSinceDate,
    toSolveIncludeLive: toSolveIncludeLive,
    toSolveIncludeVirtual: toSolveIncludeVirtual
  });

  load();
}

function reset(update = false){ // update the saved data as well or just the ui
  if (update){
    chrome.storage.sync.set({ 
      ratingMin: -1,
      ratingMax: -1,
      dateMin: -1,
      dateMax: -1,
      useRatingMin: false,
      useRatingMax: false,
      useDateMin: false,
      useDateMax: false,
      cumulativeMode: false,
      stackedMode: true,
      showRatingsSection: true,
      showTagsSection: false,
      showUnsolvedSection: false,
      showToSolveSection: true,
      toSolveMaxIndex: "E",
      toSolveMaxRating: "",
      toSolveContestsCount: 5,
      toSolveSinceDate: "",
      toSolveIncludeLive: true,
      toSolveIncludeVirtual: true
    });
  }

  $("#ratingMinSpan").text("min");
  $("#ratingMaxSpan").text("max");
  $("#dateMinSpan").text("oldest");
  $("#dateMaxSpan").text("newest");
  $("input[type=number], input[type=date]").val("");
  $("#cumulativeMode").prop("checked", false);
  $("#stackedMode").prop("checked", true);
  $("#showRatingsSection").prop("checked", true);
  $("#showTagsSection").prop("checked", false);
  $("#showUnsolvedSection").prop("checked", false);
  $("#showToSolveSection").prop("checked", true);
  $("#toSolveMaxIndex").val("E");
  $("#toSolveMaxRating").val("");
  $("#toSolveContestsCount").val(5);
  $("#toSolveSinceDate").val("");
  $("#toSolveIncludeLive").prop("checked", true);
  $("#toSolveIncludeVirtual").prop("checked", true);
}

function getRatingClass(rating) {
  const r = parseInt(rating, 10);
  if (isNaN(r) || r <= 0) return '';
  if (r >= 3000) return 'user-legendary';
  if (r >= 2400) return 'user-red';
  if (r >= 2100) return 'user-orange';
  if (r >= 1900) return 'user-violet';
  if (r >= 1600) return 'user-blue';
  if (r >= 1400) return 'user-cyan';
  if (r >= 1200) return 'user-green';
  return 'user-gray';
}

function formatRatingBadge($spanElem, rawVal, defaultText) {
  const ratingClasses = "user-gray user-green user-cyan user-blue user-violet user-orange user-red user-legendary";
  $spanElem.removeClass(ratingClasses);

  if (!rawVal || rawVal === "" || isNaN(parseInt(rawVal, 10))) {
    $spanElem.text(defaultText);
    return;
  }

  const r = parseInt(rawVal, 10);
  if (r >= 3000) {
    const str = String(r);
    $spanElem.html(`<span style="color: #000000 !important; font-weight: bold;">${str[0]}</span><span style="color: #ff0000 !important; font-weight: bold;">${str.slice(1)}</span>`);
  } else {
    $spanElem.text(r).addClass(getRatingClass(r));
  }
}

function applyRatingColors() {
  const ratingClasses = "user-gray user-green user-cyan user-blue user-violet user-orange user-red user-legendary";

  const minVal = $("#ratingMin").val();
  const maxVal = $("#ratingMax").val();
  const toSolveMaxVal = $("#toSolveMaxRating").val();

  formatRatingBadge($("#ratingMinSpan"), minVal, "min");
  formatRatingBadge($("#ratingMaxSpan"), maxVal, "max");

  $("#ratingMin").removeClass(ratingClasses).addClass(getRatingClass(minVal));
  $("#ratingMax").removeClass(ratingClasses).addClass(getRatingClass(maxVal));
  $("#toSolveMaxRating").removeClass(ratingClasses).addClass(getRatingClass(toSolveMaxVal));
}

$(document).ready(function(){
  load();

  $("#ratingMin, #ratingMax, #toSolveMaxRating").on("input change", function() {
    applyRatingColors();
  });

  $("#update").click(() => {
    update();
  });

  $("#reset").click(() => {
    reset(true);
  });

  $('body').on('click', 'a', function(){
    chrome.tabs.create({url: $(this).attr('href')});
    return false;
  });
});