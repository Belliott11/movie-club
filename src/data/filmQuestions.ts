import { key } from "@/lib/stats"

/**
 * Discussion questions written for one film each, with spoilers: they assume you have seen it.
 * Looked up by title and year. Only this week's film and the ones to come need an entry, so past films' sets were removed;
 * to add one, send the title and a set of questions gets written and added here. Films without an entry get the theme questions instead.
 */
const FILMS: [string, number, string[]][] = [
  ["The Beyond", 1981, [
    "Fulci doesn't care about plot logic. What does the film do instead to create dread?",
    "Do you read the hotel as a literal gateway to hell, or as an allegory for something?",
    "The ending in the corridor of eternal nothing: what did you make of it?",
    "Where do the gore effects serve the film, and where do they feel excessive?",
    "Whom do you want to survive, and does the film care?",
    "What does it mean for a horror film to refuse to explain itself?"]],
]

const BY_KEY = new Map(FILMS.map(([t, y, q]) => [key(t, y), q]))

/** Questions written for this exact film, if there are any. */
export const curatedQuestions = (title: string, year: number) => BY_KEY.get(key(title, year)) ?? BY_KEY.get(key(title, year + 1)) ?? BY_KEY.get(key(title, year - 1))
