# **App Name**: Corner Conquest

## Core Features:

- Map Generation: Generate a random square map with four corner islands as player bases and hidden center islands containing resources or monsters. The combination of mines and monsters should change each game.
- Island Discovery: Reveal hidden islands upon player arrival, making their resources/monsters visible to all players. Discovery islands also provide victory points.
- Resource Mining: Allow players to mine gold, gems, or iron from resource islands, with up to two players mining the same resource simultaneously. Players must deploy armies to mining locations before mining. Mining from the mine gives 1 resource for each piece of the army that occupies a mine field.
- Monster Combat: Enable players to fight 'little' or 'big' monsters on islands. Islands can have at most two monsters, with 'big' monsters always accompanied by 'little' monsters and 'little' monsters able to be accompanied by either 'little' or 'big' monsters. Combat uses the same dice-roll mechanic as player combat. 'Cub' little monsters roll 2 dice, 'huge' little monsters roll 3 dice, 'cub' big monsters roll 3 dice, and 'huge' big monsters roll 4 dice. Players can choose whether to fight upon discovering a monster island. Winning grants victory points. This logic will be incorporated with an LLM as a tool for determing when monsters may appear and which types of monsters.
- Player Combat: Initiate turn-based combat when players occupy the same island. Dice rolls, modified by army power, determine the outcome. Losing players are sent back to their base. One of the special card should be for the player to define already which one is the result of one dice in the fight with another player.
- Army Upgrades: Allow players to spend iron to increase their army size, gaining additional dice rolls in combat (e.g., 4 iron for +1 dice).
- Victory Point System: Award victory points based on mined resources, island control, and defeating monsters. Game ends when a resource is depleted or a player reaches a set point threshold (e.g., 100 points). The amount of resources should be balanced on the amount of players that are in play. When 1 resource finishes the player with more victory points wins the game and at screen should appear {{name_of_the_player}} won!!
- Base Mining Fields: Each base has single-space mining fields for gems, gold, and iron.
- Action Restrictions: Players cannot repeat the action taken in the previous turn.
- Special Cards: Discoverable islands provide a special card upon initial discovery, granting victory points. Additional cards can be farmed on these islands, offering victory points, temporary/permanent army power boosts, or free resources. Same works for the special islands that gives card, only 1 card is generated per army put on the island And that island can only have 1 spot for the player to put their army to farm it.
- Player Actions: Each round, players can choose one action: deploy army to mine, mine resources, move (up to 2 spaces), attack another player on the same tile, or farm for a special card.
- Online Connectivity and Data Storage: Players should be able to connect online to play the game, and the information about victory points, resources, and locations of the players should be stored on Firebase.

## Style Guidelines:

- Primary color: Deep Blue (#3F51B5) to evoke a sense of strategy and control, similar to a command center interface. The choice of blue represents strategy, intelligence, and authority, reflecting the game's focus on planning and tactical decisions.
- Background color: Dark Gray (#303030) to maintain focus on the map and game elements in a dark color scheme.
- Accent color: Bright Yellow (#FFEB3B) for highlighting interactive elements and important resources. It provides a visual cue for actionable items and strategic points of interest on the map.
- Body and headline font: 'Inter' sans-serif font for clear legibility on maps and in user interfaces.
- Use simple, geometric icons to represent resources (gold, gems, iron) and monster types on the map.
- Arrange UI elements around the map edge. Place player information (resources, army size, points) at the top corners.
- Use smooth transitions when revealing hidden islands or zooming in on combat events.