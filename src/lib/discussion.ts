import { fmt, outsideAvg, groupAvg, spread } from "./stats"
import type { Movie } from "./types"

export type Theme = {
  id: string
  label: string
  /** TMDB keywords and genres that point at this theme (matched as whole words or phrases, any case) */
  match: string[]
  questions: [string, string, string]
}

/** Themes and the questions that go with them. A film gets the few that its TMDB keywords, genres and synopsis point at. */
export const THEMES: Theme[] = [
  { id: "justice", label: "Justice and the law", match: ["justice", "trial", "court", "lawyer", "judge", "crime", "murder", "detective", "police", "prison", "law", "investigation", "serial killer"], questions: [
    "Does this film believe justice is possible, or only revenge and punishment? Which scene settles that for you?",
    "Who is held accountable in this story, and who escapes it? Is that fair, or just how the world works?",
    "If you were on the jury for the central act, what would you decide, and what would you need to know first?"] },
  { id: "revenge", label: "Revenge", match: ["revenge", "vengeance", "retribution", "vigilante", "payback"], questions: [
    "Does revenge give the character what they want? What does it cost them?",
    "At what point does the avenger become the thing they hate?",
    "Is there a version of this story where forgiveness is the braver choice? Would it make a better film?"] },
  { id: "war", label: "War and violence", match: ["war", "soldier", "battle", "military", "combat", "army", "violence", "world war ii", "vietnam war", "samurai", "massacre"], questions: [
    "Does the film make war look glorious, pointless, or necessary? Which choices in the filming tell you?",
    "Which character do you judge hardest for what they do under orders or pressure? Would you have done differently?",
    "What does the film say about the people who survive compared with the people who die?"] },
  { id: "identity", label: "Identity", match: ["identity", "doppelganger", "double", "amnesia", "transformation", "self-discovery", "identity crisis", "impostor", "disguise"], questions: [
    "Who is the main character at the start, and who are they at the end? What actually changed: them, or what they know about themselves?",
    "How much of who we are comes from our choices, and how much from how others see us?",
    "If the character could swap lives with someone else in the film, who, and what would they find?"] },
  { id: "memory", label: "Memory and time", match: ["memory", "time travel", "dream", "flashback", "nostalgia", "past", "time loop", "dementia", "memories"], questions: [
    "Can we trust the way this story is told? Which moments might be remembered or imagined, not real?",
    "What does the character most want to keep, or forget, and what does the film think of that wish?",
    "Does looking back heal anyone in this film, or trap them?"] },
  { id: "class", label: "Class and money", match: ["poverty", "wealth", "class", "rich", "poor", "money", "capitalism", "inequality", "social class", "class differences", "working class", "debt"], questions: [
    "Who has power in this film, and where does it come from: money, family, law, force?",
    "Does the film sympathize with the rich, the poor, or no one? How can you tell?",
    "What would these characters do differently with each other's resources?"] },
  { id: "faith", label: "Faith and meaning", match: ["religion", "god", "faith", "priest", "church", "spirituality", "christianity", "buddhism", "monk", "nun", "religious", "afterlife", "devil"], questions: [
    "Is faith a comfort, a trap, or a test in this story? Does the film take a side?",
    "What does the film suggest about how people find meaning when nothing explains their suffering?",
    "Which character acts most like they truly believe something, and is it religion?"] },
  { id: "death", label: "Death and grief", match: ["death", "dying", "grief", "funeral", "terminal illness", "mortality", "suicide", "loss of loved one", "cancer", "widow"], questions: [
    "How does knowing about death change what each character does? Who lives more fully because of it?",
    "What does the film do with grief: heal it, honor it, or refuse to resolve it?",
    "Does the film suggest a good way to die, and what would that say about how to live?"] },
  { id: "love", label: "Love and relationships", match: ["love", "romance", "marriage", "affair", "relationship", "couple", "wedding", "infidelity", "love triangle", "divorce", "romantic"], questions: [
    "What kind of love is this film about: need, habit, passion, duty? Which one lasts?",
    "Who gives more in the central relationship, and does it matter?",
    "Did the leads belong together? What would have to be different?"] },
  { id: "family", label: "Family", match: ["family", "father", "mother", "sibling", "parent", "son", "daughter", "brother", "sister", "generation", "father son relationship", "mother daughter relationship", "family relationships"], questions: [
    "What does this family owe each other, and who is failing at it?",
    "What do the children inherit that nobody meant to give them?",
    "Which family member do you understand best by the end, and which do you understand less than the film wants you to?"] },
  { id: "power", label: "Power and corruption", match: ["corruption", "politics", "power", "dictator", "government", "conspiracy", "political", "mafia", "gangster", "organized crime", "gang", "crime boss", "assassination"], questions: [
    "How does power change the people who get it? Is there a moment where you can see it happen?",
    "Does anyone in the film stay honest, and what does it cost them?",
    "What would it take for the system in this film to work fairly?"] },
  { id: "art", label: "Art and creativity", match: ["artist", "painter", "music", "musician", "writer", "filmmaking", "art", "creativity", "poet", "theater", "film director", "singer", "band", "actor"], questions: [
    "What does this film say art is for: expression, escape, a living, a record?",
    "Does genius excuse bad behavior in this story? Does the film think so?",
    "Which scene is the film proudest of, as filmmaking, and why?"] },
  { id: "obsession", label: "Obsession and madness", match: ["obsession", "madness", "insanity", "paranoia", "stalker", "psychological", "delusion", "mental illness", "psychosis", "psychological thriller"], questions: [
    "When does determination turn into obsession for the main character? Is there a line?",
    "Who around them could have stopped it, and didn't?",
    "Does the film want you to understand the obsession, share it, or fear it?"] },
  { id: "freedom", label: "Freedom and rebellion", match: ["freedom", "rebellion", "escape", "prison escape", "revolution", "resistance", "oppression", "slavery", "dictatorship", "uprising", "totalitarianism"], questions: [
    "What does freedom mean to each character, and who actually gets it?",
    "Is rebelling in this film brave, naive, or both?",
    "What would you give up to be free in the way this film imagines?"] },
  { id: "technology", label: "Technology and the future", match: ["artificial intelligence", "robot", "technology", "computer", "cyberpunk", "android", "surveillance", "virtual reality", "science fiction", "dystopia", "future", "space", "alien", "post-apocalyptic"], questions: [
    "What does the film think technology changes about being human, and what stays the same?",
    "Who benefits from the future shown here, and who pays?",
    "Is this world a warning, a prediction, or a mirror of today?"] },
  { id: "nature", label: "Nature and survival", match: ["nature", "animal", "environment", "wilderness", "forest", "ocean", "survival", "island", "desert", "mountain", "sea", "shark", "storm"], questions: [
    "How does the setting act like a character? What does it do to the people in it?",
    "Is nature indifferent, hostile, or sacred here? Which shots give it away?",
    "What does survival strip away from the characters?"] },
  { id: "race", label: "Race, colonialism and prejudice", match: ["colonialism", "racism", "race", "segregation", "immigration", "apartheid", "civil rights", "discrimination", "prejudice", "slum", "favela"], questions: [
    "Whose point of view are we given, and whose is missing?",
    "How does the film show prejudice: in big acts or small habits? Which is harder to watch?",
    "What would repair or justice look like for the people in this story?"] },
  { id: "gender", label: "Gender and sexuality", match: ["feminism", "gender", "lgbt", "queer", "women", "sexuality", "patriarchy", "gay", "lesbian", "transgender", "sexism"], questions: [
    "What expectations does the film put on its characters because of gender, and who pushes against them?",
    "How would this story change if the main character were a different gender?",
    "Does the film let its characters be complicated, or does it use them as symbols?"] },
  { id: "loneliness", label: "Loneliness", match: ["loneliness", "isolation", "solitude", "alienation", "hermit", "outsider", "exile", "lonely"], questions: [
    "Is the character alone by choice, by circumstance, or by their own doing? Does the film blame anyone?",
    "Which small moments of connection matter most?",
    "What does the film think loneliness is for: protection, punishment, or the start of something?"] },
  { id: "ambition", label: "Ambition and greed", match: ["ambition", "success", "fame", "career", "sports", "competition", "boxing", "gambling", "greed", "boxer", "rise to power", "wall street"], questions: [
    "What does winning cost the main character? Was it worth it?",
    "Is the ambition admirable, empty, or both?",
    "Who gets used or left behind on the way up?"] },
  { id: "truth", label: "Truth and perception", match: ["truth", "lies", "deception", "unreliable narrator", "mystery", "conspiracy", "secret", "twist", "whodunit", "con artist", "scam", "heist"], questions: [
    "Whose version of events do you believe, and what makes you trust them?",
    "What does the film suggest about whether we can ever know what really happened?",
    "After the reveal, which earlier scene did you re-read?"] },
  { id: "guilt", label: "Guilt and redemption", match: ["guilt", "moral dilemma", "redemption", "sin", "betrayal", "conscience", "forgiveness", "thief", "criminal", "ex-convict"], questions: [
    "What is the central wrong in this film, and who carries the guilt?",
    "Is redemption possible here? Do the characters earn it?",
    "Whose choices do you excuse that you probably shouldn't? Why?"] },
  { id: "fate", label: "Fate and choice", match: ["fate", "destiny", "prophecy", "tragedy", "free will", "coincidence", "chance", "doomed"], questions: [
    "Do the characters have a real choice, or is the ending set from the start?",
    "Which decision, if changed, would have changed everything?",
    "Is this a world where trying matters?"] },
  { id: "youth", label: "Childhood and growing up", match: ["childhood", "children", "coming of age", "school", "teenager", "orphan", "innocence", "growing up", "boy", "girl", "child", "teen"], questions: [
    "What does the film think is lost when someone grows up? What is gained?",
    "How do the adults look from the child's point of view?",
    "What is the film's most honest moment about being young?"] },
  { id: "satire", label: "Satire and absurdity", match: ["absurd", "satire", "parody", "black comedy", "slapstick", "comedy", "dark comedy", "spoof", "mockumentary"], questions: [
    "What is the film making fun of, and is it fair?",
    "Where does the joke turn serious, and does it still work?",
    "What here is funny that probably wouldn't be made today, or would be made differently?"] },
  { id: "fear", label: "Fear and horror", match: ["horror", "fear", "monster", "ghost", "supernatural", "haunted", "slasher", "zombie", "vampire", "demon", "occult", "gore", "terror"], questions: [
    "What is the real fear underneath the monster or ghost: loss, shame, change, the body, other people?",
    "Did the film scare you with what it showed or what it held back?",
    "Who survives, and what does the film say about why?"] },
  { id: "place", label: "Place and journey", match: ["city", "small town", "rural", "journey", "road trip", "travel", "road movie", "village", "new york city", "paris, france", "tokyo, japan", "los angeles"], questions: [
    "How does the place shape these people? Could this story happen anywhere else?",
    "What does the journey change for the characters, and what does it leave the same?",
    "Which location do you remember most, and what did it make you feel?"] },
  { id: "loyalty", label: "Friendship and loyalty", match: ["friendship", "loyalty", "brotherhood", "buddy", "partner", "team", "best friend", "friends"], questions: [
    "What does each friend owe the other, and where does loyalty break?",
    "Who is the better friend, and who thinks they are?",
    "What would you forgive a friend for that these characters can't?"] },
  { id: "history", label: "History and how it's told", match: ["historical", "based on true story", "biography", "holocaust", "cold war", "history", "period drama", "feudal", "ancient", "world war i", "biopic", "true story"], questions: [
    "What does the film choose to emphasize, or leave out, of the history it tells?",
    "How much do we owe the real people in a story like this, versus the story?",
    "What present-day situation does this past remind you of?"] },
]

/** Questions that fit almost any film, for the craft and for what it leaves with you. */
export const GENERAL = [
  "What is this film about underneath what happens in it? Try saying it in one sentence.",
  "Which scene would you show someone to explain why this film is good, or why it isn't?",
  "How did the ending leave you: satisfied, unsettled, cheated? What would you change?",
  "What did the director want you to feel in the first shot and in the last?",
  "Which performance carried the film, and what did that actor do that the others didn't?",
  "What would you cut, and what do you wish had more time?",
  "Did the film change how you see something? What?",
  "Who is the real main character, even if it isn't the lead?",
  "What does the title mean by the end that it didn't at the start?",
  "How do the music, or the silence, shape what you feel?",
]

export type Film = { keywords: string[]; genres: string[]; overview: string }

const lower = (s: string) => s.toLowerCase()
const has = (text: string, term: string) => new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(text)

/** The themes a film points at, strongest first. A matching TMDB keyword counts most, then a genre, then a word in the synopsis. */
export function themesFor(f: Film, limit = 3): Theme[] {
  const kws = f.keywords.map(lower), gs = f.genres.map(lower), ov = lower(f.overview)
  return THEMES
    .map((t, order) => {
      let score = 0
      for (const m of new Set(t.match)) {
        if (kws.some(k => k === m || has(k, m))) score += 3
        if (gs.includes(m)) score += 1
        if (ov && has(ov, m)) score += 1
      }
      return { t, score, order }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(x => x.t)
}

export type Question = { text: string; about: string }

/**
 * Discussion questions for a film: two for each theme it points at, two general ones, and a few about how this club rated it.
 * `shuffle` changes which questions come up, so tapping "another set" gives fresh ones from the same themes.
 */
export function questionsFor(f: Film, club: string[] = [], shuffle = 0): { themes: Theme[]; questions: Question[] } {
  const themes = themesFor(f)
  const qs: Question[] = themes.flatMap(t => [0, 1].map(k => ({ text: t.questions[(shuffle + k) % 3], about: t.label })))
  const picks = [0, 1].map(k => GENERAL[(shuffle * 2 + k) % GENERAL.length])
  qs.push(...picks.map(text => ({ text, about: "The film itself" })), ...club.map(text => ({ text, about: "This club" })))
  return { themes, questions: qs }
}

/** Questions that come from how the club rated this film: where it split, where it parted from the world, who picked it. */
export function clubQuestions(m: Movie): string[] {
  const out: string[] = []
  const r = Object.entries(m.ratings).sort((a, b) => b[1] - a[1])
  if (r.length >= 3 && spread(m) >= 1.2) out.push(`${r[0][0]} gave this ${r[0][1]} and ${r[r.length - 1][0]} gave it ${r[r.length - 1][1]}. Each of you: make the case for the other's rating.`)
  const o = outsideAvg(m), g = groupAvg(m)
  if (o != null && g != null && Math.abs(g - o) >= 0.8) out.push(`Outside ratings average ${fmt(o, 1)} and the club gave ${fmt(g, 1)}. What did you see, or miss, that everyone else didn't?`)
  if (m.pick) out.push(`${m.pick} picked this one. What did you hope we'd get out of it, and did it land?`)
  return out
}
