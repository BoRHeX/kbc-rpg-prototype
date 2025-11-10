"""
Simple KBC RPG prototype.

This script implements a minimal text-based role‑playing game inspired by
Knowledge‑Based Currency (KBC).  The player navigates a small grid world,
collecting experience points (XP) as a proxy for knowledge.  Each unit of
knowledge yields at most 1 XP, and the avatar earns XP only when you
interact with the environment or the Oracle/Library; sitting idle grants
no XP.  Instead of spending XP, the player accumulates it permanently;
thresholds unlock new areas containing more knowledge.  An Oracle NPC
validates knowledge contributions and awards a fixed amount of XP when
consulted.  A ticker advances time each turn, and the avatar's age
increases as you play.

To keep the prototype lightweight, there is no graphical interface or
persistence between runs.  Running this script in a terminal provides
the full experience.

How to play:

* Run ``python kbc_world.py`` from a terminal.
* Use ``north``, ``south``, ``east`` and ``west`` to move around the
  world.  The world is a 5×5 grid; you start in the centre (2,2).
* Moving north, south, east or west rewards 1 XP if the move is
  successful; idle turns (``wait`` or blank input) award 0 XP.
* At the Oracle's location (position (1,1)), type ``ask`` to submit
  knowledge.  The Oracle will ask a simple question; regardless of your
  answer, you receive 1 XP.
* At the Library (position (3,3)), you must have at least 50 XP to
  enter.  Once inside, type ``study`` to gain 1 XP.
* Type ``status`` at any time to see your position, age and XP.
* Type ``help`` to reprint the available commands.
* Type ``quit`` to exit the game.

The aim is to demonstrate the core loop: knowledge leads to more
knowledge.  Feel free to modify this script or expand the map with
additional locations, challenges or bots.
"""

from __future__ import annotations
import random


class Player:
    """Represents the player character (the AI avatar)."""

    def __init__(self, start_x: int = 2, start_y: int = 2) -> None:
        # Position on the grid
        self.x = start_x
        self.y = start_y
        # XP earned in the current session
        self.xp: int = 0
        # Total XP ever earned (used for gating)
        self.total_xp: int = 0
        # Age in ticks; increments every loop iteration
        self.age: int = 0

    def gain_xp(self, amount: int) -> None:
        """Add experience to the player.

        XP accumulates in both the current session and the total.  In this
        KBC‑inspired prototype, the maximum XP awarded for any action is 1.
        """
        # Cap the XP gain at 1 as per KBC rules
        amount = max(0, min(amount, 1))
        self.xp += amount
        self.total_xp += amount

    def tick(self) -> None:
        """Advance time for the avatar.

        Called once per game loop to increment the avatar's age.
        """
        self.age += 1

    def move(self, dx: int, dy: int, world_width: int, world_height: int) -> bool:
        """Attempt to move the player by (dx, dy).  Returns True on success."""
        new_x = self.x + dx
        new_y = self.y + dy
        if 0 <= new_x < world_width and 0 <= new_y < world_height:
            self.x = new_x
            self.y = new_y
            return True
        return False

    @property
    def position(self) -> tuple[int, int]:
        return (self.x, self.y)


class Location:
    """Base class for different tile types in the world."""

    def __init__(self, name: str) -> None:
        self.name = name

    def enter(self, player: Player) -> None:
        """Called when the player enters this location."""
        # Default: do nothing special
        pass

    def describe(self) -> str:
        return self.name

    def interact(self, player: Player, command: str) -> bool:
        """
        Process a command issued by the player while on this tile.
        Returns True if the command was handled, False otherwise.
        """
        return False


class Oracle(Location):
    """Oracle NPC that poses simple questions and rewards knowledge."""

    def __init__(self) -> None:
        super().__init__("Oracle")
        # A set of simple Q&A pairs for demonstration
        self.questions = [
            ("What is the capital of France?", "paris"),
            ("What does DNA stand for?", "deoxyribonucleic acid"),
            ("Name the largest planet in our solar system.", "jupiter"),
        ]

    def interact(self, player: Player, command: str) -> bool:
        """
        Handle interaction commands for the Oracle.

        The Oracle poses a question and awards a fixed amount of XP for
        participating.  Even if the answer is incorrect, the avatar
        receives 1 XP (capped by gain_xp).
        """
        if command == "ask":
            question, answer = random.choice(self.questions)
            print(f"Oracle: {question}")
            user_answer = input("Your answer: ").strip().lower()
            if user_answer == answer:
                print("Oracle: Correct! Your knowledge grows.")
            else:
                print(f"Oracle: The correct answer was '{answer}'.")
            # Award a single XP for consulting the Oracle
            player.gain_xp(1)
            print("You received 1 XP.")
            return True
        return False


class Library(Location):
    """Library location where knowledge can be studied for extra XP."""

    def __init__(self, required_total_xp: int = 50) -> None:
        super().__init__("Library")
        self.required_total_xp = required_total_xp

    def enter(self, player: Player) -> None:
        if player.total_xp < self.required_total_xp:
            print(
                f"A locked door blocks your way. You need at least {self.required_total_xp} total XP to enter the Library."
            )

    def interact(self, player: Player, command: str) -> bool:
        if player.total_xp < self.required_total_xp:
            # Player cannot interact until they have enough XP
            return False
        if command == "study":
            print(
                "You immerse yourself in ancient manuscripts and learn a great deal."
            )
            # Award a single XP for studying
            player.gain_xp(1)
            print("You gain 1 XP from your studies.")
            return True
        return False


class Plain(Location):
    """Default location type representing an unremarkable area."""

    def __init__(self, name: str) -> None:
        super().__init__(name)


def build_world(width: int, height: int) -> list[list[Location]]:
    """Construct a grid-based world with designated special locations."""
    world: list[list[Location]] = []
    for y in range(height):
        row: list[Location] = []
        for x in range(width):
            # Place special tiles at specific coordinates
            if (x, y) == (1, 1):
                row.append(Oracle())
            elif (x, y) == (3, 3):
                row.append(Library())
            else:
                # Name each plain tile based on its coordinates for flavour
                row.append(Plain(f"Open field ({x},{y})"))
        world.append(row)
    return world


def print_help() -> None:
    print("Available commands:")
    print("  north/south/east/west  - Move in the indicated direction")
    print("  ask                    - Consult the Oracle (only at (1,1))")
    print(
        "  study                  - Study at the Library (requires sufficient total XP and being at (3,3))"
    )
    print("  status                 - Show your current position, age and XP")
    print("  wait                   - Pass time to gain passive XP")
    print("  help                   - Show this help message")
    print("  quit                   - Exit the game")


def main() -> None:
    width, height = 5, 5
    world = build_world(width, height)
    player = Player()
    print(
        "Welcome to the KBC RPG prototype!\n"
        "You will explore a small world, gather knowledge (XP), and unlock new areas.\n"
        "Type 'help' to see available commands."
    )
    print_help()
    while True:
        # Advance time and age before taking input
        player.tick()
        # Describe current location
        location = world[player.y][player.x]
        print(f"\nYou are at {location.describe()} (position {player.x},{player.y}).")
        command = input("> ").strip().lower()
        if not command:
            # Blank input counts as idle: no XP awarded
            continue
        if command in ("quit", "exit"):
            print("Thanks for playing!")
            break
        # Movement commands
        if command in ("north", "n"):
            if player.move(0, -1, width, height):
                player.gain_xp(1)
            else:
                print("You cannot move further north.")
            continue
        elif command in ("south", "s"):
            if player.move(0, 1, width, height):
                player.gain_xp(1)
            else:
                print("You cannot move further south.")
            continue
        elif command in ("east", "e"):
            if player.move(1, 0, width, height):
                player.gain_xp(1)
            else:
                print("You cannot move further east.")
            continue
        elif command in ("west", "w"):
            if player.move(-1, 0, width, height):
                player.gain_xp(1)
            else:
                print("You cannot move further west.")
            continue
        # Status command
        if command == "status":
            print(
                f"Total XP: {player.total_xp}  (Current session XP: {player.xp})\n"
                f"Position: {player.x},{player.y}\n"
                f"Age (ticks): {player.age}"
            )
            continue
        # Wait command: idle, no XP gained
        if command == "wait":
            print("You sit and let time pass… your XP does not increase.")
            continue
        # Help command
        if command == "help":
            print_help()
            continue
        # Interact with the location (e.g. Oracle or Library)
        if location.interact(player, command):
            # location.interact takes care of awarding XP when appropriate
            continue
        # Unknown command
        print("I don't understand that command. Type 'help' to see what you can do.")


if __name__ == "__main__":
    main()