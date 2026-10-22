import { fold } from "./stats"

/** Directors whose name alone sells a film. Hand-picked, spelled the way TMDB spells them; matching ignores accents and case. */
const NAMES = [
  "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg", "Christopher Nolan", "Stanley Kubrick", "Alfred Hitchcock", "Francis Ford Coppola", "Akira Kurosawa",
  "David Fincher", "Wes Anderson", "Paul Thomas Anderson", "Denis Villeneuve", "Ridley Scott", "James Cameron", "David Lynch", "Clint Eastwood", "Woody Allen",
  "Spike Lee", "Ang Lee", "Bong Joon-ho", "Park Chan-wook", "Hayao Miyazaki", "Pedro Almodóvar", "Ingmar Bergman", "Federico Fellini", "François Truffaut",
  "Jean-Luc Godard", "Sidney Lumet", "Billy Wilder", "John Ford", "Howard Hawks", "Orson Welles", "David Lean", "Sergio Leone", "Sam Peckinpah", "Robert Altman",
  "Brian De Palma", "John Carpenter", "David Cronenberg", "Paul Verhoeven", "Werner Herzog", "Wim Wenders", "Rainer Werner Fassbinder", "Andrei Tarkovsky",
  "Wong Kar-wai", "Yasujirō Ozu", "Kenji Mizoguchi", "Abbas Kiarostami", "Michael Haneke", "Lars von Trier", "Darren Aronofsky", "Richard Linklater",
  "Joel Coen", "Ethan Coen", "Jim Jarmusch", "Yorgos Lanthimos", "Greta Gerwig", "Barry Jenkins", "Jordan Peele", "Chloé Zhao", "Jane Campion", "Agnès Varda",
  "Chantal Akerman", "Sofia Coppola", "Kathryn Bigelow", "Jonathan Demme", "Michael Mann", "Robert Zemeckis", "Tim Burton", "Terry Gilliam", "Peter Jackson",
  "Guillermo del Toro", "Alfonso Cuarón", "Alejandro G. Iñárritu", "Lana Wachowski", "Lilly Wachowski", "Edgar Wright", "Taika Waititi", "Hirokazu Kore-eda",
  "Satyajit Ray", "Luis Buñuel", "Roman Polanski", "Terrence Malick", "George Lucas", "Mel Brooks", "Charlie Chaplin", "Buster Keaton", "Frank Capra", "Elia Kazan",
  "Robert Bresson", "Jean Renoir", "Michelangelo Antonioni", "Luchino Visconti", "Bernardo Bertolucci", "Pier Paolo Pasolini", "Sergei Eisenstein", "Fritz Lang",
  "F.W. Murnau", "Carl Theodor Dreyer", "Jacques Tati", "Wes Craven", "George A. Romero", "Sam Raimi", "Danny Boyle", "Guy Ritchie", "Martin McDonagh", "Ari Aster",
  "Robert Eggers", "Rian Johnson", "Oliver Stone", "Spike Jonze", "Michel Gondry", "Todd Haynes", "Paul Schrader", "Ryan Coogler", "Ava DuVernay", "Steve McQueen",
  "Gus Van Sant", "Ron Howard", "Rob Reiner", "John Hughes", "Peter Weir", "Mike Leigh", "Ken Loach", "Hou Hsiao-hsien", "Edward Yang", "Takeshi Kitano",
]
const KNOWN = new Set(NAMES.map(n => fold(n).replace(/[^a-z0-9]/g, "")))

/** Whether this director is on the list of big names. */
export const isFamousDirector = (name: string) => KNOWN.has(fold(name).replace(/[^a-z0-9]/g, ""))
