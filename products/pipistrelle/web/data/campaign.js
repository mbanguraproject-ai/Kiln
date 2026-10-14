/* The campaign, "The Long Rain": four biomes of six caves and the finale. Each biome registers itself from
 * data/biomes/<id>.js (see docs/BIOMES.md). A biome without `ready: true` shows on the map as still to come.
 * gates: Moons needed to enter a biome (soft gates; a crescent-only player still gets through). */
(function () {
  'use strict';
  window.PP.data.campaign = {
    name: 'The Long Rain',
    order: ['chalk', 'drowned', 'glass', 'owlstone', 'hush'],
    gates: { chalk: 0, drowned: 4, glass: 10, owlstone: 18, hush: 34 },
    practice: { id: 'practice', name: 'Practice Hollow', seed: 4242 },
    nightly: { name: 'The Nightly Cave' },
  };
})();
