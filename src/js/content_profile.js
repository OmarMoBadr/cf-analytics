var problems = new Map();
var problemNames = new Map();
var ratings = new Map();
var ratingsLive = new Map();
var ratingsVirtual = new Map();
var tags = new Map();
var ratingChartLabel = [];
var ratingChartData = [];
var ratingChartLiveData = [];
var ratingChartVirtualData = [];
var ratingChartPracticeData = [];
var ratingChartLiveColor = [];
var ratingChartVirtualColor = [];
var ratingChartPracticeColor = [];
var ratingChartBackgroundColor = [];
var tagChartLabel = [];
var tagChartData = [];
var rating_min = -1;
var rating_max = -1;
var date_min = -1;
var date_max = -1;
var cumulativeMode = true;
var stackedMode = true;
var stackedShowLive = true;
var stackedShowVirtual = true;
var stackedShowPractice = true;
var showToSolveSection = true;
var toSolveMaxIndex = "E";
var toSolveMaxRating = 0;
var toSolveContestsCount = 5;
var toSolveSinceDate = "";
var toSolveIncludeLive = true;
var toSolveIncludeVirtual = true;
var solvedProblemNames = new Set();
var problemRatingChartInstance = null;
var tagChartInstance = null;
var cachedSubmissions = [];
var currentlyLoadedProfiles = [];
var fetchSequence = 0;

function findMergedGroupForHandle(handle, groups) {
  if (!handle) return [];
  const target = handle.trim().toLowerCase();
  const searchGroups = (Array.isArray(groups) && groups.length > 0) ? groups : [];
  for (const grp of searchGroups) {
    if (Array.isArray(grp) && grp.some(h => (h || '').trim().toLowerCase() === target)) {
      const res = [];
      const seen = new Set();
      for (const h of grp) {
        const clean = (h || '').trim();
        const lower = clean.toLowerCase();
        if (clean && !seen.has(lower)) {
          seen.add(lower);
          res.push(clean);
        }
      }
      return res;
    }
  }
  return [handle.trim()];
}

const cachedUserInfo = new Map();

function getRatedUserClass(rating) {
  if (rating === undefined || rating === null || isNaN(rating)) return 'user-black';
  if (rating >= 2400) return 'user-red';
  if (rating >= 2100) return 'user-orange';
  if (rating >= 1900) return 'user-violet';
  if (rating >= 1600) return 'user-blue';
  if (rating >= 1400) return 'user-cyan';
  if (rating >= 1200) return 'user-green';
  return 'user-gray';
}

function renderRatedUserLink(handle, rating, rank) {
  const safeHandle = (handle || '').trim();
  const colorClass = getRatedUserClass(rating);
  let title = safeHandle;
  if (rank) {
    const formattedRank = rank.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    title = `${formattedRank} ${safeHandle}`;
  } else if (rating === undefined || rating === null || isNaN(rating)) {
    title = `Unrated, ${safeHandle}`;
  }

  let innerHtml = safeHandle;
  if (rating && rating >= 3000) {
    innerHtml = `<span class="legendary-user-first-letter" style="color: #000000 !important;">${safeHandle[0]}</span>${safeHandle.slice(1)}`;
  }

  return `<a href="/profile/${encodeURIComponent(safeHandle)}" title="${title}" class="rated-user ${colorClass}" data-cf-username="${safeHandle}">${innerHtml}</a>`;
}

async function fetchAndCacheUserInfo(handles) {
  if (!handles || handles.length === 0) return;
  const missing = handles.filter(h => !cachedUserInfo.has(h.toLowerCase()));
  if (missing.length === 0) return;

  try {
    const resp = await $.get(`https://codeforces.com/api/user.info?handles=${missing.map(encodeURIComponent).join(';')}&lang=en`);
    if (resp.status === "OK" && Array.isArray(resp.result)) {
      resp.result.forEach(u => {
        if (u && u.handle) {
          cachedUserInfo.set(u.handle.toLowerCase(), u);
        }
      });
    }
  } catch (e) {
    // Silent catch to prevent Chrome extension error traces
  }
}

function applySectionVisibility(data) {
  const showRatings = (data && data.showRatingsSection !== undefined) ? data.showRatingsSection : true;
  const showTags = (data && data.showTagsSection !== undefined) ? data.showTagsSection : false;
  const showUnsolved = (data && data.showUnsolvedSection !== undefined) ? data.showUnsolvedSection : false;
  const showToSolve = (data && data.showToSolveSection !== undefined) ? data.showToSolveSection : true;

  const wasRatingsHidden = $('#cfaRatingsSection').is(':hidden');
  const wasTagsHidden = $('#cfaTagsSection').is(':hidden');

  $('#cfaRatingsSection').toggle(showRatings);
  $('#cfaTagsSection').toggle(showTags);
  $('#cfaUnsolvedSection').toggle(showUnsolved);
  $('#cfaToSolveSection').toggle(showToSolve);

  if (showRatings && wasRatingsHidden && problemRatingChartInstance) {
    problemRatingChartInstance.resize();
  }
  if (showTags && wasTagsHidden && tagChartInstance) {
    tagChartInstance.resize();
  }
}

function updateMergedAccountsDisplay(currentHandle, group) {
  const userInfo = getUserHandleInfo();
  const validGroup = (Array.isArray(group) && group.length > 0) ? group : [currentHandle];
  const otherHandles = validGroup.filter(h => h.toLowerCase() !== currentHandle.toLowerCase());

  if (otherHandles.length > 0) {
    const renderLinks = () => {
      return otherHandles.map(h => {
        const u = cachedUserInfo.get(h.toLowerCase());
        return renderRatedUserLink(u ? u.handle : h, u ? u.rating : null, u ? u.rank : null);
      }).join(', ');
    };

    $("#problemRatingUser").html(
      `<a href="/profile/${encodeURIComponent(userInfo.handle)}" title="${userInfo.title || ''}" class="${userInfo.className}" data-cf-username="${userInfo.handle}">${userInfo.html}</a> <span style="font-size: 0.85em; color: #555; font-weight: normal;">(merged with ${renderLinks()})</span>`
    );

    const missing = otherHandles.filter(h => !cachedUserInfo.has(h.toLowerCase()));
    if (missing.length > 0) {
      fetchAndCacheUserInfo(missing).then(() => {
        $("#problemRatingUser").html(
          `<a href="/profile/${encodeURIComponent(userInfo.handle)}" title="${userInfo.title || ''}" class="${userInfo.className}" data-cf-username="${userInfo.handle}">${userInfo.html}</a> <span style="font-size: 0.85em; color: #555; font-weight: normal;">(merged with ${renderLinks()})</span>`
        );
      });
    }
  } else {
    $("#problemRatingUser").html(
      `<a href="/profile/${encodeURIComponent(userInfo.handle)}" title="${userInfo.title || ''}" class="${userInfo.className}" data-cf-username="${userInfo.handle}">${userInfo.html}</a>`
    );
  }
}

function showLoadingBar(text = "Loading submissions...") {
  $('#cfaLoadingContainer').stop(true, true).show();
  $('#cfaLoadingBar').css('width', '15%');
  $('#cfaLoadingPercent').text('');
  $('#cfaLoadingText').text(text);
}

function updateLoadingBar(current, total, handle = "") {
  $('#cfaLoadingContainer').stop(true, true).show();
  const pct = Math.min(100, Math.round((current / total) * 100));
  $('#cfaLoadingBar').css('width', pct + '%');
  $('#cfaLoadingPercent').text(pct + '%');
  const msg = handle ? `Loading submissions for ${handle} (${current}/${total})...` : `Loading submissions (${current}/${total})...`;
  $('#cfaLoadingText').text(msg);
}

function hideLoadingBar() {
  $('#cfaLoadingBar').css('width', '100%');
  $('#cfaLoadingPercent').text('100%');
  $('#cfaLoadingText').text('Done!');
  setTimeout(() => {
    $('#cfaLoadingContainer').fadeOut(300, function () {
      $('#cfaLoadingBar').css('width', '0%');
      $('#cfaLoadingPercent').text('');
    });
  }, 400);
}

async function loadAndProcessSubmissions(profilesToFetch) {
  if (!profilesToFetch || profilesToFetch.length === 0) return;

  const sortedNew = [...profilesToFetch].map(p => p.toLowerCase()).sort();
  const sortedCurrent = [...currentlyLoadedProfiles].map(p => p.toLowerCase()).sort();
  if (sortedNew.join(',') === sortedCurrent.join(',') && cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
    return;
  }

  userRequestedQueueForPage = false;

  const currentSeq = ++fetchSequence;
  currentlyLoadedProfiles = [...profilesToFetch];
  const total = profilesToFetch.length;

  showLoadingBar(total > 1 ? `Loading submissions (0/${total})...` : "Loading submissions...");

  let allResults = [];
  for (let i = 0; i < total; i++) {
    const id = profilesToFetch[i];
    updateLoadingBar(i + 1, total, id);
    try {
      const response = await $.get(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(id)}&lang=en`);
      if (currentSeq !== fetchSequence) {
        hideLoadingBar();
        return;
      }
      if (response.status === "OK") {
        allResults = allResults.concat(response.result);
      } else {
        console.log(response.status + ' : ' + response.comment);
      }
    } catch (error) {
      console.log("Error fetching profile:", profilesToFetch[i], error);
    }

    if (i < total - 1) {
      await delay(1000);
      if (currentSeq !== fetchSequence) {
        hideLoadingBar();
        return;
      }
    }
  }

  if (currentSeq !== fetchSequence) {
    hideLoadingBar();
    return;
  }

  $('#cfaLoadingText').text("Processing data...");
  $('#cfaLoadingPercent').text("100%");
  $('#cfaLoadingBar').css('width', '100%');

  cachedSubmissions = allResults;
  processData(cachedSubmissions);
  createProblemRatingChart();
  createTagChart();
  renderToSolveQueue();

  hideLoadingBar();
}

function isIndexAllowed(probIndex, maxIndex) {
  if (!maxIndex || maxIndex === 'ALL') return true;
  if (!probIndex) return false;

  const pMatch = String(probIndex).trim().toUpperCase().match(/^[A-Z]/);
  const mMatch = String(maxIndex).trim().toUpperCase().match(/^[A-Z]/);

  if (!pMatch || !mMatch) return true;

  // Compare first letter: 'E' <= 'E', so E, E1, E2 are all allowed when maxIndex is E
  return pMatch[0] <= mMatch[0];
}

async function fetchContestStandings(contestId, contestTime = 0, force = false) {
  const cacheKey = `cfa_contest_cache_${contestId}`;
  let cachedObj = null;
  let needsRefetch = Boolean(force);

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      cachedObj = JSON.parse(raw);
    }
  } catch (e) {
    // localStorage read fallback
  }

  if (cachedObj && !needsRefetch) {
    // If previously failed due to authentication/privacy, skip re-fetching unless force=true
    if (cachedObj.failed) {
      return null;
    }

    if (cachedObj.problems) {
      const hasAnyRatings = cachedObj.problems.some(p => typeof p.rating === "number" && p.rating > 0);
      const cachedAt = cachedObj.cachedAt || 0;
      const now = Date.now();

      // If ratings are missing in cached problems:
      if (!hasAnyRatings) {
        const contestAgeDays = contestTime ? (now - contestTime * 1000) / (1000 * 60 * 60 * 24) : 0;
        // If contest is newer than 14 days and cached more than 15 minutes ago, re-fetch from CF
        if (contestAgeDays <= 14 && (now - cachedAt > 15 * 60 * 1000)) {
          needsRefetch = true;
        }
      }

      if (!needsRefetch) {
        return cachedObj;
      }
    }
  }

  // Delay before API call to be gentle with rate limits
  await delay(350);

  try {
    const resp = await $.ajax({
      url: `https://codeforces.com/api/contest.standings?contestId=${contestId}`,
      type: 'GET',
      headers: {
        'Accept-Language': 'en'
      }
    });
    if (resp && resp.status === "OK" && resp.result) {
      const hasAnyRatings = resp.result.problems.some(p => typeof p.rating === "number" && p.rating > 0);
      const data = {
        contest: resp.result.contest,
        problems: resp.result.problems,
        cachedAt: Date.now(),
        hasRatings: hasAnyRatings
      };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        // localStorage write fallback
      }
      return data;
    }
  } catch (err) {
    const errMsg = (err && err.responseJSON && err.responseJSON.comment) || (err && err.responseText) || (err && err.message) || err;

    // Cache unrecoverable failures (e.g. requires authentication or contest not found) to prevent spamming
    if (typeof errMsg === 'string' && (errMsg.includes('authenticated') || errMsg.includes('not found') || errMsg.includes('Access denied'))) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          failed: true,
          reason: errMsg,
          cachedAt: Date.now()
        }));
      } catch (e) {
        // ignore
      }
    }
  }

  // Fallback to cached data if network failed
  if (cachedObj && cachedObj.problems) {
    return cachedObj;
  }

  return null;
}

let toSolveQueueSequence = 0;
let currentQueueProblems = [];
let currentSortColumn = 'none';
let currentSortDir = 'none';
let currentQueueFilter = 'all';
let currentTypeFilter = 'all';
let userRequestedQueueForPage = false;

function getLoggedInUserFromHeader() {
  try {
    const $logout = $('#header a[href*="/logout"]').first();
    if ($logout.length) {
      const $profileLink = $logout.parent().find('a[href*="/profile/"]').first();
      if ($profileLink.length) {
        const linkText = $profileLink.text().trim();
        if (linkText) return linkText;
        const href = $profileLink.attr('href') || '';
        const match = href.match(/\/profile\/([a-zA-Z0-9_.-]+)/i);
        if (match) return match[1].trim();
      }
    }
    const $headerLink = $('#header .lang-chooser a[href*="/profile/"]').first();
    if ($headerLink.length) {
      const linkText = $headerLink.text().trim();
      if (linkText) return linkText;
      const href = $headerLink.attr('href') || '';
      const match = href.match(/\/profile\/([a-zA-Z0-9_.-]+)/i);
      if (match) return match[1].trim();
    }
  } catch (e) {
    // Silent catch
  }
  return null;
}

async function renderToSolveQueue(force = false, userRequested = false) {
  if (userRequested) {
    userRequestedQueueForPage = true;
  }

  const currentSeq = ++toSolveQueueSequence;

  if (!showToSolveSection) {
    $('#cfaToSolveSection').hide();
    return;
  }
  $('#cfaToSolveSection').show();

  const profileHandle = getProfileHandleFromUrl(window.location.href);
  const loggedInHandle = getLoggedInUserFromHeader();

  const isCurrentGroupMember = (Array.isArray(currentlyLoadedProfiles) && currentlyLoadedProfiles.length > 0)
    ? currentlyLoadedProfiles.some(p => loggedInHandle && p.toLowerCase() === loggedInHandle.toLowerCase())
    : false;

  const isCurrentUser = Boolean(
    loggedInHandle && (
      (profileHandle && profileHandle.toLowerCase() === loggedInHandle.toLowerCase()) ||
      isCurrentGroupMember
    )
  );

  if (!isCurrentUser && !userRequestedQueueForPage) {
    const displayHandle = profileHandle || "this user";
    $('#cfaToSolveSubtitle').html(`Scan recent contests for <b>${escapeHtml(displayHandle)}</b>.`);
    $('#cfaToSolveStatus').hide();
    $('#cfaToSolveCountBadge').text('');
    $('#cfaToSolveList').html(`
      <div style="padding: 18px 16px; text-align: center; border: 1px solid #b9b9b9; background: #fff; margin-top: 8px; border-radius: 4px;">
        <p style="margin: 0 0 10px 0; color: #444; font-size: 12px;">
          You are viewing <b>${escapeHtml(displayHandle)}</b>'s profile.
        </p>
        <input type="button" id="cfaLoadOtherUserQueueBtn" value="Load Upsolve Queue for ${escapeHtml(displayHandle)}" style="padding: 0.5em 1em; font-weight: normal;" />
      </div>
    `);
    return;
  }

  const maxIndex = toSolveMaxIndex || "E";
  const maxRating = (toSolveMaxRating && toSolveMaxRating > 0) ? toSolveMaxRating : null;
  const incLive = toSolveIncludeLive !== false;
  const incVirtual = toSolveIncludeVirtual !== false;

  const countVal = (typeof toSolveContestsCount === "number" && toSolveContestsCount > 0)
    ? toSolveContestsCount
    : (parseInt(toSolveContestsCount, 10) > 0 ? parseInt(toSolveContestsCount, 10) : null);

  const sinceDateStr = (toSolveSinceDate || "").trim();
  const sinceTimestamp = sinceDateStr ? dateToTime(sinceDateStr) : null;
  const hasSinceDate = sinceTimestamp !== null && !isNaN(sinceTimestamp) && sinceTimestamp > 0;

  // If neither count nor date is specified, default to 5 contests
  const count = countVal || (!hasSinceDate ? 5 : null);
  const targetLimit = count !== null ? count : 50;

  const criteriaParts = [];
  if (maxIndex && maxIndex !== "ALL") criteriaParts.push(`Index &le; ${maxIndex}`);
  if (maxRating) criteriaParts.push(`Rating &le; ${formatRatingValue(maxRating)}`);

  const filtersDesc = [];
  if (criteriaParts.length > 0) {
    filtersDesc.push(criteriaParts.join(' and '));
  }
  const sourcesDesc = [];
  if (incLive) sourcesDesc.push("Live");
  if (incVirtual) sourcesDesc.push("Virtuals");

  let contestsScope = "";
  if (count !== null && hasSinceDate) {
    contestsScope = `latest ${count}, since ${sinceDateStr}`;
  } else if (count !== null) {
    contestsScope = `latest ${count}`;
  } else if (hasSinceDate) {
    contestsScope = `since ${sinceDateStr}`;
  } else {
    contestsScope = `latest 5`;
  }

  filtersDesc.push(`Contests: ${sourcesDesc.join(' & ') || 'None'} (${contestsScope})`);

  $('#cfaToSolveSubtitle').html(filtersDesc.join(' &bull; '));
  $('#cfaToSolveStatus').show().text(force ? "Checking for updated ratings and contest data..." : "Scanning recent contests...");
  $('#cfaToSolveList').empty();
  $('#cfaToSolveCountBadge').text('');

  if (!cachedSubmissions || cachedSubmissions.length === 0) {
    $('#cfaToSolveStatus').text("No submissions available.");
    return;
  }

  const contestMap = new Map();
  for (let i = 0; i < cachedSubmissions.length; i++) {
    const sub = cachedSubmissions[i];
    if (!sub.problem || !sub.problem.contestId) continue;
    const cid = sub.problem.contestId;
    const pType = sub.author ? sub.author.participantType : null;
    const isLive = (pType === "CONTESTANT" || pType === "OUT_OF_COMPETITION");
    const isVirt = (pType === "VIRTUAL");

    if ((isLive && incLive) || (isVirt && incVirtual)) {
      const time = (sub.author && sub.author.startTimeSeconds) ? sub.author.startTimeSeconds : sub.creationTimeSeconds;
      if (hasSinceDate && time < sinceTimestamp) {
        continue;
      }
      if (!contestMap.has(cid)) {
        contestMap.set(cid, {
          contestId: cid,
          type: isLive ? "LIVE" : "VIRTUAL",
          latestTime: time
        });
      } else {
        const entry = contestMap.get(cid);
        if (time > entry.latestTime) {
          entry.latestTime = time;
        }
        if (isLive) entry.type = "LIVE";
      }
    }
  }

  const sortedContests = Array.from(contestMap.values())
    .sort((a, b) => b.latestTime - a.latestTime);

  if (sortedContests.length === 0) {
    const msg = hasSinceDate
      ? `No matching recent live or virtual contests found since ${sinceDateStr}.`
      : 'No matching recent live or virtual contests found in submissions history.';
    $('#cfaToSolveStatus').html(`<span style="color: #666; font-style: normal;">${msg}</span>`);
    return;
  }

  const totalToFetch = Math.min(sortedContests.length, targetLimit);
  $('#cfaToSolveStatus').text(`Fetching contest data (0/${totalToFetch})...`);

  const contestResults = [];
  for (let i = 0; i < sortedContests.length; i++) {
    if (currentSeq !== toSolveQueueSequence) return;
    if (contestResults.length >= targetLimit) break;

    const item = sortedContests[i];
    $('#cfaToSolveStatus').text(`Fetching contest data (${contestResults.length + 1}/${totalToFetch})...`);

    const contestData = await fetchContestStandings(item.contestId, item.latestTime, force);
    if (contestData && contestData.problems && contestData.problems.length > 0) {
      const hasRatings = contestData.problems.some(p => typeof p.rating === "number" && p.rating > 0);
      contestResults.push({
        contest: contestData.contest || { id: item.contestId, name: `Contest ${item.contestId}` },
        problems: contestData.problems,
        type: item.type,
        time: item.latestTime,
        hasRatings: hasRatings
      });
    }
  }

  if (currentSeq !== toSolveQueueSequence) return;

  if (contestResults.length === 0) {
    $('#cfaToSolveStatus').html('<span style="color: #666; font-style: normal;">No accessible contests found (some contests may be private or require authentication).</span>');
    return;
  }

  const allQueueProblems = [];
  const seenProblemKeys = new Set();

  for (const cr of contestResults) {
    const cid = cr.contest.id;

    // Filter problems in this contest matching criteria (joined by AND)
    const candidateProblems = cr.problems.filter(p => {
      const indexAllowed = isIndexAllowed(p.index, maxIndex);
      if (!indexAllowed) return false;

      if (maxRating) {
        if (typeof p.rating !== "number" || p.rating <= 0 || p.rating > maxRating) {
          return false;
        }
      }

      return true;
    });

    // Sort problems accurately (A, B, C, D, E1, E2...)
    candidateProblems.sort((a, b) => {
      return String(a.index).localeCompare(String(b.index), undefined, { numeric: true, sensitivity: 'base' });
    });

    for (const p of candidateProblems) {
      const pKey = `${cid}-${p.index}`;
      const pNameLower = (p.name || '').trim().toLowerCase();
      if (seenProblemKeys.has(pKey) || (pNameLower && seenProblemKeys.has(pNameLower))) {
        continue;
      }

      let solvedDuringContest = false;
      let solvedAfterContest = false;
      let failedAttempts = 0;
      let totalAttempts = 0;

      for (let s = 0; s < cachedSubmissions.length; s++) {
        const sub = cachedSubmissions[s];
        if (!sub.problem) continue;
        const matchesId = (sub.problem.contestId === cid && String(sub.problem.index).toUpperCase() === String(p.index).toUpperCase());
        const matchesName = (sub.problem.name && p.name && sub.problem.name.trim().toLowerCase() === pNameLower);

        if (matchesId || matchesName) {
          totalAttempts++;
          if (sub.verdict === "OK") {
            const pType = sub.author ? sub.author.participantType : null;
            const isContestParticipant = (pType === "CONTESTANT" || pType === "OUT_OF_COMPETITION" || pType === "VIRTUAL");
            if (isContestParticipant) {
              solvedDuringContest = true;
            } else {
              solvedAfterContest = true;
            }
          } else {
            failedAttempts++;
          }
        }
      }

      // If solved during contest -> DO NOT SHOW
      if (solvedDuringContest) {
        continue;
      }

      const isUpsolved = solvedAfterContest || (pNameLower && solvedProblemNames.has(pNameLower));

      seenProblemKeys.add(pKey);
      if (pNameLower) seenProblemKeys.add(pNameLower);

      allQueueProblems.push({
        contestId: cid,
        contestName: cr.contest.name || `Contest ${cid}`,
        contestType: cr.type,
        contestTime: cr.time,
        problem: p,
        isUpsolved: isUpsolved,
        failedAttempts: failedAttempts,
        totalAttempts: totalAttempts
      });
    }
  }

  $('#cfaToSolveStatus').hide();

  const totalCount = allQueueProblems.length;
  const upsolvedCount = allQueueProblems.filter(x => x.isUpsolved).length;
  const unsolvedCount = totalCount - upsolvedCount;
  const liveCount = allQueueProblems.filter(x => x.contestType === 'LIVE').length;
  const virtualCount = totalCount - liveCount;
  const contestsLoadedCount = contestResults.length;

  const problemText = `${totalCount} problem${totalCount === 1 ? '' : 's'}`;
  const contestText = `${contestsLoadedCount} contest${contestsLoadedCount === 1 ? '' : 's'} loaded`;
  $('#cfaToSolveCountBadge').text(totalCount > 0 ? `${problemText} (${contestText})` : `(${contestText})`);

  if (totalCount === 0) {
    $('#cfaToSolveList').html(`
      <div style="padding: 14px 16px; text-align: center; color: #008000; font-size: 13px; font-weight: bold; border: 1px solid #b9b9b9; background: #fff; margin-top: 8px;">
        &#10003; All target problems in the selected contests were solved during the contest!
      </div>
    `);
    return;
  }

  allQueueProblems.forEach((item, idx) => {
    item.originalIndex = idx;
  });
  currentQueueProblems = allQueueProblems;
  currentSortColumn = 'none';
  currentSortDir = 'none';
  currentQueueFilter = 'all';
  currentTypeFilter = 'all';

  const rowsHtml = renderQueueRowsHtml(currentQueueProblems);

  const tableHtml = `
    <div style="width: 100%; box-sizing: border-box; overflow-x: auto; margin-top: 10px; border: 1px solid #b9b9b9; border-radius: 4px; background-color: #fff;">
      <div style="margin: 6px 10px 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-family: verdana, arial, sans-serif; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="color: #555;">Filter: </span>
          <a href="javascript:void(0)" class="cfa-queue-filter-tab active" data-filter="all" style="font-weight: bold; color: #000; text-decoration: underline;">All (${totalCount})</a>
          <span style="color: #999;"> &bull; </span>
          <a href="javascript:void(0)" class="cfa-queue-filter-tab" data-filter="unsolved" style="color: #1a0dab; text-decoration: none;">Unsolved (${unsolvedCount})</a>
          <span style="color: #999;"> &bull; </span>
          <a href="javascript:void(0)" class="cfa-queue-filter-tab" data-filter="upsolved" style="color: #1a0dab; text-decoration: none;">Upsolved (${upsolvedCount})</a>
        </div>
        ${(liveCount > 0 && virtualCount > 0) ? `
        <div>
          <span style="color: #555;">Type: </span>
          <a href="javascript:void(0)" class="cfa-queue-type-tab active" data-type="all" style="font-weight: bold; color: #000; text-decoration: underline;">All</a>
          <span style="color: #999;"> &bull; </span>
          <a href="javascript:void(0)" class="cfa-queue-type-tab" data-type="live" style="color: #1a0dab; text-decoration: none;">Live (${liveCount})</a>
          <span style="color: #999;"> &bull; </span>
          <a href="javascript:void(0)" class="cfa-queue-type-tab" data-type="virtual" style="color: #1a0dab; text-decoration: none;">Virtual (${virtualCount})</a>
        </div>
        ` : ''}
      </div>
      <table class="problems" style="width: 100%; border-collapse: collapse; font-family: verdana, arial, sans-serif; font-size: 12px; margin: 0 !important; box-sizing: border-box;">
        <thead>
          <tr class="first-row" style="background-color: #f8f8f8; border-top: 1px solid #b9b9b9; border-bottom: 1px solid #b9b9b9;">
            <th class="id" style="text-align: center; width: 5.5em; padding: 6px 10px; font-weight: bold; color: #333; white-space: nowrap;">#</th>
            <th style="padding: 6px 10px; font-weight: bold; color: #333;">Name</th>
            <th id="cfaSortContestHeader" style="padding: 6px 10px; font-weight: bold; color: #333; cursor: pointer; user-select: none;" title="Click to sort by date of participation (oldest first)">Contest <span id="cfaContestSortIcon" style="font-size: 10px; margin-left: 2px; color: #888;">&#x25B4;&#x25BE;</span></th>
            <th id="cfaSortRatingHeader" style="text-align: left; width: 6.5em; padding: 6px 10px; font-weight: bold; color: #333; white-space: nowrap; cursor: pointer; user-select: none;" title="Click to sort by rating (easiest first)">Rating <span id="cfaRatingSortIcon" style="font-size: 10px; margin-left: 2px; color: #888;">&#x25B4;&#x25BE;</span></th>
            <th style="text-align: center; width: 5.5em; padding: 6px 10px; font-weight: bold; color: #333; white-space: nowrap;">Status</th>
          </tr>
        </thead>
        <tbody id="cfaToSolveTableBody">
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  $('#cfaToSolveList').html(tableHtml);
}

function renderQueueRowsHtml(items) {
  return items.map((item, idx) => {
    const p = item.problem;
    const cid = item.contestId;
    const isGym = cid > 9999;
    const contestUrl = isGym ? `https://codeforces.com/gym/${cid}` : `https://codeforces.com/contest/${cid}`;
    const problemUrl = findProblemURL(cid, p.index);
    const formattedDate = timeToDate(item.contestTime);

    let bgStyle = "";
    if (item.isUpsolved) {
      bgStyle = "background-color: #eaf7ea;";
    } else if (idx % 2 === 1) {
      bgStyle = "background-color: #f8f8f8;";
    } else {
      bgStyle = "background-color: #ffffff;";
    }

    const ratingHtml = (typeof p.rating === "number" && p.rating > 0)
      ? `<span class="${ratingSpanColor(p.rating)}" style="font-weight: bold;" title="Difficulty">${formatRatingValue(p.rating)}</span>`
      : `<span style="color: #888888; font-style: italic; font-size: 11px;" title="Ratings not published yet">Pending</span>`;

    const statusHtml = item.isUpsolved
      ? `<span style="color: #008000; font-size: 13px; font-weight: bold;" title="Upsolved">&#10004;</span>`
      : `<span style="color: #888888; font-size: 13px; font-weight: bold;" title="${item.failedAttempts > 0 ? `Unsolved (${item.failedAttempts} attempt${item.failedAttempts === 1 ? '' : 's'})` : 'Unsolved'}">-</span>`;

    const isLive = item.contestType === 'LIVE';
    const typeLabel = isLive ? 'Live' : 'Virtual';

    let borderTopStyle = "border-top: 1px solid #e1e1e1;";
    if ((currentSortColumn === 'none' || currentSortColumn === 'contest') && idx > 0 && item.contestId !== items[idx - 1].contestId) {
      borderTopStyle = "border-top: 1px solid #888888;";
    }

    return `
      <tr class="cfa-queue-row" data-contest-id="${cid}" data-status="${item.isUpsolved ? 'upsolved' : 'unsolved'}" data-type="${isLive ? 'live' : 'virtual'}" style="${bgStyle} ${borderTopStyle}">
        <td class="id" style="text-align: center; padding: 6px 10px; font-weight: bold; white-space: nowrap;">
          <a href="${problemUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a0dab; text-decoration: none;">${cid}${escapeHtml(p.index)}</a>
        </td>
        <td style="padding: 6px 10px;">
          <a href="${problemUrl}" target="_blank" rel="noopener noreferrer" style="color: #1a0dab; text-decoration: none; font-weight: 500;">${escapeHtml(p.name)}</a>
        </td>
        <td style="padding: 6px 10px;">
          <a href="${contestUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b5998; text-decoration: none;">${escapeHtml(item.contestName)}</a>
          <span style="font-size: 11px; color: #777; margin-left: 5px;">(${typeLabel}, ${formattedDate})</span>
        </td>
        <td style="text-align: left; padding: 6px 10px; white-space: nowrap;">
          ${ratingHtml}
        </td>
        <td style="text-align: center; padding: 6px 10px; white-space: nowrap;">
          ${statusHtml}
        </td>
      </tr>
    `;
  }).join('');
}

function getSortedQueueProblems() {
  const list = [...currentQueueProblems];
  if (currentSortColumn === 'rating') {
    if (currentSortDir === 'asc') {
      list.sort((a, b) => {
        const rA = (typeof a.problem.rating === 'number' && a.problem.rating > 0) ? a.problem.rating : 99999;
        const rB = (typeof b.problem.rating === 'number' && b.problem.rating > 0) ? b.problem.rating : 99999;
        if (rA !== rB) return rA - rB;
        return a.originalIndex - b.originalIndex;
      });
    } else if (currentSortDir === 'desc') {
      list.sort((a, b) => {
        const rA = (typeof a.problem.rating === 'number' && a.problem.rating > 0) ? a.problem.rating : -1;
        const rB = (typeof b.problem.rating === 'number' && b.problem.rating > 0) ? b.problem.rating : -1;
        if (rA !== rB) return rB - rA;
        return a.originalIndex - b.originalIndex;
      });
    }
  } else if (currentSortColumn === 'contest') {
    if (currentSortDir === 'asc') {
      list.sort((a, b) => {
        if (a.contestTime !== b.contestTime) return a.contestTime - b.contestTime;
        return a.originalIndex - b.originalIndex;
      });
    } else if (currentSortDir === 'desc') {
      list.sort((a, b) => {
        if (a.contestTime !== b.contestTime) return b.contestTime - a.contestTime;
        return a.originalIndex - b.originalIndex;
      });
    }
  } else {
    list.sort((a, b) => a.originalIndex - b.originalIndex);
  }
  return list;
}

function applyQueueFilterAndSortUI() {
  const sorted = getSortedQueueProblems();
  $('#cfaToSolveTableBody').html(renderQueueRowsHtml(sorted));

  $('.cfa-queue-row').each(function () {
    const rowStatus = $(this).data('status');
    const rowType = $(this).data('type');

    const statusMatch = (currentQueueFilter === 'all' || rowStatus === currentQueueFilter);
    const typeMatch = (currentTypeFilter === 'all' || rowType === currentTypeFilter);

    if (statusMatch && typeMatch) {
      $(this).show();
    } else {
      $(this).hide();
    }
  });

  // Apply contest separators when sorted by contest or no sort applied
  $('.cfa-queue-row').css('border-top', '1px solid #e1e1e1');
  if (currentSortColumn === 'none' || currentSortColumn === 'contest') {
    let lastVisibleContestId = null;
    $('.cfa-queue-row:visible').each(function () {
      const cid = String($(this).attr('data-contest-id') || '');
      if (lastVisibleContestId !== null && cid && cid !== lastVisibleContestId) {
        $(this).css('border-top', '1px solid #888888');
      }
      if (cid) {
        lastVisibleContestId = cid;
      }
    });
  }

  let ratingIcon = '&#x25B4;&#x25BE;';
  let ratingTitle = 'Click to sort by rating (easiest first)';
  if (currentSortColumn === 'rating') {
    if (currentSortDir === 'asc') {
      ratingIcon = '<span style="color: #1a0dab; font-weight: bold;">&#9650;</span>';
      ratingTitle = 'Sorted by rating ascending (easiest first). Click to sort descending (hardest first)';
    } else if (currentSortDir === 'desc') {
      ratingIcon = '<span style="color: #1a0dab; font-weight: bold;">&#9660;</span>';
      ratingTitle = 'Sorted by rating descending (hardest first). Click to restore default order';
    }
  }
  $('#cfaRatingSortIcon').html(ratingIcon);
  $('#cfaSortRatingHeader').attr('title', ratingTitle);

  let contestIcon = '&#x25B4;&#x25BE;';
  let contestTitle = 'Click to sort by date of participation (oldest first)';
  if (currentSortColumn === 'contest') {
    if (currentSortDir === 'asc') {
      contestIcon = '<span style="color: #1a0dab; font-weight: bold;">&#9650;</span>';
      contestTitle = 'Sorted by participation date ascending (oldest first). Click to sort descending (newest first)';
    } else if (currentSortDir === 'desc') {
      contestIcon = '<span style="color: #1a0dab; font-weight: bold;">&#9660;</span>';
      contestTitle = 'Sorted by participation date descending (newest first). Click to sort ascending (oldest first)';
    }
  }
  $('#cfaContestSortIcon').html(contestIcon);
  $('#cfaSortContestHeader').attr('title', contestTitle);
}

$(document).on('click', '#cfaSortRatingHeader', function (e) {
  e.preventDefault();
  if (currentSortColumn !== 'rating') {
    currentSortColumn = 'rating';
    currentSortDir = 'asc';
  } else if (currentSortDir === 'asc') {
    currentSortDir = 'desc';
  } else {
    currentSortColumn = 'none';
    currentSortDir = 'none';
  }
  applyQueueFilterAndSortUI();
});

$(document).on('click', '#cfaSortContestHeader', function (e) {
  e.preventDefault();
  if (currentSortColumn !== 'contest') {
    currentSortColumn = 'contest';
    currentSortDir = 'asc';
  } else if (currentSortDir === 'asc') {
    currentSortDir = 'desc';
  } else {
    currentSortDir = 'asc';
  }
  applyQueueFilterAndSortUI();
});

$(document).on('click', '.cfa-queue-filter-tab', function (e) {
  e.preventDefault();
  currentQueueFilter = $(this).data('filter');
  $('.cfa-queue-filter-tab').css({
    'font-weight': 'normal',
    'color': '#1a0dab',
    'text-decoration': 'none'
  });
  $(this).css({
    'font-weight': 'bold',
    'color': '#000',
    'text-decoration': 'underline'
  });
  applyQueueFilterAndSortUI();
});

$(document).on('click', '.cfa-queue-type-tab', function (e) {
  e.preventDefault();
  currentTypeFilter = $(this).data('type');
  $('.cfa-queue-type-tab').css({
    'font-weight': 'normal',
    'color': '#1a0dab',
    'text-decoration': 'none'
  });
  $(this).css({
    'font-weight': 'bold',
    'color': '#000',
    'text-decoration': 'underline'
  });
  applyQueueFilterAndSortUI();
});

$(document).on('click', '#cfaToSolveRefreshBtn', function (e) {
  e.preventDefault();
  renderToSolveQueue(true, true);
});

$(document).on('click', '#cfaLoadOtherUserQueueBtn', function (e) {
  e.preventDefault();
  renderToSolveQueue(false, true);
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function formatRatingValue(rating) {
  const num = parseInt(rating, 10);
  const str = String(rating);
  if (!isNaN(num) && num >= 3000) {
    return `<span class="legendary-user-first-letter" style="color: #000000 !important;">${str[0]}</span>${str.slice(1)}`;
  }
  return str;
}

function updateRatingSliderDisplay() {
  const minSlider = $('#cfaRatingMin');
  const maxSlider = $('#cfaRatingMax');
  if (minSlider.length === 0 || maxSlider.length === 0) return;

  const minVal = parseInt(minSlider.val() || 800, 10);
  const maxVal = parseInt(maxSlider.val() || 3500, 10);

  const percentMin = Math.max(0, Math.min(100, ((minVal - 800) / (3500 - 800)) * 100));
  const percentMax = Math.max(0, Math.min(100, ((maxVal - 800) / (3500 - 800)) * 100));

  $('#cfaSliderHighlight').css({
    'left': percentMin + '%',
    'width': (percentMax - percentMin) + '%'
  });

  const minColorClass = ratingSpanColor(minVal);
  const maxColorClass = ratingSpanColor(maxVal);

  // Position floating bubbles above the thumbs (tooltips)
  $('#cfaMinBubble')
    .css('left', `calc(${percentMin}% + ${(50 - percentMin) * 0.14}px)`)
    .attr('class', `cfa-thumb-bubble ${minColorClass}`)
    .html(formatRatingValue(minVal));

  $('#cfaMaxBubble')
    .css('left', `calc(${percentMax}% + ${(50 - percentMax) * 0.14}px)`)
    .attr('class', `cfa-thumb-bubble ${maxColorClass}`)
    .html(formatRatingValue(maxVal));

  // Stagger bubble vertical positions when thumbs are close to prevent overlap
  if (maxVal - minVal <= 200) {
    $('#cfaMinBubble').css('top', '-31px');
    $('#cfaMaxBubble').css('top', '-17px');
  } else {
    $('#cfaMinBubble').css('top', '-20px');
    $('#cfaMaxBubble').css('top', '-20px');
  }
}

let lastAppliedRatingMin = null;
let lastAppliedRatingMax = null;

function applyRatingFilterOnRelease() {
  const rawMin = parseInt($("#cfaRatingMin").val() || 800, 10);
  const rawMax = parseInt($("#cfaRatingMax").val() || 3500, 10);

  if (rawMin === lastAppliedRatingMin && rawMax === lastAppliedRatingMax) {
    return;
  }
  lastAppliedRatingMin = rawMin;
  lastAppliedRatingMax = rawMax;

  const useMin = (rawMin > 800);
  const useMax = (rawMax < 3500);

  rating_min = useMin ? rawMin : -1;
  rating_max = useMax ? rawMax : -1;

  updateFilterDisplay();

  if (cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
  }

  const newDateMin = $("#cfaDateMin").val();
  const newDateMax = $("#cfaDateMax").val();
  const useDateMin = Boolean(newDateMin);
  const useDateMax = Boolean(newDateMax);

  chrome.storage.sync.set({
    ratingMin: useMin ? rawMin : -1,
    ratingMax: useMax ? rawMax : -1,
    dateMin: useDateMin ? dateToTime(newDateMin) : -1,
    dateMax: useDateMax ? dateToTime(newDateMax) : -1,
    useRatingMin: useMin,
    useRatingMax: useMax,
    useDateMin: useDateMin,
    useDateMax: useDateMax
  });
}

function syncPageSettingsInputs(data) {
  if (!data) {
    $("#cfaRatingMin").val(800);
    $("#cfaRatingMax").val(3500);
    updateRatingSliderDisplay();
    return;
  }
  const minVal = (data.useRatingMin && data.ratingMin !== undefined && data.ratingMin !== "undefined" && data.ratingMin >= 800 && data.ratingMin !== -1) ? data.ratingMin : 800;
  const maxVal = (data.useRatingMax && data.ratingMax !== undefined && data.ratingMax !== "undefined" && data.ratingMax <= 3500 && data.ratingMax !== -1) ? data.ratingMax : 3500;

  $("#cfaRatingMin").val(minVal);
  $("#cfaRatingMax").val(maxVal);
  lastAppliedRatingMin = minVal;
  lastAppliedRatingMax = maxVal;
  updateRatingSliderDisplay();

  if (data.dateMin != "undefined" && data.useDateMin && data.dateMin != -1 && !isNaN(data.dateMin)) {
    $("#cfaDateMin").val(timeToDate(data.dateMin));
  } else {
    $("#cfaDateMin").val("");
  }

  if (data.dateMax != "undefined" && data.useDateMax && data.dateMax != -1 && !isNaN(data.dateMax)) {
    $("#cfaDateMax").val(timeToDate(data.dateMax));
  } else {
    $("#cfaDateMax").val("");
  }

  if (data.cumulativeMode !== undefined) {
    $("#cfaCumulativeMode").prop("checked", data.cumulativeMode);
  } else {
    $("#cfaCumulativeMode").prop("checked", true);
  }

  if (data.stackedMode !== undefined) {
    $("#cfaStackedMode").prop("checked", data.stackedMode);
  } else {
    $("#cfaStackedMode").prop("checked", true);
  }
}

chrome.storage.sync.get(["ratingMin", "ratingMax", "dateMin", "dateMax", "useRatingMin", "useRatingMax", "useDateMin", "useDateMax", "cumulativeMode", "stackedMode", "stackedShowLive", "stackedShowVirtual", "stackedShowPractice"], data => {
  if (data.ratingMin != "undefined" && data.useRatingMin) rating_min = data.ratingMin;
  if (data.ratingMax != "undefined" && data.useRatingMax) rating_max = data.ratingMax;
  if (data.dateMin != "undefined" && data.useDateMin) date_min = data.dateMin;
  if (data.dateMax != "undefined" && data.useDateMax) date_max = data.dateMax;
  if (typeof data.cumulativeMode === "boolean") cumulativeMode = data.cumulativeMode;
  stackedMode = (typeof data.stackedMode === "boolean") ? data.stackedMode : true;
  if (typeof data.stackedShowLive === "boolean") stackedShowLive = data.stackedShowLive;
  if (typeof data.stackedShowVirtual === "boolean") stackedShowVirtual = data.stackedShowVirtual;
  if (typeof data.stackedShowPractice === "boolean") stackedShowPractice = data.stackedShowPractice;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    chrome.storage.sync.get(["ratingMin", "ratingMax", "dateMin", "dateMax", "useRatingMin", "useRatingMax", "useDateMin", "useDateMax", "cumulativeMode", "stackedMode", "stackedShowLive", "stackedShowVirtual", "stackedShowPractice", "mergedAccountsGroups", "showRatingsSection", "showTagsSection", "showUnsolvedSection", "showToSolveSection", "toSolveMaxIndex", "toSolveMaxRating", "toSolveContestsCount", "toSolveSinceDate", "toSolveIncludeLive", "toSolveIncludeVirtual"], data => {
      rating_min = (data.ratingMin != "undefined" && data.useRatingMin) ? data.ratingMin : -1;
      rating_max = (data.ratingMax != "undefined" && data.useRatingMax) ? data.ratingMax : -1;
      date_min = (data.dateMin != "undefined" && data.useDateMin) ? data.dateMin : -1;
      date_max = (data.dateMax != "undefined" && data.useDateMax) ? data.dateMax : -1;
      cumulativeMode = (typeof data.cumulativeMode === "boolean") ? data.cumulativeMode : true;
      stackedMode = (typeof data.stackedMode === "boolean") ? data.stackedMode : true;
      if (typeof data.stackedShowLive === "boolean") stackedShowLive = data.stackedShowLive;
      if (typeof data.stackedShowVirtual === "boolean") stackedShowVirtual = data.stackedShowVirtual;
      if (typeof data.stackedShowPractice === "boolean") stackedShowPractice = data.stackedShowPractice;
      if (typeof data.showToSolveSection === "boolean") showToSolveSection = data.showToSolveSection;
      if (data.toSolveMaxIndex !== undefined) toSolveMaxIndex = data.toSolveMaxIndex;
      if (data.toSolveMaxRating !== undefined) toSolveMaxRating = parseInt(data.toSolveMaxRating, 10) || 0;
      if (data.toSolveContestsCount !== undefined) {
        const parsed = parseInt(data.toSolveContestsCount, 10);
        toSolveContestsCount = (!isNaN(parsed) && parsed > 0) ? parsed : "";
      }
      if (data.toSolveSinceDate !== undefined) toSolveSinceDate = (data.toSolveSinceDate || "").trim();
      if (typeof data.toSolveIncludeLive === "boolean") toSolveIncludeLive = data.toSolveIncludeLive;
      if (typeof data.toSolveIncludeVirtual === "boolean") toSolveIncludeVirtual = data.toSolveIncludeVirtual;

      syncPageSettingsInputs(data);
      updateFilterDisplay();
      applySectionVisibility(data);

      const profileHandle = getProfileHandleFromUrl(window.location.href);
      let groups = (data.mergedAccountsGroups && Array.isArray(data.mergedAccountsGroups)) ? data.mergedAccountsGroups : [];
      const currentGroup = findMergedGroupForHandle(profileHandle, groups);
      updateMergedAccountsDisplay(profileHandle, currentGroup);

      const sortedNew = [...currentGroup].map(p => p.toLowerCase()).sort();
      const sortedCurrent = [...currentlyLoadedProfiles].map(p => p.toLowerCase()).sort();
      if (sortedNew.join(',') !== sortedCurrent.join(',')) {
        loadAndProcessSubmissions(currentGroup);
      } else if (cachedSubmissions && cachedSubmissions.length > 0) {
        processData(cachedSubmissions);
        createProblemRatingChart();
        createTagChart();
        renderToSolveQueue();
      }
    });
  }
});

$(document).on('change', '#cfaCumulativeMode, #cfaStackedMode', function () {
  cumulativeMode = $("#cfaCumulativeMode").is(":checked");
  stackedMode = $("#cfaStackedMode").is(":checked");

  if (cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
  }

  chrome.storage.sync.set({
    cumulativeMode: cumulativeMode,
    stackedMode: stackedMode
  });
});

let isRatingSliderDragging = false;

$(document).on('input', '#cfaRatingMin', function () {
  isRatingSliderDragging = true;
  let minVal = parseInt($(this).val(), 10);
  let maxVal = parseInt($('#cfaRatingMax').val(), 10);
  if (minVal > maxVal) {
    $(this).val(maxVal);
  }
  $('#cfaRatingMin').css('z-index', 3);
  $('#cfaRatingMax').css('z-index', 2);
  updateRatingSliderDisplay();
});

$(document).on('input', '#cfaRatingMax', function () {
  isRatingSliderDragging = true;
  let minVal = parseInt($('#cfaRatingMin').val(), 10);
  let maxVal = parseInt($(this).val(), 10);
  if (maxVal < minVal) {
    $(this).val(minVal);
  }
  $('#cfaRatingMax').css('z-index', 3);
  $('#cfaRatingMin').css('z-index', 2);
  updateRatingSliderDisplay();
});

$(document).on('change', '#cfaRatingMin, #cfaRatingMax', function () {
  applyRatingFilterOnRelease();
});

$(document).on('mouseup touchend', function () {
  if (isRatingSliderDragging) {
    isRatingSliderDragging = false;
    applyRatingFilterOnRelease();
  }
});

$(document).on('change', '#cfaDateMin, #cfaDateMax', function () {
  const newDateMin = $("#cfaDateMin").val();
  const newDateMax = $("#cfaDateMax").val();
  const useDateMin = Boolean(newDateMin);
  const useDateMax = Boolean(newDateMax);

  date_min = useDateMin ? dateToTime(newDateMin) : -1;
  date_max = useDateMax ? dateToTime(newDateMax) : -1;

  updateFilterDisplay();

  if (cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
  }

  chrome.storage.sync.set({
    dateMin: date_min,
    dateMax: date_max,
    useDateMin: useDateMin,
    useDateMax: useDateMax
  });
});

$(document).on('click', '#cfaUpdateBtn', function (e) {
  if (e) e.preventDefault();
  const rawMin = parseInt($("#cfaRatingMin").val() || 800, 10);
  const rawMax = parseInt($("#cfaRatingMax").val() || 3500, 10);
  const newDateMin = $("#cfaDateMin").val();
  const newDateMax = $("#cfaDateMax").val();
  const cumulative = $("#cfaCumulativeMode").is(":checked");
  const stacked = $("#cfaStackedMode").is(":checked");

  const useMin = (rawMin > 800);
  const useMax = (rawMax < 3500);
  const useDateMin = Boolean(newDateMin);
  const useDateMax = Boolean(newDateMax);

  rating_min = useMin ? rawMin : -1;
  rating_max = useMax ? rawMax : -1;
  date_min = useDateMin ? dateToTime(newDateMin) : -1;
  date_max = useDateMax ? dateToTime(newDateMax) : -1;
  cumulativeMode = cumulative;
  stackedMode = stacked;

  updateFilterDisplay();

  if (cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
  }

  chrome.storage.sync.set({
    ratingMin: rating_min,
    ratingMax: rating_max,
    dateMin: date_min,
    dateMax: date_max,
    useRatingMin: useMin,
    useRatingMax: useMax,
    useDateMin: useDateMin,
    useDateMax: useDateMax,
    cumulativeMode: cumulative,
    stackedMode: stacked
  });
});

$(document).on('click', '#cfaResetBtn', function (e) {
  if (e) e.preventDefault();
  lastAppliedRatingMin = 800;
  lastAppliedRatingMax = 3500;
  $("#cfaRatingMin").val(800);
  $("#cfaRatingMax").val(3500);
  $("#cfaDateMin").val("");
  $("#cfaDateMax").val("");
  $("#cfaCumulativeMode").prop("checked", false);
  $("#cfaStackedMode").prop("checked", true);
  updateRatingSliderDisplay();

  rating_min = -1;
  rating_max = -1;
  date_min = -1;
  date_max = -1;
  cumulativeMode = false;
  stackedMode = true;

  updateFilterDisplay();

  if (cachedSubmissions && cachedSubmissions.length > 0) {
    processData(cachedSubmissions);
    createProblemRatingChart();
    createTagChart();
  }

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
    stackedMode: true
  });
});

$(document).on('click', '#cfaCaptionHeader', function (e) {
  e.preventDefault();
  $('#cfaSettingsContainer').slideToggle(180, function () {
    const isVisible = $('#cfaSettingsContainer').is(':visible');
    $('#cfaToggleIcon').html(isVisible ? '&#9652;' : '&#9662;');
    $('#cfaToggleText').text(isVisible ? 'hide' : 'show');
  });
});

$(document).on('keydown', '#cfaSettingsContainer input', function (e) {
  if (e.key === 'Enter') {
    $('#cfaUpdateBtn').click();
  }
});

ratings[Symbol.iterator] = function* () {
  yield* [...ratings.entries()].sort((a, b) => {
    if (a[0] < b[0]) {
      return -1;
    } else if (a[0] > b[0]) {
      return 1;
    } else return 0;
  });
}
tags[Symbol.iterator] = function* () {
  yield* [...tags.entries()].sort((a, b) => {
    if (a[1] < b[1]) {
      return 1;
    } else if (a[1] > b[1]) {
      return -1;
    } else return 0;
  });
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateFilterDisplay() {
  if (rating_min != -1 && rating_max != -1) {
    $("#ratingLi").html(`Rating: <span id="ratingMinSpan" class="${ratingSpanColor(rating_min)}" style="font-weight: bold;">${formatRatingValue(rating_min)}</span> – <span id="ratingMaxSpan" class="${ratingSpanColor(rating_max)}" style="font-weight: bold;">${formatRatingValue(rating_max)}</span>`).show();
  } else if (rating_min != -1) {
    $("#ratingLi").html(`Rating: ≥ <span id="ratingMinSpan" class="${ratingSpanColor(rating_min)}" style="font-weight: bold;">${formatRatingValue(rating_min)}</span>`).show();
  } else if (rating_max != -1) {
    $("#ratingLi").html(`Rating: ≤ <span id="ratingMaxSpan" class="${ratingSpanColor(rating_max)}" style="font-weight: bold;">${formatRatingValue(rating_max)}</span>`).show();
  } else {
    $("#ratingLi").hide();
  }

  if (date_min != -1 && date_max != -1) {
    $("#dateLi").html(`From <span id="dateMinSpan">${timeToDate(date_min)}</span> to <span id="dateMaxSpan">${timeToDate(date_max)}</span>`).show();
  } else if (date_min != -1) {
    $("#dateLi").html(`Since <span id="dateMinSpan">${timeToDate(date_min)}</span>`).show();
  } else if (date_max != -1) {
    $("#dateLi").html(`Until <span id="dateMaxSpan">${timeToDate(date_max)}</span>`).show();
  } else {
    $("#dateLi").hide();
  }
}

//Material Design 400 light
const colorArray = ['#ff867c', '#ff77a9', '#df78ef', '#b085f5', '#8e99f3', '#80d6ff', '#73e8ff', '#6ff9ff', '#64d8cb', '#98ee99', '#cfff95', '#ffff89', '#ffff8b', '#fffd61', '#ffd95b', '#ffa270'];
chrome.runtime.sendMessage({ todo: "appendHTML" }, function (response) {
  $('#pageContent').append(response.htmlResponse);

  const profileHandle = getProfileHandleFromUrl(window.location.href);

  chrome.storage.sync.get(["ratingMin", "ratingMax", "dateMin", "dateMax", "useRatingMin", "useRatingMax", "useDateMin", "useDateMax", "cumulativeMode", "stackedMode", "mergedAccountsGroups", "showRatingsSection", "showTagsSection", "showUnsolvedSection", "showToSolveSection", "toSolveMaxIndex", "toSolveMaxRating", "toSolveContestsCount", "toSolveSinceDate", "toSolveIncludeLive", "toSolveIncludeVirtual"], data => {
    syncPageSettingsInputs(data);

    if (data.ratingMin != "undefined" && data.useRatingMin) rating_min = data.ratingMin;
    if (data.ratingMax != "undefined" && data.useRatingMax) rating_max = data.ratingMax;
    if (data.dateMin != "undefined" && data.useDateMin) date_min = data.dateMin;
    if (data.dateMax != "undefined" && data.useDateMax) date_max = data.dateMax;
    if (typeof data.cumulativeMode === "boolean") cumulativeMode = data.cumulativeMode;
    stackedMode = (typeof data.stackedMode === "boolean") ? data.stackedMode : true;
    if (typeof data.showToSolveSection === "boolean") showToSolveSection = data.showToSolveSection;
    if (data.toSolveMaxIndex !== undefined) toSolveMaxIndex = data.toSolveMaxIndex;
    if (data.toSolveMaxRating !== undefined) toSolveMaxRating = parseInt(data.toSolveMaxRating, 10) || 0;
    if (data.toSolveContestsCount !== undefined) {
      const parsed = parseInt(data.toSolveContestsCount, 10);
      toSolveContestsCount = (!isNaN(parsed) && parsed > 0) ? parsed : "";
    }
    if (data.toSolveSinceDate !== undefined) toSolveSinceDate = (data.toSolveSinceDate || "").trim();
    if (typeof data.toSolveIncludeLive === "boolean") toSolveIncludeLive = data.toSolveIncludeLive;
    if (typeof data.toSolveIncludeVirtual === "boolean") toSolveIncludeVirtual = data.toSolveIncludeVirtual;

    updateFilterDisplay();
    applySectionVisibility(data);

    let groups = (data.mergedAccountsGroups && Array.isArray(data.mergedAccountsGroups)) ? data.mergedAccountsGroups : [];
    const currentGroup = findMergedGroupForHandle(profileHandle, groups);
    updateMergedAccountsDisplay(profileHandle, currentGroup);

    loadAndProcessSubmissions(currentGroup);
  });
});
function getProfileHandleFromUrl(url) {
  try {
    const $domLink = $('#pageContent .main-info h1 a, .main-info h1 a').first();
    if ($domLink.length) {
      const domText = $domLink.text().trim();
      if (domText) {
        return domText;
      }
    }
  } catch (e) {}

  try {
    const $hrefLink = $('#pageContent .main-info a[href*="/profile/"], .main-info a[href*="/profile/"]').first();
    if ($hrefLink.length) {
      const href = $hrefLink.attr('href') || '';
      const match = href.match(/\/profile\/([a-zA-Z0-9_.-]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (e) {}

  const targetUrl = url || window.location.href;
  const match = targetUrl.match(/\/profile\/([a-zA-Z0-9_.-]+)/i);
  if (match) {
    return match[1];
  }
  var cleanUrl = targetUrl.split(/[?#]/)[0].replace(/\/+$/, '');
  var arr = cleanUrl.split("/");
  return arr.slice(-1)[0] || "";
}

function getProfileIdFromUrl(url) {
  return [getProfileHandleFromUrl(url)];
}

function getUserHandleInfo() {
  const targetHandle = getProfileHandleFromUrl(window.location.href);

  // Search strictly inside #pageContent .main-info to avoid matching the logged-in user in the header/navbar
  let $link = $('#pageContent .main-info h1 a').first();
  if (!$link.length) {
    $link = $(`#pageContent .main-info a[href*="/profile/"]`).first();
  }
  if (!$link.length) {
    $link = $(`#pageContent a.rated-user[href*="/profile/${targetHandle}"]`).first();
  }

  if ($link.length) {
    const canonicalHandle = $link.text().trim() || targetHandle;
    return {
      handle: canonicalHandle,
      html: $link.html() || canonicalHandle,
      className: $link.attr('class') || 'rated-user',
      title: $link.attr('title') || ''
    };
  }

  return {
    handle: targetHandle,
    html: targetHandle,
    className: 'rated-user',
    title: ''
  };
}

function getRatingColors(rating) {
  const r = parseInt(rating, 10);
  let rgb = '204, 204, 204';
  if (r >= 3000) rgb = '170, 0, 0';
  else if (r >= 2600) rgb = '255, 51, 51';
  else if (r >= 2400) rgb = '255, 119, 119';
  else if (r >= 2300) rgb = '255, 187, 85';
  else if (r >= 2100) rgb = '255, 204, 136';
  else if (r >= 1900) rgb = '255, 136, 255';
  else if (r >= 1600) rgb = '170, 170, 255';
  else if (r >= 1400) rgb = '119, 221, 187';
  else if (r >= 1200) rgb = '119, 255, 119';

  return {
    live: `rgba(${rgb}, 1.0)`,
    virtual: `rgba(${rgb}, 0.72)`,
    practice: `rgba(${rgb}, 0.44)`
  };
}


function processData(resultArr) {
  problems.clear();
  problemNames.clear();
  solvedProblemNames.clear();
  ratings.clear();
  ratingsLive.clear();
  ratingsVirtual.clear();
  tags.clear();
  tagChartLabel.length = 0;
  tagChartData.length = 0;
  ratingChartLabel.length = 0;
  ratingChartData.length = 0;
  ratingChartLiveData.length = 0;
  ratingChartVirtualData.length = 0;
  ratingChartPracticeData.length = 0;
  ratingChartLiveColor.length = 0;
  ratingChartVirtualColor.length = 0;
  ratingChartPracticeColor.length = 0;
  ratingChartBackgroundColor.length = 0;
  $('#unsolved_list').empty();
  $('#legend_unordered_list').empty();

  for (var i = resultArr.length - 1; i >= 0; i--) {
    var sub = resultArr[i];
    var problemId = sub.problem.contestId + '-' + sub.problem.index;
    if (!problems.has(problemId)) {
      problems.set(problemId, {
        solved: false,
        use: true,
        rating: sub.problem.rating,
        name: sub.problem.name,
        contestId: sub.problem.contestId,
        index: sub.problem.index,
        tags: sub.problem.tags,
        date: sub.creationTimeSeconds,
        team: false,
        official: false,
        virtual: false,
        attempts: 0
      });
    }
    let obj = problems.get(problemId);
    obj.attempts = (obj.attempts || 0) + 1;

    if (problemNames.has(obj.name)) {
      let other = problemNames.get(obj.name);
      // If the same problem is solved in both Div 1 and Div 2 contests, keep the earliest submission and ignore the other.
      if (Math.abs(other.contestId - obj.contestId) == 1) {
        obj.use = false;
      }
    }

    problemNames.set(obj.name, { contestId: obj.contestId });

    if (!(obj.rating &&
      (obj.rating >= rating_min || rating_min == -1) &&
      (obj.rating <= rating_max || rating_max == -1) &&
      (obj.date >= date_min || date_min == -1) &&
      (obj.date < (date_max + 86400) || date_max == -1)))
      obj.use = false;

    if (sub.verdict == "OK") {
      obj.solved = true;
      if (sub.problem && sub.problem.name) {
        solvedProblemNames.add(sub.problem.name.trim().toLowerCase());
      }
      const isTeam = !!(sub.author && (sub.author.teamId || sub.author.teamName || (sub.author.members && sub.author.members.length > 1)));
      if (isTeam) {
        obj.team = true;
      }
      const isContest = sub.author && (sub.author.participantType === "CONTESTANT" || sub.author.participantType === "VIRTUAL");
      if (isContest && !isTeam) {
        if (sub.author.participantType === "CONTESTANT") {
          obj.official = true;
        } else if (sub.author.participantType === "VIRTUAL") {
          obj.virtual = true;
        }
      }
    }

    problems.set(problemId, obj);
  }
  let unsolvedCount = 0;
  problems.forEach(function (prob) {
    if (prob.use) {
      if (prob.rating && prob.solved === true) {
        if (!ratings.has(prob.rating)) {
          ratings.set(prob.rating, 0);
          ratingsLive.set(prob.rating, 0);
          ratingsVirtual.set(prob.rating, 0);
        }
        let cnt = ratings.get(prob.rating);
        cnt++;
        ratings.set(prob.rating, cnt);

        if (prob.official) {
          let liveCnt = ratingsLive.get(prob.rating) || 0;
          ratingsLive.set(prob.rating, liveCnt + 1);
        } else if (prob.virtual) {
          let virtualCnt = ratingsVirtual.get(prob.rating) || 0;
          ratingsVirtual.set(prob.rating, virtualCnt + 1);
        }
      }
      if (prob.solved === false) {
        unsolvedCount++;
        const problemURL = findProblemURL(prob.contestId, prob.index);
        $('#unsolved_list').append(`
            <a class="unsolved_problem" href="${problemURL}">
              ${prob.contestId}-${prob.index}
            </a>
        `);
        $('#unsolved_list').append("     ");
      }
      if (prob.solved === true) {
        prob.tags.forEach(function (tag) {
          if (!tags.has(tag)) {
            tags.set(tag, 0);
          }
          let cnt = tags.get(tag);
          cnt++;
          tags.set(tag, cnt);
        })
      }
    }
  })
  $('#unsolved_count').text(`Count : ${unsolvedCount}`);
  for (let [key, val] of tags) {
    tagChartLabel.push(key);
    tagChartData.push(val);
  }

  let sortedRatings = Array.from(ratings.keys()).sort((a, b) => a - b);

  if (cumulativeMode) {
    // Cumulative chart data for ratings (x+)
    let cumulativeLive = 0;
    let cumulativeVirtual = 0;
    let cumulativePractice = 0;
    let liveCounts = {};
    let virtualCounts = {};
    let practiceCounts = {};
    for (let key of sortedRatings.slice().reverse()) {
      let live = ratingsLive.get(key) || 0;
      let virtual = ratingsVirtual.get(key) || 0;
      let total = ratings.get(key) || 0;
      let practice = total - live - virtual;

      cumulativeLive += live;
      cumulativeVirtual += virtual;
      cumulativePractice += practice;
      liveCounts[key] = cumulativeLive;
      virtualCounts[key] = cumulativeVirtual;
      practiceCounts[key] = cumulativePractice;
    }

    for (let key of sortedRatings) {
      ratingChartLabel.push(key + "+"); // Add "+" to label
      ratingChartLiveData.push(liveCounts[key]);
      ratingChartVirtualData.push(virtualCounts[key]);
      ratingChartPracticeData.push(practiceCounts[key]);
      ratingChartData.push(liveCounts[key] + virtualCounts[key] + practiceCounts[key]);

      let colors = getRatingColors(key);
      ratingChartLiveColor.push(colors.live);
      ratingChartVirtualColor.push(colors.virtual);
      ratingChartPracticeColor.push(colors.practice);
      ratingChartBackgroundColor.push(ratingBackgroundColor(key));
    }
  } else {
    // Non-cumulative: just use the counts
    for (let key of sortedRatings) {
      let live = ratingsLive.get(key) || 0;
      let virtual = ratingsVirtual.get(key) || 0;
      let total = ratings.get(key) || 0;
      let practice = total - live - virtual;

      ratingChartLabel.push(key);
      ratingChartLiveData.push(live);
      ratingChartVirtualData.push(virtual);
      ratingChartPracticeData.push(practice);
      ratingChartData.push(total);

      let colors = getRatingColors(key);
      ratingChartLiveColor.push(colors.live);
      ratingChartVirtualColor.push(colors.virtual);
      ratingChartPracticeColor.push(colors.practice);
      ratingChartBackgroundColor.push(ratingBackgroundColor(key));
    }
  }
}
function findProblemURL(contestId, index) {
  if (contestId && contestId.toString().length <= 4) {
    return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
  } else {
    return `https://codeforces.com/problemset/gymProblem/${contestId}/${index}`;
  }
}
function createProblemRatingChart() {
  var ctx = document.getElementById('problemRatingChart').getContext('2d');
  if (problemRatingChartInstance) {
    problemRatingChartInstance.destroy();
    problemRatingChartInstance = null;
  }

  var datasets;
  var scalesOptions;
  var pluginsOptions;
  var barNumbersPlugin;

  if (stackedMode) {
    datasets = [
      {
        label: 'Live Contest',
        data: ratingChartLiveData,
        backgroundColor: ratingChartLiveColor,
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 0.75,
        stack: 'ratingStack',
        hidden: !stackedShowLive
      },
      {
        label: 'Virtual Contest',
        data: ratingChartVirtualData,
        backgroundColor: ratingChartVirtualColor,
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 0.75,
        stack: 'ratingStack',
        hidden: !stackedShowVirtual
      },
      {
        label: 'Practice',
        data: ratingChartPracticeData,
        backgroundColor: ratingChartPracticeColor,
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 0.75,
        stack: 'ratingStack',
        hidden: !stackedShowPractice
      }
    ];

    scalesOptions = {
      x: {
        stacked: true,
        title: { text: 'Problem Rating', display: false }
      },
      y: {
        stacked: true,
        title: { text: 'Problems Solved', display: false },
        beginAtZero: true,
        grace: '5%'
      }
    };

    pluginsOptions = {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 14,
          boxHeight: 14,
          font: { size: 11, family: 'verdana, arial, sans-serif' },
          padding: 15,
          generateLabels(chart) {
            return [
              {
                text: 'Live Contest',
                fillStyle: 'rgba(60, 60, 60, 1.0)',
                strokeStyle: 'rgba(0, 0, 0, 0.8)',
                lineWidth: 0.75,
                hidden: !chart.isDatasetVisible(0),
                datasetIndex: 0
              },
              {
                text: 'Virtual Contest',
                fillStyle: 'rgba(60, 60, 60, 0.72)',
                strokeStyle: 'rgba(0, 0, 0, 0.8)',
                lineWidth: 0.75,
                hidden: !chart.isDatasetVisible(1),
                datasetIndex: 1
              },
              {
                text: 'Practice',
                fillStyle: 'rgba(60, 60, 60, 0.44)',
                strokeStyle: 'rgba(0, 0, 0, 0.8)',
                lineWidth: 0.75,
                hidden: !chart.isDatasetVisible(2),
                datasetIndex: 2
              }
            ];
          }
        },
        onClick(e, legendItem, legend) {
          const index = legendItem.datasetIndex;
          const ci = legend.chart;
          if (ci.isDatasetVisible(index)) {
            ci.hide(index);
            legendItem.hidden = true;
          } else {
            ci.show(index);
            legendItem.hidden = false;
          }

          stackedShowLive = ci.isDatasetVisible(0);
          stackedShowVirtual = ci.isDatasetVisible(1);
          stackedShowPractice = ci.isDatasetVisible(2);

          chrome.storage.sync.set({
            stackedShowLive: stackedShowLive,
            stackedShowVirtual: stackedShowVirtual,
            stackedShowPractice: stackedShowPractice
          });
        }
      },
      tooltip: {
        callbacks: {
          footer(tooltipItems) {
            let sum = 0;
            tooltipItems.forEach(item => {
              sum += item.parsed.y;
            });
            return 'Total: ' + sum;
          }
        }
      }
    };

    barNumbersPlugin = {
      id: 'barNumbers',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        const chartElem = document.getElementById('problemRatingChart') || document.body;
        const textColor = window.getComputedStyle(chartElem).color || '#333';

        const metaLive = chart.getDatasetMeta(0);
        const metaVirtual = chart.getDatasetMeta(1);
        const metaPractice = chart.getDatasetMeta(2);

        const sampleMeta = (metaLive && metaLive.data && metaLive.data.length > 0)
          ? metaLive
          : ((metaVirtual && metaVirtual.data && metaVirtual.data.length > 0)
            ? metaVirtual
            : (metaPractice && metaPractice.data && metaPractice.data.length > 0 ? metaPractice : null));

        if (sampleMeta) {
          const len = sampleMeta.data.length;
          for (let i = 0; i < len; i++) {
            const barLive = metaLive && metaLive.data ? metaLive.data[i] : null;
            const barVirtual = metaVirtual && metaVirtual.data ? metaVirtual.data[i] : null;
            const barPractice = metaPractice && metaPractice.data ? metaPractice.data[i] : null;

            const liveVal = chart.isDatasetVisible(0) ? (chart.data.datasets[0].data[i] || 0) : 0;
            const virtualVal = chart.isDatasetVisible(1) ? (chart.data.datasets[1].data[i] || 0) : 0;
            const practiceVal = chart.isDatasetVisible(2) ? (chart.data.datasets[2].data[i] || 0) : 0;
            const totalVal = liveVal + virtualVal + practiceVal;

            if (totalVal <= 0) continue;

            const sampleBar = (chart.isDatasetVisible(0) && barLive)
              ? barLive
              : ((chart.isDatasetVisible(1) && barVirtual)
                ? barVirtual
                : (barPractice || barVirtual || barLive));
            if (!sampleBar) continue;
            const posX = sampleBar.x;

            let topY = Infinity;
            if (practiceVal > 0 && barPractice) topY = Math.min(topY, barPractice.y);
            if (virtualVal > 0 && barVirtual) topY = Math.min(topY, barVirtual.y);
            if (liveVal > 0 && barLive) topY = Math.min(topY, barLive.y);
            if (topY === Infinity) continue;

            ctx.fillStyle = textColor;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(totalVal, posX, topY - 3);

            const activeCount = (liveVal > 0 ? 1 : 0) + (virtualVal > 0 ? 1 : 0) + (practiceVal > 0 ? 1 : 0);
            if (activeCount > 1) {
              ctx.font = 'bold 10px sans-serif';
              ctx.textBaseline = 'middle';

              const drawSeg = (val, bar) => {
                if (val > 0 && bar) {
                  const h = Math.abs(bar.base - bar.y);
                  if (h >= 13) {
                    const cy = (bar.base + bar.y) / 2;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.lineWidth = 2.5;
                    ctx.strokeText(val, posX, cy);
                    ctx.fillStyle = '#111';
                    ctx.fillText(val, posX, cy);
                  }
                }
              };

              if (chart.isDatasetVisible(0)) drawSeg(liveVal, barLive);
              if (chart.isDatasetVisible(1)) drawSeg(virtualVal, barVirtual);
              if (chart.isDatasetVisible(2)) drawSeg(practiceVal, barPractice);
            }
          }
        }
        ctx.restore();
      }
    };
  } else {
    // Old mode: single dataset
    datasets = [
      {
        label: 'Problems Solved',
        data: ratingChartData,
        backgroundColor: ratingChartBackgroundColor,
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 0.75
      }
    ];

    scalesOptions = {
      x: {
        title: { text: 'Problem Rating', display: false }
      },
      y: {
        title: { text: 'Problems Solved', display: false },
        beginAtZero: true,
        grace: '5%'
      }
    };

    pluginsOptions = {
      legend: { display: false }
    };

    barNumbersPlugin = {
      id: 'barNumbers',
      afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        ctx.save();
        const chartElem = document.getElementById('problemRatingChart') || document.body;
        ctx.fillStyle = window.getComputedStyle(chartElem).color || '#333';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const meta = chart.getDatasetMeta(0);
        if (meta && meta.data) {
          meta.data.forEach((bar, index) => {
            const val = data.datasets[0].data[index];
            if (val !== undefined && val !== null && val > 0) {
              ctx.fillText(val, bar.x, bar.y - 3);
            }
          });
        }
        ctx.restore();
      }
    };
  }

  problemRatingChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ratingChartLabel,
      datasets: datasets
    },
    plugins: [barNumbersPlugin],
    options: {
      aspectRatio: 2.5,
      layout: {
        padding: { top: 16 }
      },
      plugins: pluginsOptions,
      scales: scalesOptions,
      onClick: function (event, elements) {
        if (elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const ratingIndex = element.index;
          const ratingLevel = ratingChartLabel[ratingIndex];

          let initialTab = 'all';
          if (stackedMode) {
            if (datasetIndex === 0) initialTab = 'live';
            else if (datasetIndex === 1) initialTab = 'virtual';
            else if (datasetIndex === 2) initialTab = 'practice';
          }

          showSolvedProblemsModal(ratingLevel, initialTab);
        }
      }
    }
  });
}

var modalProblems = [];
var modalActiveTab = 'all';
var modalRatingLabel = '';

function showSolvedProblemsModal(ratingLabel, initialTab = 'all') {
  modalRatingLabel = ratingLabel;
  modalActiveTab = initialTab;

  const rawRating = parseInt(ratingLabel, 10);

  modalProblems = [];
  problems.forEach(prob => {
    if (prob.use && prob.solved && prob.rating) {
      if (cumulativeMode) {
        if (prob.rating >= rawRating) modalProblems.push(prob);
      } else {
        if (prob.rating === rawRating) modalProblems.push(prob);
      }
    }
  });

  modalProblems.sort((a, b) => (b.contestId - a.contestId) || a.index.localeCompare(b.index));

  const liveCount = modalProblems.filter(p => p.official).length;
  const virtualCount = modalProblems.filter(p => !p.official && p.virtual).length;
  const practiceCount = modalProblems.filter(p => !p.official && !p.virtual).length;
  const totalCount = modalProblems.length;

  $('#solvedModalTitle').text(`Solved Problems (Rating ${ratingLabel})`);

  $('.solved-tab-btn[data-tab="live"]').text(`Live Contest (${liveCount})`);
  $('.solved-tab-btn[data-tab="virtual"]').text(`Virtual Contest (${virtualCount})`);
  $('.solved-tab-btn[data-tab="practice"]').text(`Practice (${practiceCount})`);
  $('.solved-tab-btn[data-tab="all"]').text(`All (${totalCount})`);

  renderModalProblems();
  $('#solvedProblemsModal').css('display', 'flex');
}

function renderModalProblems() {
  $('.solved-tab-btn').each(function () {
    const tab = $(this).attr('data-tab');
    if (tab === modalActiveTab) {
      $(this).css({
        'background': '#0b5ed7',
        'color': '#fff',
        'border-color': '#0a58ca',
        'font-weight': 'bold'
      });
    } else {
      $(this).css({
        'background': '#fff',
        'color': '#333',
        'border-color': '#ccc',
        'font-weight': 'normal'
      });
    }
  });

  let displayList = modalProblems;
  if (modalActiveTab === 'live') {
    displayList = modalProblems.filter(p => p.official);
  } else if (modalActiveTab === 'virtual') {
    displayList = modalProblems.filter(p => !p.official && p.virtual);
  } else if (modalActiveTab === 'practice') {
    displayList = modalProblems.filter(p => !p.official && !p.virtual);
  }

  const $body = $('#solvedModalBody');
  $body.empty();

  if (displayList.length === 0) {
    $body.html('<p style="color: #777; text-align: center; margin: 25px 0;">No problems found in this category.</p>');
    return;
  }

  displayList.forEach(prob => {
    const url = findProblemURL(prob.contestId, prob.index);
    let typeBadge = '<span style="background: #f1f3f4; color: #5f6368; font-size: 0.75em; padding: 2px 8px; border-radius: 4px; border: 1px solid #dadce0;">Practice</span>';
    if (prob.official) {
      typeBadge = '<span style="background: #e6f4ea; color: #137333; font-size: 0.75em; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #ceead6;">Live Contest</span>';
    } else if (prob.virtual) {
      typeBadge = '<span style="background: #e0f2fe; color: #0369a1; font-size: 0.75em; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #bae6fd;">Virtual Contest</span>';
    } else if (prob.team) {
      typeBadge = '<span style="background: #e8f0fe; color: #1a73e8; font-size: 0.75em; padding: 2px 8px; border-radius: 4px; border: 1px solid #d2e3fc;" title="Solved as part of a team">Team Contest</span>';
    }

    const ratingBadge = cumulativeMode
      ? `<span style="font-size: 0.8em; font-weight: bold; margin-left: 8px;" class="${ratingSpanColor(prob.rating)}">${formatRatingValue(prob.rating)}</span>`
      : '';

    $body.append(`
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-bottom: 1px solid #f0f0f0;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 12px;">
          <a href="${url}" target="_blank" style="font-weight: bold; text-decoration: none; color: #1a0dab; margin-right: 8px;">
            ${prob.contestId}-${prob.index}
          </a>
          <span style="color: #222;">${prob.name}</span>
        </div>
        <div style="display: flex; align-items: center; flex-shrink: 0;">
          ${typeBadge}
          ${ratingBadge}
        </div>
      </div>
    `);
  });
}

$(document).on('click', '.solved-tab-btn', function () {
  modalActiveTab = $(this).attr('data-tab');
  renderModalProblems();
});

$(document).on('click', '#solvedModalClose', function () {
  $('#solvedProblemsModal').hide();
});

$(document).on('click', '#solvedProblemsModal', function (e) {
  if (e.target === this) {
    $(this).hide();
  }
});

$(document).on('keydown', function (e) {
  if (e.key === 'Escape' && $('#solvedProblemsModal').is(':visible')) {
    $('#solvedProblemsModal').hide();
  }
});
function createTagChart() {
  var ctx = document.getElementById('tagChart').getContext('2d');
  if (tagChartInstance) {
    tagChartInstance.destroy();
    tagChartInstance = null;
  }
  tagChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tagChartLabel,
      datasets: [{
        label: 'Tags Solved',
        data: tagChartData,
        backgroundColor: colorArray,
        // borderColor: 'rgba(0,0,0,0.5)',//ratingChartBorderColor,
        borderWidth: 0.5,
        // spacing: 5,
      }]
    },
    options: {
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false,
          position: 'right',
        },
      },
      onClick: function (event, legendItem) {
        if (legendItem.length > 0) {
          const tagChartIndex = legendItem[0].index;
          const tag = tagChartLabel[tagChartIndex];
          const url = `https://codeforces.com/problemset?tags=${tag}`;
          window.location.href = url;
        }
      }
    },
  });
  $('#legend_unordered_list').empty();
  for (var i = 0; i < tagChartLabel.length; i++) {
    $('#legend_unordered_list').append(`<li>
    <svg width="12" height="12">
      <rect width="12" height="12" style="fill:${colorArray[i % (colorArray.length)]};stroke-width:1;stroke:rgb(0,0,0)" />
    </svg>
    ${tagChartLabel[i]} : ${tagChartData[i]}
    </li>`)
  }
}
function ratingBackgroundColor(rating) {
  const legendaryGrandmaster = 'rgba(170,0  ,0  ,0.9)';
  const internationalGrandmaster = 'rgba(255,51 ,51 ,0.9)';
  const grandmaster = 'rgba(255,119,119,0.9)';
  const internationalMaster = 'rgba(255,187,85 ,0.9)';
  const master = 'rgba(255,204,136,0.9)';
  const candidateMaster = 'rgba(255,136,255,0.9)';
  const expert = 'rgba(170,170,255,0.9)';
  const specialist = 'rgba(119,221,187,0.9)';
  const pupil = 'rgba(119,255,119,0.9)';
  const newbie = 'rgba(204,204,204,0.9)';
  if (rating >= 3000) {
    return legendaryGrandmaster;
  } else if (rating >= 2600 && rating <= 2999) {
    return internationalGrandmaster;
  } else if (rating >= 2400 && rating <= 2599) {
    return grandmaster;
  } else if (rating >= 2300 && rating <= 2399) {
    return internationalMaster;
  } else if (rating >= 2100 && rating <= 2299) {
    return master;
  } else if (rating >= 1900 && rating <= 2099) {
    return candidateMaster;
  } else if (rating >= 1600 && rating <= 1899) {
    return expert;
  } else if (rating >= 1400 && rating <= 1599) {
    return specialist;
  } else if (rating >= 1200 && rating <= 1399) {
    return pupil;
  } else {
    return newbie;
  }
}
function ratingSpanColor(rating) {
  const red = 'user-red';
  const orange = 'user-orange';
  const violet = 'user-violet';
  const blue = 'user-blue';
  const cyan = 'user-cyan';
  const green = 'user-green';
  const gray = 'user-gray';

  if (rating >= 2400)
    return red;
  else if (rating >= 2100 && rating <= 2399)
    return orange;
  else if (rating >= 1900 && rating <= 2099)
    return violet;
  else if (rating >= 1600 && rating <= 1899)
    return blue;
  else if (rating >= 1400 && rating <= 1599)
    return cyan;
  else if (rating >= 1200 && rating <= 1399)
    return green;
  else
    return gray;
}