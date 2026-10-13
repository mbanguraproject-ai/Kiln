/* Colony Requests: all visible at once, never expiring, never rotating. Rewards are in data/economy.js.
 * goal(profile) returns [progress, target]; a request completes when progress >= target. */
(function () {
  'use strict';
  const P = window.PP;
  const caveMoons = (pr, pre) => { let n = 0; for (const id in pr.caves) if (id.indexOf(pre) === 0) n += (pr.caves[id].moons || []).filter(Boolean).length; return n; };
  P.data.requests = [
    { id: 'first-light', name: 'First Light', text: 'Fly out of your first cave', goal: pr => [pr.stats.caves, 1] },
    { id: 'little-voices', name: 'Little Voices', text: 'Bring 5 pups home', goal: pr => [pr.stats.pups, 5] },
    { id: 'loud-and-clear', name: 'Loud and Clear', text: 'Shriek 25 times', goal: pr => [pr.stats.shrieks, 25] },
    { id: 'mothwatcher', name: 'Mothwatcher', text: 'Eat 300 moths', goal: pr => [pr.stats.moths, 300] },
    { id: 'chalk-moons', name: 'Chalk Moons', text: 'Earn 12 Moons in Chalk Hollows', goal: pr => [caveMoons(pr, '1-'), 12] },
    { id: 'old-scratches', name: 'Old Scratches', text: 'Read 6 Old Scratches', goal: pr => [Object.keys(pr.journal.scratches).length, 6] },
    { id: 'nursemaid-1', name: 'Nursemaid I', text: 'Bring 25 pups home', goal: pr => [pr.stats.pups, 25] },
    { id: 'nursemaid-2', name: 'Nursemaid II', text: 'Bring 75 pups home', goal: pr => [pr.stats.pups, 75] },
    { id: 'nursemaid-3', name: 'Nursemaid III', text: 'Bring 150 pups home', goal: pr => [pr.stats.pups, 150] },
    { id: 'three-calls', name: 'Three Calls', text: 'Finish any cave with 3 calls or fewer', goal: pr => [pr.stats.quietest <= 3 ? 1 : 0, 1] },
    { id: 'no-scratch', name: 'No Scratch', text: 'Finish 5 caves without bumping a wall', goal: pr => [pr.stats.cleanCaves, 5] },
    { id: 'cartographer', name: 'Cartographer', text: 'Hear 90% of a cave’s walls', goal: pr => [pr.stats.bestSurvey >= 90 ? 1 : 0, 1] },
    { id: 'long-night-5', name: 'Into the Night', text: 'Reach cave 5 in The Long Night', goal: pr => [pr.longNight.bestCave, 5] },
    { id: 'long-night-10', name: 'Long Night', text: 'Reach cave 10 in The Long Night', goal: pr => [pr.longNight.bestCave, 10] },
    { id: 'nightly', name: 'Night Owl', text: 'Clear the Nightly Cave', goal: pr => [pr.stats.nightlies, 1] },
  ];
})();
