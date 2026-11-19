# Cataclysm 1.8 Distilled Advancement · Pass 06

The Pass 05 handoff supplied the inherited Long Night runtime and the generated raster and WAV assets. Pass 06 integrated the following in the 1.8 directory.

## Gameplay

- **Trawl Team** combines active Level-3 Angler and Trapper cats. It automatically nets a visible enemy cluster up to 420 world units away, affecting at most four enemies. The 1.4-second hold becomes 1.8 seconds in rain. Elites receive a short slow and bosses are immune. The net has a nine-second cooldown.
- **Spotter Pair** combines active Level-3 Scout and Sniper cats. Its 850-unit clear-weather acquisition prioritizes major and ranged enemies. A visible 0.45-second aim leads to a piercing shot when the target remains exposed. The mark gives the next eligible allied hit +20% damage within two seconds. Acquisition falls to 360 units in fog. The shot has a seven-second cooldown.
- Both crews use the pause menu and occupy one slot apiece. Separation requires an open slot and clear placement out of enemy reach, with a ten-second lockout. Parent work and food stay with the original cats. Each completed special credits one parent, alternating roles, and a meal consumes one existing pickup for the lower-energy parent. The inherited Engineer + Shooter automatic Mecha path remains available.
- District weather is derived from the run seed, chapter, district and three-night epoch. Rain reduces ordinary dash speed by 15%. Fog fades distant ordinary enemy bodies and limits fresh ordinary caster/ranged attacks and companion acquisition, with a longer cap for Spotter. Storm attempts one nearby ground strike per eight active seconds, with a warning before it staggers ordinary enemies. Active projectiles and major enemy telegraphs retain their rendering.
- A seed selects the chapter's optional objective and site search order. **Rain Cache** grants six seconds of +25% movement after a two-second hold. **Signal Rescue** grants one incoming projectile or contact shield charge for up to twelve seconds after a three-second hold. Sites use existing street paths and combat pressure. The mission system adds no reinforcements. Moving away resets the hold. Offers defer to gates, city events, bosses and the finale.
- Curious, Worried, Determined and Excited moods respond to energy, nearby threats, mission progress and completed actions or meals. Worried cats prefer closer formation and retain existing safe foraging. Mood reactions use brief text, synthesized tones and illustrated faces. Missions and abilities use existing movement and automatic combat.

## Media and checkpoint

The combat canvas draws the four Pass 05 crew poses and the painted mood and mission icons. The status strip displays the four painted weather crops. The shipped WAVs are wired through the existing bounded effects bus for crew actions, weather entry and mission completion. [Pass 05 media paths and hashes](ADVANCEMENT_MEDIA.json)

Schema 2 uses alternating `cataclysm-18-save-a/b` slots. When both 1.8 slots are absent, the journal verifies the schema-1 checksum and payload before offering a 1.7 import. A resumed import writes a new 1.8 revision and retains the 1.7 record. The validator checks the four-slot cap, committed role uniqueness, each recipe's two flat Level-3 parent records and the advancement state. Mood, crew cooldowns and wind-up, weather district and pending strike, mission progress, and reward deadlines are checkpointed. The prior 1.69 metadata handling still applies to scores and city history.

## Evidence and limitations

- `node qa/long-night-fixtures.cjs` drives the complete scripts using a DOM/canvas test double. It exercises the paused fusion controls, cooldown and slot rules, fusion raster draw calls, matched ordinary ranged acquisition in clear weather and fog, mission completion and restore, 1.7 Mecha migration with exact player fish, and inherited segmented 1000-night progression with all milestone restores and the finale. It also verifies the Pass 05 media byte signatures and manifest SHA-256 values. [Results](../qa/advancement-fixture-results.txt)
- `node qa/advancement-chromium.cjs` is a portable 390×844 and 844×390 startup, keyboard movement, sampled canvas, weather image and HUD bounds check. This runner's installed Chromium exited during startup because the sandbox denied the Linux socket shutdown call. Browser rendering, touch interaction, audible mix, physical Samsung performance and a continuous endurance run remain unverified. [Browser attempt](../qa/advancement-chromium-attempt.txt)
- Thunder Chorus was left as a stretch concept. The shipped Pass 05 crew art covers the two implemented recipes. Pass 07 owns independent verification and candidate freeze.
