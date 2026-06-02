export interface SlotGame {
  name: string;
  provider: string;
  image: string; // CDN thumbnail URL
}

// Pragmatic Play CDN base
const PP = (code: string) =>
  `https://pp-slot-cdn.pragmaticplay.net/game-icons/gs2c/square/${code}.png`;

export const SLOT_GAMES: SlotGame[] = [
  // ─── Pragmatic Play ───────────────────────────────────────────────────────
  { name: "Sweet Bonanza", provider: "Pragmatic Play", image: PP("vs20sugarhits") },
  { name: "Gates of Olympus", provider: "Pragmatic Play", image: PP("vs20olympgate") },
  { name: "Big Bass Bonanza", provider: "Pragmatic Play", image: PP("vs10bigbass") },
  { name: "Dog House Megaways", provider: "Pragmatic Play", image: PP("vswaysdogs") },
  { name: "The Dog House", provider: "Pragmatic Play", image: PP("vs20doghouse") },
  { name: "Starlight Princess", provider: "Pragmatic Play", image: PP("vs20starlight") },
  { name: "Wolf Gold", provider: "Pragmatic Play", image: PP("vs25wolfgold") },
  { name: "Wild West Gold", provider: "Pragmatic Play", image: PP("vs40wildwest") },
  { name: "Fruit Party", provider: "Pragmatic Play", image: PP("vs20fruitparty") },
  { name: "Chilli Heat", provider: "Pragmatic Play", image: PP("vs25chilliheat") },
  { name: "Aztec Gems", provider: "Pragmatic Play", image: PP("vs5aztecgems") },
  { name: "Gems Bonanza", provider: "Pragmatic Play", image: PP("vswaysgem") },
  { name: "Release the Kraken", provider: "Pragmatic Play", image: PP("vs20kraken") },
  { name: "Mustang Gold", provider: "Pragmatic Play", image: PP("vs25mustang") },
  { name: "Juicy Fruits", provider: "Pragmatic Play", image: PP("vs20juicyfr") },
  { name: "Floating Dragon", provider: "Pragmatic Play", image: PP("vs20floatdrg") },
  { name: "Hot to Burn", provider: "Pragmatic Play", image: PP("vs20hotburn") },
  { name: "Peking Luck", provider: "Pragmatic Play", image: PP("vs20pekinglu") },
  { name: "5 Lions Gold", provider: "Pragmatic Play", image: PP("vs50lionsgold") },
  { name: "Lucky Lightning", provider: "Pragmatic Play", image: PP("vs20luckyligh") },
  { name: "Money Mouse", provider: "Pragmatic Play", image: PP("vs25moneymouse") },
  { name: "Magic Journey", provider: "Pragmatic Play", image: PP("vs25magicjourn") },
  { name: "Leprechaun Song", provider: "Pragmatic Play", image: PP("vs20leprecoins") },
  { name: "Da Vinci's Treasure", provider: "Pragmatic Play", image: PP("vs25davinci") },
  { name: "3 Kingdoms", provider: "Pragmatic Play", image: PP("vs25kingdoms") },
  { name: "Great Rhino Megaways", provider: "Pragmatic Play", image: PP("vswaysrhino") },
  { name: "Power of Thor Megaways", provider: "Pragmatic Play", image: PP("vswaysftropics") },
  { name: "Jokers Jewels", provider: "Pragmatic Play", image: PP("vs5joker") },
  { name: "Buffalo King Megaways", provider: "Pragmatic Play", image: PP("vswaysbufking") },
  { name: "Pirate Gold Deluxe", provider: "Pragmatic Play", image: PP("vs40pirate") },
  { name: "Book of Fallen", provider: "Pragmatic Play", image: PP("vs10bookoftut") },
  { name: "Barn Festival", provider: "Pragmatic Play", image: PP("vs20barnfest") },
  { name: "Eye of Cleopatra", provider: "Pragmatic Play", image: PP("vs20eyeofcleo") },
  { name: "Fire Strike", provider: "Pragmatic Play", image: PP("vs1firestrike") },
  { name: "Curse of the Werewolf Megaways", provider: "Pragmatic Play", image: PP("vswayswwriches") },
  { name: "Cash Elevator", provider: "Pragmatic Play", image: PP("vs20cashelev") },
  { name: "Christmas Carol Megaways", provider: "Pragmatic Play", image: PP("vswayschristmas") },
  { name: "Drill That Gold", provider: "Pragmatic Play", image: PP("vs20drillgold") },
  { name: "Big Bass Splash", provider: "Pragmatic Play", image: PP("vs10txbigbass") },
  { name: "Rainbow Gold", provider: "Pragmatic Play", image: PP("vs5rainbowgold") },

  // ─── Push Gaming ─────────────────────────────────────────────────────────
  { name: "Jammin Jars", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/jammin-jars.jpg" },
  { name: "Jammin Jars 2", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/jammin-jars-2.jpg" },
  { name: "Fat Rabbit", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/fat-rabbit.jpg" },
  { name: "Fat Santa", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/fat-santa.jpg" },
  { name: "Razor Shark", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/razor-shark.jpg" },
  { name: "Wild Swarm", provider: "Push Gaming", image: "https://cdn.casinoreviews.net/slot-images/wild-swarm.jpg" },
  { name: "Reactoonz", provider: "Play'n GO", image: "https://cdn.casinoreviews.net/slot-images/reactoonz.jpg" },
  { name: "Book of Dead", provider: "Play'n GO", image: "https://cdn.casinoreviews.net/slot-images/book-of-dead.jpg" },

  // ─── Big Time Gaming ─────────────────────────────────────────────────────
  { name: "Bonanza Megaways", provider: "BTG", image: "https://cdn.casinoreviews.net/slot-images/bonanza-megaways.jpg" },
  { name: "Extra Chilli Megaways", provider: "BTG", image: "https://cdn.casinoreviews.net/slot-images/extra-chilli.jpg" },
  { name: "White Rabbit Megaways", provider: "BTG", image: "https://cdn.casinoreviews.net/slot-images/white-rabbit.jpg" },
  { name: "Megaways Jack", provider: "BTG", image: "https://cdn.casinoreviews.net/slot-images/megaways-jack.jpg" },

  // ─── Hacksaw Gaming ───────────────────────────────────────────────────────
  { name: "Stick 'Em", provider: "Hacksaw Gaming", image: "https://cdn.casinoreviews.net/slot-images/stick-em.jpg" },
  { name: "Chaos Crew", provider: "Hacksaw Gaming", image: "https://cdn.casinoreviews.net/slot-images/chaos-crew.jpg" },
  { name: "Wanted Dead or a Wild", provider: "Hacksaw Gaming", image: "https://cdn.casinoreviews.net/slot-images/wanted-dead-or-a-wild.jpg" },

  // ─── NetEnt ────────────────────────────────────────────────────────────────
  { name: "Starburst", provider: "NetEnt", image: "https://cdn.casinoreviews.net/slot-images/starburst.jpg" },
  { name: "Dead or Alive 2", provider: "NetEnt", image: "https://cdn.casinoreviews.net/slot-images/dead-or-alive-2.jpg" },

  // ─── Nolimit City ─────────────────────────────────────────────────────────
  { name: "Mental", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/mental.jpg" },
  { name: "xWays Hoarder", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/xways-hoarder.jpg" },
  { name: "Fire in the Hole", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/fire-in-the-hole.jpg" },
  { name: "San Quentin xWays", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/san-quentin.jpg" },
  { name: "Tombstone RIP", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/tombstone-rip.jpg" },
  { name: "Punk Rocker", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/punk-rocker.jpg" },
  { name: "Deadwood", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/deadwood.jpg" },
  { name: "Serial", provider: "Nolimit City", image: "https://cdn.casinoreviews.net/slot-images/serial.jpg" },

  // ─── Relax Gaming ─────────────────────────────────────────────────────────
  { name: "Money Train 2", provider: "Relax Gaming", image: "https://cdn.casinoreviews.net/slot-images/money-train-2.jpg" },
  { name: "Money Train 3", provider: "Relax Gaming", image: "https://cdn.casinoreviews.net/slot-images/money-train-3.jpg" },
  { name: "Snake Arena", provider: "Relax Gaming", image: "https://cdn.casinoreviews.net/slot-images/snake-arena.jpg" },

  // ─── Elk Studios ──────────────────────────────────────────────────────────
  { name: "Wild Toro", provider: "Elk Studios", image: "https://cdn.casinoreviews.net/slot-images/wild-toro.jpg" },

  // ─── 1x2 Gaming ───────────────────────────────────────────────────────────
  { name: "Gems Gone Wild", provider: "1x2 Gaming", image: "https://cdn.casinoreviews.net/slot-images/gems-gone-wild.jpg" },
];

export function searchSlots(query: string): SlotGame[] {
  if (!query.trim()) return SLOT_GAMES;
  const q = query.toLowerCase();
  return SLOT_GAMES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q)
  );
}

export function findSlot(name: string): SlotGame | undefined {
  return SLOT_GAMES.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
