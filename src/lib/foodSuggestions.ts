// Suggested Thanksgiving items. Lives in code (no DB table), so editing this
// list never touches anyone's saved entries. An item counts as covered when
// any food entry's text matches one of its keywords (whole-word, case-insensitive).

export type Suggestion = { name: string; keywords: string[]; exclude?: string[] };
export type Category = { name: string; icon: string; items: Suggestion[] };

export const FOOD_CATEGORIES: Category[] = [
  {
    name: "Mains",
    icon: "🍗",
    items: [
      { name: "Turkey", keywords: ["turkey"] },
      { name: "Ham", keywords: ["ham"] },
      { name: "Vegetarian main", keywords: ["vegetarian", "vegan", "tofu", "tofurky", "veggie main", "lasagna"] },
    ],
  },
  {
    name: "Sides",
    icon: "🥔",
    items: [
      { name: "Mashed potatoes", keywords: ["mashed", "mash"] },
      { name: "Stuffing", keywords: ["stuffing", "dressing"] },
      { name: "Gravy", keywords: ["gravy"] },
      { name: "Mac & cheese", keywords: ["mac", "macaroni"] },
      { name: "Green bean casserole", keywords: ["green bean", "green beans"] },
      { name: "Sweet potatoes", keywords: ["sweet potato", "sweet potatoes", "yams", "yam"] },
      { name: "Cranberry sauce", keywords: ["cranberry", "cranberries"] },
      { name: "Rolls / bread", keywords: ["rolls", "roll", "bread", "biscuits", "cornbread"] },
      { name: "Salad", keywords: ["salad"] },
      { name: "Roasted veggies", keywords: ["veggies", "vegetables", "brussels", "carrots", "corn on the cob"] },
    ],
  },
  {
    name: "Desserts",
    icon: "🥧",
    items: [
      { name: "Pumpkin pie", keywords: ["pumpkin"] },
      { name: "Apple pie", keywords: ["apple pie"] },
      { name: "Pecan pie", keywords: ["pecan"] },
      { name: "Cookies / brownies", keywords: ["cookie", "cookies", "brownie", "brownies"] },
      { name: "Whipped cream / ice cream", keywords: ["whipped", "cool whip", "ice cream"] },
    ],
  },
  {
    name: "Drinks",
    icon: "🥤",
    items: [
      { name: "Soda", keywords: ["soda", "pop", "coke", "sprite", "ginger ale", "root beer", "dr pepper"] },
      { name: "Juice / cider", keywords: ["juice", "cider", "lemonade"] },
      { name: "Water / sparkling water", keywords: ["water", "la croix", "lacroix"] },
      { name: "Ice", keywords: ["ice"], exclude: ["ice cream"] },
    ],
  },
  {
    name: "Supplies",
    icon: "🍽️",
    items: [
      { name: "Plates & bowls", keywords: ["plates", "plate", "bowls"] },
      { name: "Cups", keywords: ["cups", "cup"] },
      { name: "Utensils", keywords: ["utensils", "forks", "silverware", "cutlery"] },
      { name: "Napkins / paper towels", keywords: ["napkins", "paper towels"] },
      { name: "Foil & containers for leftovers", keywords: ["foil", "containers", "tupperware", "ziploc", "to-go"] },
      { name: "Trash bags", keywords: ["trash", "garbage"] },
    ],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matches(item: Suggestion, text: string) {
  // Exact claim via the button always matches its own item.
  if (text.trim().toLowerCase() === item.name.toLowerCase()) return true;
  // Strip excluded phrases first (e.g. "ice cream" shouldn't count as Ice).
  const cleaned = (item.exclude ?? []).reduce(
    (t, x) => t.replace(new RegExp(escape(x), "gi"), " "),
    text,
  );
  return item.keywords.some((k) => new RegExp(`\\b${escape(k)}\\b`, "i").test(cleaned));
}
