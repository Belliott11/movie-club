import { key } from "@/lib/stats"

/**
 * Discussion questions written for one film each, with spoilers: they assume you have seen it.
 * Looked up by title and year. Only this week's film and the ones to come need an entry, so past films' sets were removed;
 * to add one, send the title and a set of questions gets written and added here. Films without an entry get the theme questions instead.
 */
const FILMS: [string, number, string[]][] = [
  ["The Beyond", 1981, [
    "The film never explains what's happening and doesn't seem to care. Is it scarier when you can't make sense of it, or does that just make it easier to stop caring?",
    "If you found out the hotel you'd just inherited sat on a door to hell, would you leave, or would some part of you want to see what's behind it?",
    "The ending leaves everyone on an endless gray plain of the dead. Is that a punishment, or just what's left when there's nothing more to explain?",
    "Does gore at this level make you feel the characters' pain, or does it turn them into props? Where was your line?",
    "Nobody here is really good or bad, they just get picked off. Did you care who made it? Does horror need you to?",
    "Some films are a story you follow, and some are more like a bad dream you sit inside. Which was this, and do you prefer one?",
    "Fulci's hell is an empty plain with no one explaining anything. What would a hell that actually frightened you look like?"]],
]

const BY_KEY = new Map(FILMS.map(([t, y, q]) => [key(t, y), q]))

/** Questions written for this exact film, if there are any. */
export const curatedQuestions = (title: string, year: number) => BY_KEY.get(key(title, year)) ?? BY_KEY.get(key(title, year + 1)) ?? BY_KEY.get(key(title, year - 1))
