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
    "Is there such a thing as justice in this story, or just whoever ends up holding the power?",
    "Who here gets away with something, and who pays for something they didn't do? Does that feel like how the world actually works?",
    "If it were up to you what happens to the person at the center of this, what would you want to know first?"] },
  { id: "revenge", label: "Revenge", match: ["revenge", "vengeance", "retribution", "vigilante", "payback"], questions: [
    "Did getting even give them anything back? What did they actually need instead?",
    "Where's the point where someone chasing a wrong turns into the thing they're chasing?",
    "Would forgiving have taken more courage than what they did? Could you?"] },
  { id: "war", label: "War and violence", match: ["war", "soldier", "battle", "military", "combat", "army", "violence", "world war ii", "vietnam war", "samurai", "massacre"], questions: [
    "Does anything here make war look worth it? What would someone on the other side say?",
    "Think of the person you judged hardest for what they did under pressure. What would you have done, honestly?",
    "What do the people who make it out carry that the ones who don't never have to?"] },
  { id: "identity", label: "Identity", match: ["identity", "doppelganger", "double", "amnesia", "transformation", "self-discovery", "identity crisis", "impostor", "disguise"], questions: [
    "Is the person at the start of the film the same person at the end? What changed, them or what they know?",
    "How much of who you are is your choices, and how much is how other people see you?",
    "If you could swap places with someone in this film for a week, who, and what would you find out?"] },
  { id: "memory", label: "Memory and time", match: ["memory", "time travel", "dream", "flashback", "nostalgia", "past", "time loop", "dementia", "memories"], questions: [
    "Do you trust how this story is being told to you? Which parts might be a memory, a dream, or a lie?",
    "What would you least want to forget, and what would you pay to forget? Does the film sit with either?",
    "Does looking back heal anyone here, or keep them stuck?"] },
  { id: "class", label: "Class and money", match: ["poverty", "wealth", "class", "rich", "poor", "money", "capitalism", "inequality", "social class", "class differences", "working class", "debt"], questions: [
    "Who has power here, and where did it come from? Did they earn it?",
    "Whose side did you end up on, the rich, the poor, or no one? When did you decide?",
    "What would these people do if they swapped bank accounts for a year?"] },
  { id: "faith", label: "Faith and meaning", match: ["religion", "god", "faith", "priest", "church", "spirituality", "christianity", "buddhism", "monk", "nun", "religious", "afterlife", "devil"], questions: [
    "Is believing in something a comfort or a trap for these people? Did the film tell you what it thinks?",
    "When nothing explains why people suffer, what do they reach for? Is it enough?",
    "Who here acts like they truly believe something, and is it what they say they believe?"] },
  { id: "death", label: "Death and grief", match: ["death", "dying", "grief", "funeral", "terminal illness", "mortality", "suicide", "loss of loved one", "cancer", "widow"], questions: [
    "Does knowing time runs out change how anyone here lives? Who lives more because of it?",
    "How would you want to be grieved, or not grieved? Does the film offer a way that feels right?",
    "Is there a good way to die, and what would it say about how to live?"] },
  { id: "love", label: "Love and relationships", match: ["love", "romance", "marriage", "affair", "relationship", "couple", "wedding", "infidelity", "love triangle", "divorce", "romantic"], questions: [
    "What kind of love is this: need, habit, passion, duty? Which one lasts?",
    "Who gives more in this relationship, and does it have to be even?",
    "Do these two belong together, or did they just show up at the same time?"] },
  { id: "family", label: "Family", match: ["family", "father", "mother", "sibling", "parent", "son", "daughter", "brother", "sister", "generation", "father son relationship", "mother daughter relationship", "family relationships"], questions: [
    "What do these people owe each other just for being family? Who's failing at it?",
    "What gets handed down here that nobody meant to give?",
    "Which relative do you understand best by the end, and which one do you still not get?"] },
  { id: "power", label: "Power and corruption", match: ["corruption", "politics", "power", "dictator", "government", "conspiracy", "political", "mafia", "gangster", "organized crime", "gang", "crime boss", "assassination"], questions: [
    "What does having power do to a person? Can you point to when it started?",
    "Does anyone stay honest here? What did it cost them?",
    "If you were handed this much power, how long before you were doing the same thing?"] },
  { id: "art", label: "Art and creativity", match: ["artist", "painter", "music", "musician", "writer", "filmmaking", "art", "creativity", "poet", "theater", "film director", "singer", "band", "actor"], questions: [
    "What do you think art is for: telling the truth, escaping, making a living, being remembered?",
    "Does someone's talent excuse how they treat people? Does the film seem to think so?",
    "Which moment felt like the filmmakers were showing off, in a good way?"] },
  { id: "obsession", label: "Obsession and madness", match: ["obsession", "madness", "insanity", "paranoia", "stalker", "psychological", "delusion", "mental illness", "psychosis", "psychological thriller"], questions: [
    "When does wanting something badly turn into something else? Is there a line?",
    "Who could have stopped them, and why didn't they?",
    "Did you understand the obsession, feel it, or just fear it?"] },
  { id: "freedom", label: "Freedom and rebellion", match: ["freedom", "rebellion", "escape", "prison escape", "revolution", "resistance", "oppression", "slavery", "dictatorship", "uprising", "totalitarianism"], questions: [
    "What does freedom mean to each person here, and who actually gets it?",
    "Is fighting back brave here, naive, or both?",
    "What would you give up to be free the way these people imagine it?"] },
  { id: "technology", label: "Technology and the future", match: ["artificial intelligence", "robot", "technology", "computer", "cyberpunk", "android", "surveillance", "virtual reality", "science fiction", "dystopia", "future", "space", "alien", "post-apocalyptic"], questions: [
    "What does this technology change about being a person, and what does it leave alone?",
    "Who benefits from this future, and who's paying for it?",
    "Is this world a warning, a prediction, or just ours a little further along?"] },
  { id: "nature", label: "Nature and survival", match: ["nature", "animal", "environment", "wilderness", "forest", "ocean", "survival", "island", "desert", "mountain", "sea", "shark", "storm"], questions: [
    "Is the place working against these people, or is it just indifferent? Which is worse?",
    "What does having to survive take away from a person?",
    "Is nature sacred here, hostile, or just there? What gives it away?"] },
  { id: "race", label: "Race, colonialism and prejudice", match: ["colonialism", "racism", "race", "segregation", "immigration", "apartheid", "civil rights", "discrimination", "prejudice", "slum", "favela"], questions: [
    "Whose story are we being told, and whose are we missing?",
    "Is prejudice shown in big dramatic acts or small everyday ones? Which is harder to watch?",
    "What would making things right look like for these people, and could it?"] },
  { id: "gender", label: "Gender and sexuality", match: ["feminism", "gender", "lgbt", "queer", "women", "sexuality", "patriarchy", "gay", "lesbian", "transgender", "sexism"], questions: [
    "What does everyone expect of these characters because of who they are, and who pushes against it?",
    "Would you tell this story differently if the main character were a different gender?",
    "Do these characters get to be complicated people, or do they carry an idea?"] },
  { id: "loneliness", label: "Loneliness", match: ["loneliness", "isolation", "solitude", "alienation", "hermit", "outsider", "exile", "lonely"], questions: [
    "Is this person alone by choice, by luck, or by their own doing? Does anyone get blamed?",
    "Which small moment of connection mattered most?",
    "What is loneliness for: protecting yourself, punishing yourself, or the start of something?"] },
  { id: "ambition", label: "Ambition and greed", match: ["ambition", "success", "fame", "career", "sports", "competition", "boxing", "gambling", "greed", "boxer", "rise to power", "wall street"], questions: [
    "What did winning cost them? Was it worth it?",
    "Is the drive here admirable, empty, or both?",
    "Who gets used or left behind on the way up?"] },
  { id: "truth", label: "Truth and perception", match: ["truth", "lies", "deception", "unreliable narrator", "mystery", "conspiracy", "secret", "twist", "whodunit", "con artist", "scam", "heist"], questions: [
    "Whose version of events do you believe, and why theirs?",
    "Can anyone ever really know what happened? What does this story suggest?",
    "After the reveal, which earlier scene did you go back over in your head?"] },
  { id: "guilt", label: "Guilt and redemption", match: ["guilt", "moral dilemma", "redemption", "sin", "betrayal", "conscience", "forgiveness", "thief", "criminal", "ex-convict"], questions: [
    "What's the thing that can't be undone here, and who is carrying it?",
    "Can someone earn redemption, or can they only hope for it?",
    "Whose choices did you excuse that you probably shouldn't have?"] },
  { id: "fate", label: "Fate and choice", match: ["fate", "destiny", "prophecy", "tragedy", "free will", "coincidence", "chance", "doomed"], questions: [
    "Do these people have a real choice, or was it always going to end this way?",
    "Which single decision, if it had gone the other way, would have changed everything?",
    "Is this a world where trying matters?"] },
  { id: "youth", label: "Childhood and growing up", match: ["childhood", "children", "coming of age", "school", "teenager", "orphan", "innocence", "growing up", "boy", "girl", "child", "teen"], questions: [
    "What does growing up cost, and what does it give? Did anyone here get the trade right?",
    "How do the adults look from a kid's seat in this film?",
    "What's the most honest thing this film says about being young?"] },
  { id: "satire", label: "Satire and absurdity", match: ["absurd", "satire", "parody", "black comedy", "slapstick", "comedy", "dark comedy", "spoof", "mockumentary"], questions: [
    "What's the film laughing at, and is it fair?",
    "Where does the joke stop being a joke, and does it still work after that?",
    "Is anything here funny that wouldn't get made today? Should it?"] },
  { id: "fear", label: "Fear and horror", match: ["horror", "fear", "monster", "ghost", "supernatural", "haunted", "slasher", "zombie", "vampire", "demon", "occult", "gore", "terror"], questions: [
    "What's the real fear under the monster: losing someone, shame, change, other people?",
    "Were you scared by what you saw, or by what you were never shown?",
    "Who makes it out, and does the film think they deserved it?"] },
  { id: "place", label: "Place and journey", match: ["city", "small town", "rural", "journey", "road trip", "travel", "road movie", "village", "new york city", "paris, france", "tokyo, japan", "los angeles"], questions: [
    "Could this have happened anywhere else, or does this place make these people who they are?",
    "What did the trip change for the characters, and what did it leave exactly as it was?",
    "Which place in the film do you still see, and what did it make you feel?"] },
  { id: "loyalty", label: "Friendship and loyalty", match: ["friendship", "loyalty", "brotherhood", "buddy", "partner", "team", "best friend", "friends"], questions: [
    "What does a friend owe a friend here, and where does that break?",
    "Who's the better friend, and who thinks they are?",
    "What would you forgive a friend that these people can't?"] },
  { id: "history", label: "History and how it's told", match: ["historical", "based on true story", "biography", "holocaust", "cold war", "history", "period drama", "feudal", "ancient", "world war i", "biopic", "true story"], questions: [
    "What gets left out when real history is told as a story?",
    "How much do we owe the actual people when we turn their lives into a movie?",
    "What's happening now that this makes you think of?"] },
]

/** Questions that fit almost any film, for the craft and for what it leaves with you. */
export const GENERAL = [
  "Say what it's about in one sentence, without describing the plot. Does anyone at the table say something different?",
  "Which scene would you show someone to prove it's great, or to prove it isn't?",
  "How did the ending leave you: full, uneasy, cheated? What would you have wanted instead?",
  "What do you think the first shot and the last shot are trying to do to you?",
  "Whose performance did you believe most, and what were they doing differently?",
  "What would you cut, and what do you wish had gotten more time?",
  "Did it change how you think about anything, even a little?",
  "Who is the real main character, even if they aren't the lead?",
  "Does the title mean something different by the end than it did at the start?",
  "What did the music, or the silence, do to you, and when?",
  "If you could ask the filmmaker one thing, what would it be?",
  "What would you argue about with a friend who loved this, or one who hated it?",
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
  if (r.length >= 3 && spread(m) >= 1.2) out.push(`${r[0][0]} gave this ${r[0][1]} and ${r[r.length - 1][0]} gave it ${r[r.length - 1][1]}. Can you each make the case for the other's score?`)
  const o = outsideAvg(m), g = groupAvg(m)
  if (o != null && g != null && Math.abs(g - o) >= 0.8) out.push(`Outside ratings average ${fmt(o, 1)} and we gave it ${fmt(g, 1)}. Did we see something everyone else missed, or miss something everyone else saw?`)
  if (m.pick) out.push(`${m.pick} chose this one. What were you hoping we'd get out of it, and did we?`)
  return out
}
