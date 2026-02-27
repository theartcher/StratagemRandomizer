# Helldivers 2 - Stratagem Randomizer

A tool that randomly selects a loadout of 4 unique stratagems for Helldivers 2, with support for filtering based on owned Warbonds.

## What are Stratagems?

Stratagems are special weapons and equipment that players can bring into missions in Helldivers 2. Each player can equip up to **4 unique stratagems** per mission (no duplicates allowed).

They are divided into three categories:

### Offensive

Stratagems focused on dealing damage to enemies.

- **Eagles** — Air-support strikes called in from an Eagle fighter ship
- **Orbitals** — Devastating strikes called in from an orbiting destroyer

### Supply

Stratagems that provide equipment and support.

- **Backpacks** — Worn on the player's back (e.g. jump pack, shield generator)
- **Backpack Weapons** — Heavy weapons that require a backpack to operate (e.g. autocannon, spear)
- **Vehicles** — Deployable vehicles for transportation and combat support

> **Note:** You should never bring both a Backpack and a Backpack Weapon simultaneously, as they occupy the same slot on your character and are mutually exclusive.

### Defensive

Stratagems that hold ground and protect areas.

- **Turrets** — Automated gun emplacements
- **Mines** — Deployable minefields

## Warbonds

Some stratagems are locked behind purchasable expansions called **Warbonds**. The randomizer must respect the player's owned Warbonds and only include stratagems the player has access to.

---

## TODO

- [x] **Define stratagem data** — Full list in [`data/stratagems.json`](data/stratagems.json). Each entry includes: `id`, `name`, `code` (array of directions), `category` (`eagle` | `orbital` | `support_weapon` | `backpack` | `sentry` | `emplacement` | `vehicle`), `subcategory` (`standard` | `backpack_weapon` for support weapons; `mine` | `static` for emplacements), `requires_backpack` flag, `cost_type` / `cost_amount`, `unlock_level`, `ship_module`, and `warbond` / `warbond_page`.
- [x] **Define Warbond list** — 11 warbonds listed in [`data/warbonds.json`](data/warbonds.json): Borderline Justice, Chemical Agents, Control Group, Dust Devils, Force of Law, Masters of Ceremony, Python Commandos, Redacted Regiment, Servants of Freedom, Siege Breakers, Urban Legends
- [ ] **Build the randomizer logic** — Core algorithm that:
  - Filters the stratagem pool to only include stratagems available given the selected Warbonds
  - Enforces the **no Backpack + Backpack Weapon** mutual exclusion rule
  - Returns 4 unique stratagems
- [ ] **Build the UI** — A simple interface that allows users to:
  - Toggle which Warbonds they own
  - Trigger a randomization
  - Display the resulting 4-stratagem loadout with category labels
- [ ] **Add loadout re-roll** — Allow users to re-roll individual stratagem slots or the full loadout
- [ ] **Persist Warbond selections** — Save the user's Warbond selections between sessions (e.g. localStorage or a config file)
- [ ] **Testing** — Validate the randomizer logic covers edge cases (e.g. very limited pool, only one Backpack Weapon available with no Backpacks, etc.)

# Human stuff (dont touch)

Future work

- [x] Level slider — filters pool to stratagems at or below the selected level
- Select categories, e.g. 2 orbitals and 2 eagles
- Exclude specific stratagems (e.g. no mines)
