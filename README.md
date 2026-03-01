# Helldivers 2 - Stratagem Randomizer

A tool that randomly selects a loadout of 4 unique stratagems for Helldivers 2, with support for filtering based on owned Warbonds.

## Description

The Stratagem Randomizer is a web-based utility designed for Helldivers 2 players. It intelligently generates random stratagem loadouts that respect your Warbond ownership and the game's equipment constraints. The tool helps players break out of predictable loadout patterns and discover new strategy combinations during gameplay.

<div style="display: flex; align-items: center; gap: 10px;">
  <a href="https://mmmlabel.tech/">
    <img src="https://mmmlabel.tech/wp-content/themes/mmmlabel/icons/color/128px/piggybacker/piggybacker.svg" alt="Piggybacker" style="width: 80px; height: 80px;">
  </a>
    <div>
  This project uses AI assistance in its development (Piggybacker label) to enhance productivity while maintaining high code quality standards.
  </div>
</div>

## Functionality

- Player level: The randomizer can take into account the player''s current level to ensure that only stratagems they have unlocked are included in the randomization pool.
- Warbonds: The randomizer allows players to specify which Warbonds they own, and it will only include stratagems from those Warbonds in the randomization process.
- Rules: The randomizer respects certain overarching rules such as 'bring 1 backpack'
- Pin Slot Types: The randomizer categorizes stratagems into different pin slot types (e.g., Eagle, Orbital, Support Weapon, Backpack, Sentry, Emplacement, Vehicle) and ensures that the generated loadout adheres to the game's equipment constraints.

---

## Development

### Development Workflow

We follow a standard development cycle:

1. **Fork & Branch** Fork the repository and create a feature branch for your work

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Setup Local Environment** See [Local Usage](#local-usage) section

3. **Make Changes** Implement your feature or fix
   - Keep commits atomic and descriptive
   - Follow the existing code style

4. **Test Locally** Verify your changes work correctly
   - Run the development server
   - Test affected functionality manually
   - Check console for errors and warnings

5. **Commit & Push** Push your branch to your fork

   ```bash
   git add .
   git commit -m "feat: brief description of changes"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request** Submit a PR with a clear description of:
   - What problem does this solve?
   - How have you tested it?
   - Any breaking changes?

7. **Code Review** Address feedback from maintainers

8. **Merge** Your PR will be merged once approved

### Technology Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **UI Components**: Ant Design
- **Icons**: Ant Design Icons
- **Styling**: CSS Modules

### Project Structure

- `app/` Next.js application files (pages, layout, components)
- `app/components/` React components
  - `StratagemRandomizer.tsx` Main randomizer component
  - `ui/` UI building blocks
- `app/constants/` Configuration and constants
- `app/hooks/` Custom React hooks
- `app/services/` Business logic and utilities
- `app/types/` TypeScript type definitions
- `app/utils/` Helper functions
- `data/` Static data (stratagems, warbonds, icons)
- `scripts/` Build and automation scripts

---

## Local Usage

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/StratagemRandomizer.git
   cd StratagemRandomizer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running Locally

1. **Development Server** Start the development server with hot reload:

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

2. **Production Build** Build for production:

   ```bash
   npm run build
   ```

3. **Production Start** Run the production build:

   ```bash
   npm start
   ```

4. **Linting** Check code quality:

   ```bash
   npm run lint
   ```

### Configuration

The application stores user preferences (owned Warbonds, selections) in browser `localStorage`. No server-side configuration is needed for local usage.

To modify stratagem data, edit:

- [data/stratagems.json](data/stratagems.json) Stratagem definitions
- [data/warbonds.json](data/warbonds.json) Warbond definitions

## Contributors

We welcome contributions from the community! Please see the [Development](#development) section for guidelines on how to contribute.

**Current Team:**

- Joris Brugman (Lead Developer)
- Robin Hendrikx (UX Testing and Feedback)

## New Stratagem Procedure

### Automated Detection

A GitHub Actions workflow runs **every 24 hours** to automatically check for new stratagems:

1. **Wiki Scrape** — The workflow scrapes the [Helldivers Wiki Stratagems page](https://helldivers.wiki.gg/wiki/Stratagems) for all entries in the "Current Stratagems" section
2. **Compare** — It compares the wiki list against the local [data/stratagems.json](data/stratagems.json)
3. **Icon Fetch** — If new stratagems are found, it runs the icon update script to pull icons from the [upstream icon repository](https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg)
4. **Create PR** — A pull request is automatically created with the new stratagem data and icons

The workflow can also be triggered manually from the Actions tab. PRs created by the workflow **require manual review** — verify categories, subcategories, backpack flags, and direction codes before merging.

### Manual Procedure

When a new stratagem is added to Helldivers 2 that is not in this repository, follow these steps:

### 1. Gather Information

Collect the following details about the new stratagem:

- **Name** Exact name as shown in game
- **Stratagem Code** The arrow sequence (e.g., UP-DOWN-LEFT-RIGHT)
- **Category** One of: `eagle`, `orbital`, `support_weapon`, `backpack`, `sentry`, `emplacement`, `vehicle`
- **Subcategory** For support weapons: `standard` or `backpack_weapon`; for emplacements: `mine` or `static`
- **Warbond** Which Warbond makes it available (if any), and which page
- **Unlock Level** Minimum player level required
- **Cost** In-game cost (Requisition Points, Medals, or Warbond Points)
- **Associated Ship Module** If applicable
- **Icon/Image** Screenshot or icon of the stratagem

### 2. Update Stratagem Data

Edit [data/stratagems.json](data/stratagems.json) and add an entry following this format:

```json
{
  "id": "stratagem_id_in_snake_case",
  "name": "Stratagem Name",
  "code": ["up", "down", "left", "right"],
  "category": "eagle|orbital|support_weapon|backpack|sentry|emplacement|vehicle",
  "subcategory": "standard|backpack_weapon|mine|static|null",
  "requires_backpack": false,
  "cost_type": "requisition|medal|warbond_points",
  "cost_amount": 100,
  "unlock_level": 1,
  "ship_module": "name_of_module_or_null",
  "warbond": "Warbond Name or null",
  "warbond_page": "page_number_or_null"
}
```

**Important Notes:**

- Use lowercase with underscores for `id`
- The `code` array uses lowercase direction strings
- `subcategory` should be `null` for categories that don''t use it
- `warbond` and `warbond_page` should be `null` for stratagems not in a Warbond
- If the warbond doesn't exist in [data/warbonds.json](data/warbonds.json), add it there first

### 3. Add Icon/Asset

Place the stratagem icon in the appropriate folder under `data/icons/`:

```
data/icons/[Warbond Name]/
  [Stratagem Name]/
    icon.png (or relevant icon file)
```

For stratagems not in a Warbond, place them in the corresponding section folder if they belong to the Super Destroyer sections (Hangar, Engineering Bay, Bridge or Robotics Workshop):

```
data/icons/Hangar/
  [Stratagem Name]/
    icon.png
```

or

```
data/icons/Engineering Bay/
  [Stratagem Name]/
    icon.png
```

For stratagems not in a Warbond or special section, place them in:

```
data/icons/General Stratagems/
  [Stratagem Name]/
    icon.png
```

Note: The icon folders follow the naming convention of existing folders in the repository.

### 4. Verify Constraints

Ensure the changes respect game rules:

- If `requires_backpack: true`, the category should be `support_weapon` with `subcategory: backpack_weapon`
- If category is `backpack`, the backpack should not conflict with any `support_weapon` entries
- Verify the stratagem code is accurate (test in game if possible)

### 5. Test

1. Run the development server (`npm run dev`)
2. Verify the new stratagem appears in randomized loadouts
3. Test that it respects:
   - Correct Warbond filtering
   - Backpack exclusion rules
   - Level restrictions (if applicable)
4. Ensure it appears in the correct UI category

### 6. Submit Changes

1. Create a pull request with:
   - Updated `data/stratagems.json`
   - Updated `data/warbonds.json` (if new warbond was added)
   - New icon files in `data/icons/`
   - PR title: `feat: Add [Stratagem Name] stratagem`
   - PR description: Brief explanation of the new stratagem

2. Include:
   - Game patch/update version that added this stratagem
   - Link to game patch notes if available
   - Confirmation that you''ve tested it locally
