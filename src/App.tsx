import { useState, useRef, useEffect } from 'react';
import { runExpertStream, expandIdeas } from './lib/gemini';
import Markdown from 'react-markdown';
import { Loader2, Send, Sparkles, BookOpen, PenTool, Eye, RefreshCw, CheckCircle2, Save, FolderOpen, Trash2, Settings, Plus, ArrowUp, ArrowDown, X, FileText, GitCommit, Book, Lock, AlertTriangle, Play, RotateCcw, Download } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const sanitizeUtf8 = (text: string): string => {
  if (!text) return "";
  let cleanText = text;
  
  // Replace typical UTF-8 multibyte conversion errors
  cleanText = cleanText
    .replace(/â€™/g, "’")
    .replace(/â€˜/g, "‘")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/â€/g, "”") // Catch fallback
    ;
    
  return cleanText;
};

const PROSE_AND_STYLE_MANDATES = `
STRICT STYLE AND ANTI-AI-SLOP PROSE MANDATES:
1. VARIETY IN PROSE STYLE & SYNTAX RHYTHMS:
   - Banish all syntactic/structural monotony. Do not repeat the same grammatical cadence consecutively.
   - Strictly prohibit trailing participle helpers at the end of active clauses (e.g., avoid ", clutching his gun", ", hoping to find space", ", looking back"). Instead, divide these into separate, distinct active statements (e.g., "He gripped the gun stock. His fingers shook.").
   - Drastically vary sentence lengths: put crisp, sharp three-word sentences right after complex, multisensory mechanical descriptions.
2. MECHANICAL AND HISTORICAL GROUNDING (SHOW AND RIGID REALISM):
   - Restrict metaphors and similes to a bare minimum (maximum 1 per 500 words). Things must never look or feel "like" something else unless absolutely unavoidable. Do not rely on abstract comparisons.
   - Focus on concrete physical and material specifications: temperatures, specific metal grades, exhaust pressure levels, fluid viscosities, thread patterns, and direct spatial dimensions.
   - Rely heavily on active, hyper-specific verbs (e.g., clank, seep, shearing, grinding, spit, deform, shudder, throb, pit, scoring) instead of general emotional adjectives or soft descriptions.
3. PSYCHOLOGICAL SUBTEXT (ZERO TELLING & EMOTIONAL CHEATS):
   - Never explicitly describe a character's internal history, motivations, or trauma immediately after they act. Allow the action to stand completely on its own.
   - Let the reader work to infer psychological breakdown or desperation from raw physical signals (e.g., sweat pooling inside rubber goggles, fingers fumbling gear levers, repetitive ritualistic motor tics, strained period dialogue) rather than having a summarizing narrator explain things.
4. METICULOUS DEEP RESEARCH ALIGNMENT:
   - Maintain 100% fidelity to the Technical & Practical Specification Database defined in the World Bible.
   - Keep rigorous track of details: weight designations (e.g., 45-ton hull), engine types (petrol-burning Maybach liquid-cooled V-12, NOT diesel), ammunition caliber (e.g., 7.5 cm), component functions (sprockets, torsion bars, idler wheels), and period-correct vernacular. Any factual contradiction will ruin the immersion.
5. BANISH EPIGRAMMATIC AND POETIC SUMMARY CLOSURES:
   - Absolutely forbid wrapping up paragraphs, scenes, or chapters with neat, summary, poetic, or moralizing sign-offs (e.g., avoid "Survival was, after all, a matter of private madness" or "the iron coffin rolled forward into the dark").
   - End scenes abruptly, flatly, or on a raw, cold physical action. Allow the tension to remain unresolved and bleed into the next scene.
6. COMPREHENSIVE BANNED COGNITIVE & PHRASEOLOGY FILTER:
   - Strictly ban these common AI crutch words and phrases: "delve", "tapestry", "testament", "beacon", "dance of", "echoes of", "whispered", "shrouded", "intertwined", "cacophony", "reign", "resonate", "symphony of", "cradle", "harbinger", "at a crossroads", "as if on cue", "only added to", "a grim reminder", "testament to", "crucial role", "newfound", "whispers of the draft".
   - Avoid characters sighing, nodding, swallowing hard, or looking to the sky as generic filler reactions. Ensure every action is task-oriented and physically rooted in the immediate crisis.
`;

interface LengthOption {
  id: string;
  label: string;
  desc: string;
  prompts: {
    researcher: string;
    character_profiler: string;
    architect: string;
    wordsmith: string;
    critic: string;
    editor: string;
  };
}

const LENGTH_OPTIONS: LengthOption[] = [
  {
    id: 'Flash Fiction',
    label: 'Flash Fiction',
    desc: 'Under 1,000 words',
    prompts: {
      researcher: 'Target length is Flash Fiction (under 1,000 words). Keep world details highly localized and singular, emphasizing a single poetic concept, central metaphor, or razor-sharp focal point.',
      character_profiler: 'Target length is Flash Fiction (under 1,000 words). Provide profile details for just 1 or 2 central figures, highlighting their single defining obsession, a specific immediate conflict, and quick psychology.',
      architect: 'Target length is Flash Fiction (under 1,000 words). Architectural outline should be a single continuous narrative wave or a tight 3-stage beat that moves swiftly to a singular, dramatic realization.',
      wordsmith: 'Target length is Flash Fiction (under 1,000 words). Write a complete, compact, laser-focused narrative of ~500-800 words that moves directly from start to finish, culminating in a beautiful climax and complete resolution.',
      critic: 'Target length is Flash Fiction (under 1,000 words). Check if the story is razor-tuned, if the central metaphor lands, if there is unnecessary padding, and confirm it completes cleanly.',
      editor: 'Target length is Flash Fiction (under 1,000 words). Refine and polish to keep the prose dense, poetic, and highly impactful, culminating in a pristine structural resolution.'
    }
  },
  {
    id: 'Short Story',
    label: 'Short Story',
    desc: 'Under 7,500 words',
    prompts: {
      researcher: 'Target length is a Short Story (under 7,500 words, aiming for ~3,000-5,000 words). Expand on 2-3 atmospheric world elements, detailed sensory textures, and cultural rituals that directly challenge the story\'s central aim.',
      character_profiler: 'Target length is a Short Story (under 7,500 words). Design deep, multi-dimensional profiles for a protagonist, an antagonist/foil, and a supporting figure. Focus on their immediate psychological weights and critical flaws.',
      architect: 'Target length is a Short Story (under 7,500 words). Map a well-paced structural outline of 2 to 3 distinct narrative acts or chapters with specific thematic transitions, charting the rise and fall of tension up to a poignant, complete resolution.',
      wordsmith: 'Target length is a Short Story (under 7,500 words). Write a highly immersive, beautiful story of ~3,000 to 4,500 words. Explore each scene with spacious pace, detailed dialogue, and emotional subtext, and make sure to pace your tokens so it resolves into a complete, beautifully concluded story.',
      critic: 'Target length is a Short Story (under 7,500 words). Evaluate if the characters and themes are given sufficient breathing room, highlight pacing bottlenecks, and ensure the story has a fully developed, complete conclusion.',
      editor: 'Target length is a Short Story (under 7,500 words). Tighten dialogue, trim filler, and polish prose to establish a gorgeous, evocative story of substantial depth that reaches an organic, finished ending.'
    }
  },
  {
    id: 'Novelette',
    label: 'Novelette',
    desc: '7.5k to 17.5k words',
    prompts: {
      researcher: 'Target length is a heavy, sweepingly detailed Novelette (7,500 to 17,500 words). Produce an incredibly deep "World-Building Bible" detailing extensive historical lore, multiple geological or urban locations, religious/societal systems, and deep thematic laws.',
      character_profiler: 'Target length is a Novelette (7,500 to 17,500 words). Author robust, 3D character profiles for a full ensemble (3-4 characters) detailing generational trauma, fatal flaws, deep psychological defense mechanisms, and complex interpersonal web arrays.',
      architect: 'Target length is a Novelette (7,500 to 17,500 words). Architect a magnificent narrative structure broken down into exactly 4 or 5 rich chapters. Do NOT use beats; specify rich chapter titles. Plan substantial character shifts, subtle subplots, a main climax, and a detailed resolution.',
      wordsmith: 'Target length is a Novelette (7,500 to 17,500 words). This requires a deep, substantial narrative. In this part of the cycle, generate a sweeping, deeply immersive draft of ~6,000 to 8,000 words (which sits at the heart of our Novelette target under LLM limits). Dedicate immense attention to rich physical surroundings, long atmospheric scenes, slow-burning dialogue, and heavy subtext. You MUST write a fully realized, complete narrative spanning all 4-5 planned chapters, ending in a slow, elegant, fully-concluded final paragraph.',
      critic: 'Target length is a Novelette (7,500 to 17,500 words). Critique the depth of subplots, the pacing of the 4-5 chapters, whether World-Building details feel integrated, and verify if the narrative concluded gracefully.',
      editor: 'Target length is a Novelette (7,500 to 17,500 words). Revise the entire text to elevate the prose. Maximize the slow-burn pacing, flesh out scenes that feel too rushed, ensure each of the 4-5 chapters transitions seamlessly, and deliver a perfectly complete, rich masterwork.'
    }
  },
  {
    id: 'Novella',
    label: 'Novella',
    desc: '17.5k to 40k words',
    prompts: {
      researcher: 'Target length is an epic, highly immersive Novella (17,500 to 40,000 words). Create a massive, exhaustively detailed "World-Building Bible". Map out political hierarchies, deep resource economies, socio-cultural divisions, ecological subsystems, and a complex timeline of historical world events.',
      character_profiler: 'Target length is a Novella (17,500 to 40,000 words). Generate detailed psychological matrices for a large cast (4-5 major and minor characters). Detail their primary/secondary motivations, buried secrets, ideological alignments, and physical ticks.',
      architect: 'Target length is a Novella (17,500 to 40,000 words). Map out a sophisticated narrative architecture consisting of exactly 5 to 7 detailed chapters. Map multiple subplots, ideological conflicts, pacing peaks/valleys, and exhaustive details for each chapter\'s specific focus.',
      wordsmith: 'Target length is a massive, multi-chapter Novella (17,500 to 40,000 words). In this phase of the cycle, generate a major, sweeping literary draft of ~8,000 to 10,000 words (the upper limit of continuous LLM streaming outputs). Write in a luxurious, slow-paced cinematic style with extensive dialogue, heavy introspection, structural world detail, and highly detailed room descriptions. Ensure all 5-7 chapters of the outline are fully represented and that the story resolves into a definitive, complete, and incredibly satisfying final climax and epilogue.',
      critic: 'Target length is a Novella (17,500 to 40,000 words). Audit this epic output with hyper-rigor. Check if all main subplots and character arcs are balanced across the 5-7 chapters, examine thematic integration of the massive lore, and verify the conclusion is fully written and resolved.',
      editor: 'Target length is a Novella (17,500 to 40,000 words). Refine, expand, and enrich the text into a glorious, sweepingly deep novella. Polish the rhythm of the language, expand description blocks to enhance depth, and guarantee that the narrative transitions beautifully through to its majestic, completely finished ending.'
    }
  }
];

interface Expert {
  id: string;
  name: string;
  systemInstruction: string;
  promptTemplate: string;
}

const DEFAULT_EXPERTS: Expert[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    systemInstruction: 'You are an elite research historian, technical expert, and world-building architect. Your job is to construct an extremely detailed, hyper-specific Technical, Physical, and Historical Reference Ledger that eliminates any possibility of soft fact-free text.',
    promptTemplate: 'Genres: {{genres}}\nCore Themes: {{themes}}\nOverall Aim: {{aim}}\nTarget Length: {{length}}\n\nAnalyze these inputs and synthesize them to generate a deep, highly authoritative "World & Technical Reference Bible" structured as follows:\n\n1. TECHNICAL & PHYSICAL SPECIFICATION DATABASE: List exact mechanical details, blueprinted engineering realities (e.g. weights, specific models, fuel types, exact transmission mechanisms, weaponry limitations, chemical/physical boundaries, operational limits).\n2. HISTORICAL/SLANG TERMINOLOGY INDEX: Compile period-specific terminology, mechanical jargon, equipment names, clothing details, and raw sensory details (e.g., specific grease smells, metallic frequencies, mud texture under specific temperatures).\n3. THEMATIC INTEGRATION LAWS: Document how these strict technical limitations/realism physically challenge the central goals of the characters.\n4. FACTUAL CONTINUITY CHECKLIST FOR AUDITING: Create a numbered list of exactly 8 concrete facts/invariants (e.g., "Fact 1: Gasoline engine (requires high-octane fuel, extremely flammable), NOT diesel") that subsequent agents MUST cross-examine and adhere to perfectly.'
  },
  {
    id: 'character_profiler',
    name: 'Character Profiler',
    systemInstruction: 'You are an expert character developer, psychoanalyst, and deep character psychologist. Create complex, raw, non-cliché character profiles whose psychological scars and motor tics are grounded strictly in the research bible and thematic tension.',
    promptTemplate: 'World Bible & Context:\n{{Researcher}}\n\nThemes: {{themes}}\nOverall Aim: {{aim}}\nTarget Length: {{length}}\n\nGenerate rich character profiles for the main cast. Establish their coping mechanisms, personal blindspots, mechanical duties/skills, and fatal flaws. Avoid convenient, modern, or cliché emotional shorthand; ground their behaviors deeply in the physical and historical realities outlined in the World Bible.'
  },
  {
    id: 'architect',
    name: 'Architect',
    systemInstruction: 'You are a master literary plot architect. Plan a tight, pacing-optimized narrative outline that utilizes high-integrity technical obstacles, ensuring character arcs map perfectly to physical, external constraints.',
    promptTemplate: 'World Bible:\n{{Researcher}}\n\nCharacter Profiles:\n{{Character Profiler}}\n\nOverall Aim: {{aim}}\nTarget Length: {{length}}\n\nCreate a detailed, structural plot outline. Split the outline into narrative chapters with descriptive titles. Do NOT use abstract, placeholder or generic structure terms; design chapters with high dramatic tension. Ensure that mechanical failure or specific physical conditions in the World Bible drive key plot-turning events, integrating research early.'
  },
  {
    id: 'wordsmith',
    name: 'Wordsmith',
    systemInstruction: 'You are an award-winning literary novelist. Write visceral, high-fidelity prose that achieves absolute author verisimilitude, avoiding all predictive AI styles and monotonous cadences completely.',
    promptTemplate: 'Outline:\n{{Architect}}\n\nWorld Bible:\n{{Researcher}}\n\nCharacter Profiles:\n{{Character Profiler}}\n\nWriting Constraints: {{length}}\n\nWrite the first draft. Ground the prose strictly in the mechanical, physical, and historical details of the World Bible. Rely on highly specific tactile, chemical, and sensory verbs rather than stacking generic adjectives. IMPORTANT:\n1. Use proper "Chapter X: [Title]" headings.\n2. Write a COMPLETE draft following the outline, pacing output tokens nicely so there is no truncation mid-sentence.\n3. Actively resist common AI writing cadences, starting sentences with varied structure, avoiding noun-conjunction-participial trailing formulas, and omitting epigrammatic, summaries or poetic wrap-ups.'
  },
  {
    id: 'critic',
    name: 'Critic',
    systemInstruction: 'You are a harsh, meticulous senior literary critic and technical fact-checker. Your job is to audit drafts under a double microscope: (1) Style, Cadence & AI Cliché Sanitization, and (2) Rigorous Technical Continuity Verification against the Researcher’s Bible.',
    promptTemplate: 'Draft:\n{{Wordsmith}}\n\nOriginal World Bible:\n{{Researcher}}\n\nOriginal Aim: {{aim}}\nThemes: {{themes}}\nTarget Length: {{length}}\n\nEvaluate this draft with relentless quality-rigor. Structure your critique into these exact sections:\n\n1. TECHNICAL & HISTORICAL VERIFICATION: Check every mechanical mention (weights, weapons, fuels, models, components) against the World Bible\'s concrete list of facts. Explicitly flag any incorrect, modern or contradictory details.\n2. PROSE CADENCE AND STYLE SANITIZATION: Scan for and call out generic AI patterns—such as the monotonous "Noun + -ing..." trailing structures, overused metaphors/similes, stacked double adjectives, and over-explaining a character\'s internal motive right after they perform an idiosyncratic action.\n3. CLOSE-OUT REPORT: Scan for and banish any poetic summarizing closures or preachy epigrammatic wrapping statements at paragraph or scene bounds.\n4. ACTIONABLE REVISION CHECKS: Provide exact, bulleted guidance for rewrite.'
  },
  {
    id: 'editor',
    name: 'Editor',
    systemInstruction: 'You are an elite, painstaking book editor and prose stylist. Your goal is to apply the critic’s revisions and translate the draft into finished literature with maximum human verisimilitude, stripping every last footprint of AI text.',
    promptTemplate: 'Draft:\n{{Wordsmith}}\n\nCritique:\n{{Critic}}\n\nWorld Bible:\n{{Researcher}}\n\nWriting Constraints: {{length}}\n\nRe-engineer, polish, and seamlessly rewrite the draft based on the technical corrections and stylistic directives of the Critique. Ensure complete factual continuity with the World Bible. Ensure the prose has jagged, variable, human sentence lengths, rich active verbs, zero AI crutch phrases, zero explanatory tellings, and finishes abruptly and organically without any neat poetic closures.'
  }
];

interface ChapterProgress {
  number: number;
  title: string;
  status: 'pending' | 'drafting' | 'critiquing' | 'polishing' | 'completed';
  draft: string;
  critique: string;
  polished: string;
}

interface SavedStory {
  id: string;
  title: string;
  timestamp: number;
  genres: string[];
  themes: string;
  aim: string;
  draftHistory: string[];
  cycleData: Record<string, string>;
  experts: Expert[];
  storyChapters?: ChapterProgress[];
}

const GENRES = [
  'Hard Sci-Fi',
  'Space Opera',
  'Cyberpunk',
  'Steampunk',
  'Solarpunk',
  'High Fantasy',
  'Dark Fantasy',
  'Gothic Horror',
  'Cosmic Horror',
  'Mystery & Detective',
  'Noir & Hardboiled',
  'Cozy Mystery',
  'Psychological Thriller',
  'Historical Fiction',
  'Military Fiction',
  'Regency & Romance',
  'Literary Fiction',
  'Magical Realism',
  'Grimdark Dark Fantasy',
  'Dystopian'
];

interface GenreSpecs {
  researcherFocus: string;
  characterFocus: string;
  architectFocus: string;
  wordsmithFocus: string;
  criticFocus: string;
}

const GENRE_SPECS: Record<string, GenreSpecs> = {
  'Hard Sci-Fi': {
    researcherFocus: 'PHYSICAL LAWS & ENGINEERING: Enforce strict conservation of energy, orbital speeds, thermodynamics, precise chemical components, signal latencies, and real physics limits.',
    characterFocus: 'INTELLECTUAL OBSESSIONS: Deeply tie character motives to technical roles, cybernetic stress, data load caps, scientific isolation, or logical paradoxes.',
    architectFocus: 'EMERGENT SYSTEM CAUSALITIES: Plot turning points must emerge from specific physical anomalies, system failures, or calculation errors within physical bounds.',
    wordsmithFocus: 'CLINICAL & TENSE STYLE: Use precise, technical jargon, measurements, cold geometries, and sensory data. Avoid metaphorical fluff and poetic embellishments.',
    criticFocus: 'RIGOROUS PHYSICS DOUBLE CHECK: Validate that there are no hand-wavy sci-fi mechanisms or "magic engine" speeds. Flag anything violating thermodynamics.'
  },
  'Space Opera': {
    researcherFocus: 'MACRO-POLITICAL SCALE & LOGISTICS: Map out interstellar sovereign factions, starship classes, slipstream jumps, light-year distances, fleet communications, and colony resources.',
    characterFocus: 'FACTIONAL LOYALTIES & COLOSSAL DRAMA: Detail deep ideologue clashes, blood pacts, generational duties, or military honor issues linked to specific star solar systems.',
    architectFocus: 'MULTI-THEATER CAMPAIGNS: Structure narrative peaks across different planetary orbits, massive starships, or political assemblies, maintaining cinematic stakes.',
    wordsmithFocus: 'SWEEPING & MAJESTIC PROSE: Rely on grand, awe-inspiring, cosmic scales, detailed space hull structures, atmospheric entries, and high-frequency comm chatter.',
    criticFocus: 'SCALE & PACING SANITY: Ensure the massive scale doesn\'t derail local interpersonal stakes or break chronological interstellar transit times.'
  },
  'Cyberpunk': {
    researcherFocus: 'SYNTHETIC INFRASTRUCTURE & SLANG: Detail neural interfaces, retro-fitted streetwares, cyberware heat venting, neon-grid protocols, black-market chemical agents, and low-life street jargon.',
    characterFocus: 'SYSTEMIC DESPERATION & PHANTOM LIMBS: Emphasize physical and neural strain of prosthetics, corporate-employee debt nodes, addictions, and moral compromises.',
    architectFocus: 'STREET-LEVEL BETRAYALS: Plotting should spiral down through wet alleyway exchanges, digital asset heists, firewall hacks, corp-officer ambushes, and system failures.',
    wordsmithFocus: 'GLITCHY & VISCERAL STYLE: Focus on rains slicked with synthetic rainbows, low-frequency hums, organic metal smells, stark neon glares, and fast, jagged sentences.',
    criticFocus: 'AI CLICHÉ CLEANSE & CORP REALISM: Banish generic "city has a heartbeat" or "neon tapestry". Ensure corporate leverage is truly calculated and cold.'
  },
  'Steampunk': {
    researcherFocus: 'PNEUMATICS & INDUSTRIAL SPECIFICATION: Enforce thermodynamic soot limits, boilers, brass gears, steam pressures, copper duct work, zeppelin lift volumes, and mechanical escapements.',
    characterFocus: 'COAL-DUSTED SOULS & INVENTOR ANXIETY: Detail soot-stained hands, class-based mechanical indentures, pocket watch fixations, and physical fatigue under heavy brass suits.',
    architectFocus: 'MECHANICAL FAULTS: Plot turns must hinge on gear slips, high-pressure boiler ruptures, valve blockages, or mechanical assembly failures.',
    wordsmithFocus: 'METALLIC & GEAR-DRIVEN RYTHM: Emphasize smells of grease, coal oil, and sulfur. Describe heavy sounds of mechanical ticking, metallic squeals, and dense smog.',
    criticFocus: 'STEAM PHYSICS CHECK: Ensure steam engines and mechanisms do not operate like futuristic magic electronics. Check pressure limits and physical gear realities.'
  },
  'Solarpunk': {
    researcherFocus: 'ECOLOGICAL INFRASTRUCTURE & TECH: Specify vertical greenhouse cycles, solar-kinetic fabrics, mycorrhizal communications, community repair protocols, and biodegradable synthetics.',
    characterFocus: 'UTOPIAN BURDENS & COLLECTIVE ANXIETIES: Detail character fears of community exclusion, balance of labor, ecological grief, and the meticulous upkeep of delicate bio-engineered networks.',
    architectFocus: 'COMMUNAL SYMBIOSIS: Plot points center on bio-system threats, micro-grid collapses, diplomatic resolutions, and restoration of ecological equilibrium.',
    wordsmithFocus: 'ORGANIC & SUN-DRENCHED IMAGERY: Highlight sensory textures of soil, damp foliage, clay, solar warmth, kinetic whirs of micro-turbines, and calm, rhythmic prose.',
    criticFocus: 'ANTI-PASTORAL SANITY CHECK: Ensure the setting is not a soft, complication-free fairy tale. Community labor, seasonal limits, and material maintenance must be painfully real.'
  },
  'High Fantasy': {
    researcherFocus: 'MATERIAL SPELL LIMITATIONS & LAW: Enforce strict costs of spell-casting (physical fatigue, material reagents), specific metallurgical properties, guild cartography, and ancient linguistic protocols.',
    characterFocus: 'GENEALOGICAL BURDENS & SYSTEMIC FAITH: Detail bloodlines, archaic sacred oaths, class subjugation, magical degradation symptoms, and spiritual bindings.',
    architectFocus: 'COGNITIVE JOURNEYS & CHRONICLES: Map structural chapters across treacherous geographical zones, ancient structural ruins, or high-stakes royal diplomacy.',
    wordsmithFocus: 'ELEVATED & ARCHAIC RESONANCE: Use solemn, grounded, archaic vocabulary that evokes age, heavy stone chambers, iron rust, and physical toll of spells.',
    criticFocus: 'FANTASY SLOP CLEANSE: Erase magical deus-ex-machinas. Verify magic complies 100% with the strict cost limits specified in the reference bible.'
  },
  'Dark Fantasy': {
    researcherFocus: 'VISCERAL DECAY & ARCHAIC PESTILENCE: Map out necrotic soils, blood-borne curses, rot-resistant wood structures, witch-metal alloys, and decaying feudal bureaucracies.',
    characterFocus: 'MORAL DECAY & SURVIVOR GUILT: Characters must have severe psychological scars, physical disfigurements, creeping mutations, and desperate, compromise-driven morals.',
    architectFocus: 'TRAUMATIC SACRIFICES: Focus chapters on agonizing moral dilemmas, physical retreats, defense of dying outposts, and pyrrhic tactical victories.',
    wordsmithFocus: 'CLAWING & OPPRESSIVE TEXTURE: Emphasize heavy damp mud, smell of copper blood, cold iron, damp bone, guttural vocal sounds, and cold, jagged sentence structures.',
    criticFocus: 'TREATMENT OF EVIL SANITY: Verify there are no poetic redemptions. Ensure corruption is presented with cold, unflinching, physical realism.'
  },
  'Gothic Horror': {
    researcherFocus: 'ARCHITECTURAL DECAY & SOCIAL TABOOS: Detail deteriorating manorial woodwork, moldering tapestries, ancestral diseases, damp subterranean crypts, and early-modern class systems.',
    characterFocus: 'HEREDITARY SHAME & PSYCHIC COLLAPSE: Focus on creeping delirium, family curses, claustrophobic fixations, and obsessive mourning periods.',
    architectFocus: 'CLAUSTROPHOBIC SPIRALS: Pacing must restrict character movement, trapping them in decaying environments as family secrets are unpeeled chapter-by-chapter.',
    wordsmithFocus: 'SHADOW-DRENCHED & ELEGIAC STYLE: Highlight flickering tallow candles, peeling wallpaper, cold stone drafts, moldering library paper, and melancholic, moody line cycles.',
    criticFocus: 'ATMOSPHERIC INTEGRITY CHECK: Watch out for generic "scary" lines. The horror must bubble from physical and ancestral claustrophobia.'
  },
  'Cosmic Horror': {
    researcherFocus: 'MATHEMATICAL PARADOXES & ANTI-ANTHROPOLOGY: Frame non-Euclidean angles, deep geologic times, erratic astronomical phenomena, and archaic forbidden transcription fragments.',
    characterFocus: 'COGNITIVE DISSONANCE & VANISHING SANITY: Detail character obsessions with patterns, complete sensory breakdown, panic tremors, and isolation of forbidden knowledge.',
    architectFocus: 'THE INEVITABLE DESCENT: Structure the plot as an investigation that slowly dissolves standard causality, leading to severe, cold insignificance.',
    wordsmithFocus: 'ALIEN & UNNERVING SENSORY DETAILS: Accentuate impossible light planes, alien organic vibrations, damp cold slimes, and prose that feels like a cold, feverish autopsy.',
    criticFocus: 'BEAST-FREE SANITY CHECK: Ensure there is no generic "monster fight". The dread must stem from the chilling insignificance of human agency.'
  },
  'Mystery & Detective': {
    researcherFocus: 'FORENSIC SPECIFICATION & PROCEDURE: Establish strict timelines, ballistics, physical footprint depths, toxicology, lock-picking realities, and municipal police bureaucracy.',
    characterFocus: 'OBSESSIVE LOGIC & SLEEPLESS FLUGS: Highlight psychological ticks, internal cataloging of facts, moral exhaustion, and personal boundaries worn down by exposure to brutality.',
    architectFocus: 'CLUES & RED HERRINGS: Chapters must integrate concrete physical evidence early. Plot turns must center on alibi collapses, double bluffs, or forensic discoveries.',
    wordsmithFocus: 'TACTICAL & OBSERVANT STYLE: Use sharp, observational details, spatial awareness of rooms, precise tracking of eye contact, and clean, analytical pacing.',
    criticFocus: 'FORENSIC LOGIC AUDIT: Verify that the detective does not guess. The solution must follow strictly from the technical clues outlined in the Researcher Bible.'
  },
  'Noir & Hardboiled': {
    researcherFocus: 'URBAN SQUALOR & CORRUPTION NODES: Detail cheap whiskey, wet asphalt, damp trench coats, back-room poker dens, cigarette burns, municipal bribery schemes, and bootleg ammunition.',
    characterFocus: 'CYNICAL FATALISM & BROKEN COMPASSES: Characters are war-torn, indebted, heavy drinkers with a dry, tragic wit and zero expectations of a happy ending.',
    architectFocus: 'THE WEAKENING NOOSE: Plotting must drag characters through an ever-tightening web of mutual betrayals, cold blackmails, and street-level gunfights.',
    wordsmithFocus: 'LACONIC & REASSUREDLY GRITTY PROSE: Run razor-sharp sentences, cynical internal monologues, smoky environments, wet neon glare, and dry colloquial lines.',
    criticFocus: 'MELODRAMA SANITY CHECK: Banish overly cheesy tough-talk. Noir is about absolute despair, written with cold, jagged, unyielding brevity.'
  },
  'Cozy Mystery': {
    researcherFocus: 'COMMUNAL GEOGRAPHY & DOMESTIC SYSTEMS: Outline small-town maps, local bakery recipes, tea varieties, antique pricing, parish registries, and village relationship lines.',
    characterFocus: 'MEDDLESOME CURIOSITY & QUIRKY BOUNDS: Highlight sharp observational skills masked by local eccentricities, quiet community griefs, and domestic quirks.',
    architectFocus: 'CLOSED-CIRCLE INVESTIGATING: Construct suspects entirely from the local closed pool (e.g. at a manor, inside a small parish). Chapter ends must tease secrets without graphic blood.',
    wordsmithFocus: 'WARM, INTENTIONAL & COZY TEXTURE: Focus on smell of warm tea, crackling hearths, rain-streaked windows, soft wools, and an underlying sense of local social order.',
    criticFocus: 'BLOOD-VOLUME SANITY CHECK: Keep violence off-screen. Audit the cozy atmosphere to ensure it never crosses into hyper-violence, while keeping the clues watertight.'
  },
  'Psychological Thriller': {
    researcherFocus: 'COGNITIVE DISTORTIONS & COERCION PATTERNS: Map out gaslighting sequences, medication side-effects, panic manifestations, surveillance systems, and high-frequency communication tracking.',
    characterFocus: 'UNRELIABLE PERSPECTIVES & PARANOIA: Character profiles must detail audio-visual hallucinations, memory lapses, defensive denial mechanisms, and extreme vigilance.',
    architectFocus: 'TIGHTENING THE SCREWS: Pacing must spiral tightly using a ticking clock, sudden invasions of space, psychological threats, and sudden perspective shifts.',
    wordsmithFocus: 'STACCATO & SUFFOCATING RHYTHMS: Use short, breathless, staccato clauses, heightened physical panic cues, repetitive nervous obsessions, and heavy internal processing.',
    criticFocus: 'PSYCHE VERISIMILITUDE CHECK: Ensure psychological breakdowns feel clinically dry and terrifyingly accurate, avoiding simplistic screen-movie madness.'
  },
  'Historical Fiction': {
    researcherFocus: 'PERIOD HISTORICAL SPECS & REVENUE: Enforce chronological dates, exact monetary systems, agricultural cycles, weaving/fabrics of the period, legal statuses, and authentic vernacular.',
    characterFocus: 'PERIOD-SPECIFIC CONSCIOUSNESS: Characters must be free of modern morals and think strictly within the socio-religious boundaries of their era.',
    architectFocus: 'SOCIO-ECONOMIC CRITICAL PATHS: Chapters must map to historical events, seasons, harvest times, tax dues, or strict class-hierarchy obligations.',
    wordsmithFocus: 'GROUNDED & TIME-DRENCHED PROSE: Rely on sensory details of tallow, damp wool, animal lard, coarse stone, and archaic nouns appropriate to the century.',
    criticFocus: 'ANACHRONISM DOUBLE SEARCH: Relentlessly sweep files to destroy modern colloquialisms or futuristic thought patterns. Ensure clothing, currency, and transportation are historical.'
  },
  'Military Fiction': {
    researcherFocus: 'TACTICAL OPERATION & HARDWARE MANIFESTS: Detail weapons models, failure rates, firing ranges, terrain elevations, logistics supply chains, and administrative army ranks.',
    characterFocus: 'COMBAT TRAUMA & DRILL HYPNOTICS: Detail raw military jargon, sleep-deprivation states, muscle memory maneuvers, and rigid survival hierarchies.',
    architectFocus: 'BATTLE CRITICAL PHASES: Match chapters to movement phases, defensive positions, ammunition limits, tactical communications, and high-stakes engagements.',
    wordsmithFocus: 'CLINICAL, TACTICAL & IMPACTFUL PROSE: Use terse, explosive, highly objective descriptions of terrain, sound wave concussions, metal shrapnel, and field mud.',
    criticFocus: 'COMPATIBILITY & COMBAT REALISM: Erase idealized Hollywood war heroics. Fact-check battlefield physics, reload times, and injury gravity.'
  },
  'Regency & Romance': {
    researcherFocus: 'COMPLEX SOCIAL ETIQUETTE & CODEBOOKS: Map strict court hierarchies, dancing cards, dowries, garment structural details (corsets, cravats), and archaic social rules.',
    characterFocus: 'RELATIONAL REPRESSION & SECRETS: Focus on unspoken desires, family duties, defensive social masks, vulnerabilities, and deep relational scars.',
    architectFocus: 'COURTSHIP REVERSALS: Pacing hinges on close physical encounters, scandalous rumors, public balls, family interventions, and emotional walls crashing.',
    wordsmithFocus: 'TENSE, CHARGED & RESONATING DIALOGUE: Use sharp, witty, conversational parries and description of subtle physical contact (e.g., bare wrist skin brushes).',
    criticFocus: 'EMOTIONAL VERISIMILITUDE CHECK: Ensure the romantic stakes do not slip into modern tropes. The historical constraints must actively block physical expression.'
  },
  'Literary Fiction': {
    researcherFocus: 'EVERYDAY VERISIMILITUDE & INFRASTRUCTURE: Detail domestic mechanical chores, specific kitchen wear, local neighborhoods, work specifications, and subtle class tells.',
    characterFocus: 'SUBTEXT-RICH CONSCIOUSNESS: Detail complex, mixed feelings, self-deception, small personal failures, and micro-aggressions between close individuals.',
    architectFocus: 'SUBTLE NARRATIVE DRIFTS: Plot points are small, quiet, profound internal realizations or conversational shifts rather than massive high-drama action peaks.',
    wordsmithFocus: 'EXQUISITE, UNVARNISHED TEXTURES: Focus on razor-sharp, quiet, everyday prose rich in subtext. Sentence lengths are heavily varied, mimicking genuine human thought.',
    criticFocus: 'SLOP & MELODRAMA SANITY: Banish all narrative clichés, overly neat solutions, and generic high stakes. Ensure every line subverts predictable literary beats.'
  },
  'Magical Realism': {
    researcherFocus: 'DOMESTIC REALITY WITH MYSTICAL CONSTANTS: Outline exact domestic setups, village economics, and set concrete physical rules for a single unexplainable magical constant.',
    characterFocus: 'MATTER-OF-FACT ACCEPTANCE: Characters must treat extraordinary magic with complete, casual, everyday indifference while stressing over normal domestic issues.',
    architectFocus: 'INTEGRATED WHIMSICAL PATHS: Pacing maps magic seamless with agricultural seasons, baking schedules, memory loss, or local births, avoiding epic-adventure arches.',
    wordsmithFocus: 'SUBLIME & OBJECTIVE TEXTURE: Combine simple, raw dirt-and-rust sensory details with breathtaking magical phenomena written in completely plain voice.',
    criticFocus: 'FANTASY DEVIANCE BLOC: Relentlessly flag "spell-casting" or classic high-fantasy tropes. Magic must remain part of the domestic landscape.'
  },
  'Grimdark Dark Fantasy': {
    researcherFocus: 'INFRASTRUCTURE OF COLLAPSE & MUTILATION: Detail decaying arms, putrid trench-rot, economic famines, black-market bone trades, and raw feudal exploitation.',
    characterFocus: 'HARDENED COMPROMISE & GRIT: Characters are cruel, self-serving, exhausted survivors. Ground their motives in base survival, fear, and deep pragmatism.',
    architectFocus: 'UNCOMPROMISING CAUSALITY: Plots are driven by strategic blunders, resource starvation, betrayals, and devastating tactical collapses, containing zero miracles.',
    wordsmithFocus: 'RUSTED & BLEAK LYRICISM: Heavy sounds of iron boots, wet rot, raw wind, dry throat coughing, and brutal, highly economic physical verbs.',
    criticFocus: 'COGNITIVE EDGELORD SANITY CHECK: Cleanse juvenile edginess or cartoon violence. The world\'s darkness must feel cold, physical, systemic, and utterly real.'
  },
  'Dystopian': {
    researcherFocus: 'BUREAUCRATIC & RATIONING LOGISTICS: Detail food-cube calorie distributions, state surveillance models, municipal security block numbers, and concrete rationing laws.',
    characterFocus: 'INDENTURED PSYCHOLOGY & COMPLIANCE: Focus on survival fear, state-worker propaganda habits, quiet passive resistance, and internal weariness.',
    architectFocus: 'THE PANOPTICON NOOSE: Map chapters to state audits, contraband sweeps, sudden vanishings of friends, and high-consequence survival choices.',
    wordsmithFocus: 'COLD, MECHANIZED & DECONSTRUCTED TONE: Describe concrete block architecture, buzzing alarms, gray exhaust smoke, synthetic smells, and minimalist prose.',
    criticFocus: 'PROPAGANDA AUDIT: Verify that state characters use authentic bureaucratic doublespeak. Ensure the resistance is hard, complex, and unidealized.'
  }
};

function getGenreDirectives(selectedGenres: string[]): GenreSpecs {
  const defaultSpecs: GenreSpecs = {
    researcherFocus: 'TECHNICAL & HISTORICAL REALISM: Base the ledger on strict physical, historical or scientific principles suitable for the chosen setting.',
    characterFocus: 'PSYCHOLOGICAL VERISIMILITUDE: Build complex characters free of modern shortcuts or simplistic emotions.',
    architectFocus: 'EXTERNAL DRAMATIC TENSION: Build an outline driven by solid plots, environment limits, and narrative obstacles.',
    wordsmithFocus: 'TACTILE & HUMAN PROSE: Employ active verbs, rich sensory layers, and jagged sentence rhythms. Zero AI clichés.',
    criticFocus: 'RIGOROUS METHODICAL AUDIT: Evaluate correctness, style cadence violations, and any narrative tropes.'
  };

  const activeGenres = selectedGenres.filter(g => GENRE_SPECS[g]);
  if (activeGenres.length === 0) return defaultSpecs;

  const combined: GenreSpecs = {
    researcherFocus: '',
    characterFocus: '',
    architectFocus: '',
    wordsmithFocus: '',
    criticFocus: ''
  };

  activeGenres.forEach((g) => {
    const spec = GENRE_SPECS[g];
    combined.researcherFocus += `• [${g}] ${spec.researcherFocus}\n`;
    combined.characterFocus += `• [${g}] ${spec.characterFocus}\n`;
    combined.architectFocus += `• [${g}] ${spec.architectFocus}\n`;
    combined.wordsmithFocus += `• [${g}] ${spec.wordsmithFocus}\n`;
    combined.criticFocus += `• [${g}] ${spec.criticFocus}\n`;
  });

  return combined;
}

function PipelineEditor({ experts, setExperts, onClose }: { experts: Expert[], setExperts: (e: Expert[]) => void, onClose: () => void }) {
  const [editingExperts, setEditingExperts] = useState<Expert[]>(experts);

  const handleSave = () => {
    setExperts(editingExperts);
    onClose();
  };

  const addExpert = () => {
    setEditingExperts([...editingExperts, {
      id: `expert_${Date.now()}`,
      name: 'New Expert',
      systemInstruction: 'You are a helpful assistant.',
      promptTemplate: 'Here is the context:\n{{aim}}'
    }]);
  };

  const updateExpert = (index: number, field: keyof Expert, value: string) => {
    const newExperts = [...editingExperts];
    newExperts[index] = { ...newExperts[index], [field]: value };
    setEditingExperts(newExperts);
  };

  const removeExpert = (index: number) => {
    setEditingExperts(editingExperts.filter((_, i) => i !== index));
  };

  const moveExpert = (index: number, direction: 1 | -1) => {
    if (index + direction < 0 || index + direction >= editingExperts.length) return;
    const newExperts = [...editingExperts];
    const temp = newExperts[index];
    newExperts[index] = newExperts[index + direction];
    newExperts[index + direction] = temp;
    setEditingExperts(newExperts);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0f0805] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-serif text-white">Pipeline Settings</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="text-sm text-white/50 mb-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <p className="mb-2">Define the sequence of AI experts. Each expert runs in order.</p>
            <p>Available variables in Prompt Template:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><code>{`{{genres}}`}</code>, <code>{`{{themes}}`}</code>, <code>{`{{aim}}`}</code></li>
              <li><code>{`{{Expert Name}}`}</code> (e.g., <code>{`{{Researcher}}`}</code>) to inject the output of a previous expert.</li>
            </ul>
          </div>

          {editingExperts.map((expert, index) => (
            <div key={expert.id} className="bg-black/40 border border-white/10 rounded-xl p-5 space-y-4 relative group">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveExpert(index, -1)} disabled={index === 0} className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => moveExpert(index, 1)} disabled={index === editingExperts.length - 1} className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                <button onClick={() => removeExpert(index)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm border border-orange-500/30">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={expert.name}
                  onChange={e => updateExpert(index, 'name', e.target.value)}
                  className="bg-transparent text-lg font-medium text-white focus:outline-none focus:border-b border-orange-500/50 pb-1"
                  placeholder="Expert Name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">System Instruction</label>
                <textarea
                  value={expert.systemInstruction}
                  onChange={e => updateExpert(index, 'systemInstruction', e.target.value)}
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all resize-none text-white/80"
                  placeholder="You are an expert..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Prompt Template</label>
                <textarea
                  value={expert.promptTemplate}
                  onChange={e => updateExpert(index, 'promptTemplate', e.target.value)}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all resize-none text-white/80 font-mono text-xs"
                  placeholder="Use variables like {{aim}} or {{Previous Expert}}..."
                />
              </div>
            </div>
          ))}

          <button
            onClick={addExpert}
            className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-white/50 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Expert
          </button>
        </div>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button onClick={() => setEditingExperts(DEFAULT_EXPERTS)} className="px-5 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors mr-auto">Reset Defaults</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={editingExperts.length === 0}
            className="px-5 py-2.5 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}

const parseChaptersFromOutline = (outline: string): { title: string; number: number }[] => {
  if (!outline) return [];
  const chapters: { title: string; number: number }[] = [];
  const lines = outline.split('\n');
  let currentChapNum = 1;
  const seenNumbers = new Set<number>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) continue;
    
    // Checks typical chapter patterns:
    // e.g., "## Chapter 1: The Gathering" or "## 1. The Awakening" or "Chapter One - Title"
    const isChapter = /^(?:#+\s*)?(?:Chapter\s*(?:\d+|[a-zA-Z]+)|(\d+))\b[\s.:\-\*]*/i.test(trimmed);
    
    if (isChapter) {
      const titleText = trimmed
        .replace(/^(?:#+\s*)?/i, '')
        .replace(/^Chapter\s*(?:\d+|[a-zA-Z]+)/i, '')
        .replace(/^\d+[\s.:\-]+/i, '')
        .replace(/^[\s.:\-\*#`"']+|[\s.:\-\*#`"']+$/g, '')
        .trim();
        
      if (!seenNumbers.has(currentChapNum)) {
        seenNumbers.add(currentChapNum);
        chapters.push({
          title: titleText || `Chapter ${currentChapNum}`,
          number: currentChapNum
        });
        currentChapNum++;
      }
    }
  }
  return chapters;
};

const getFallbackChapters = (length: string): { title: string; number: number }[] => {
  if (length === 'Flash Fiction') {
    return [{ number: 1, title: 'Flash Narrative' }];
  } else if (length === 'Short Story') {
    return [
      { number: 1, title: 'Inception' },
      { number: 2, title: 'Confrontation' },
      { number: 3, title: 'Resolution' }
    ];
  } else if (length === 'Novelette') {
    return [
      { number: 1, title: 'The Call to Threshold' },
      { number: 2, title: 'The Descent & Complications' },
      { number: 3, title: 'The Dark Climax' },
      { number: 4, title: 'The Resonant Echoes' }
    ];
  } else {
    return [
      { number: 1, title: 'The Catalyst' },
      { number: 2, title: 'Entering the Maze' },
      { number: 3, title: 'The Deep Shadows' },
      { number: 4, title: 'The Breaking Point' },
      { number: 5, title: 'The Climax of Fire' },
      { number: 6, title: 'The Legacy' }
    ];
  }
};

export default function App() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('herm_genres') || '[]'); } catch { return []; }
  });
  const [themes, setThemes] = useState(() => localStorage.getItem('herm_themes') || '');
  const [aim, setAim] = useState(() => localStorage.getItem('herm_aim') || '');
  const [generationModel, setGenerationModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview'>(() => {
    return (localStorage.getItem('herm_model') as any) || 'gemini-3.5-flash';
  });
  const [storyLength, setStoryLength] = useState<string>(() => {
    return localStorage.getItem('herm_story_length') || 'Novelette';
  });
  const [storyChapters, setStoryChapters] = useState<ChapterProgress[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('herm_chapters') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedDisplayExpert, setSelectedDisplayExpert] = useState<string | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  
  // Custom literary editing and metrics suite state
  const [storyTitle, setStoryTitle] = useState(() => {
    return localStorage.getItem('herm_story_title') || 'The Obsidian Spire';
  });
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [manualTextBuffer, setManualTextBuffer] = useState('');
  const [chapterRefinePrompt, setChapterRefinePrompt] = useState('');

  const handleExpandIdeas = async () => {
    setIsExpanding(true);
    setError(null);
    try {
      const data = await expandIdeas(selectedGenres, themes, aim);
      if (data.genres && data.genres.length > 0) {
        setSelectedGenres(data.genres);
      }
      if (data.themes) {
        setThemes(data.themes);
      }
      if (data.aim) {
        setAim(data.aim);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to brainstorm and expand core ideas.');
    } finally {
      setIsExpanding(false);
    }
  };
  
  const [experts, setExperts] = useState<Expert[]>(() => {
    const saved = localStorage.getItem('hermeneutic_experts_v4');
    return saved ? JSON.parse(saved) : DEFAULT_EXPERTS;
  });
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExpert, setCurrentExpert] = useState<string>('Idle');
  
  const [cycleData, setCycleData] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('herm_cycle') || '{}'); } catch { return {}; }
  });
  const [completedExperts, setCompletedExperts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('herm_completed') || '[]'); } catch { return []; }
  });
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'inputs' | 'pipeline' | 'draft'>('inputs');
  
  const [iterationPrompt, setIterationPrompt] = useState('');
  const [draftHistory, setDraftHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('herm_history') || '[]'); } catch { return []; }
  });
  
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('hermeneutic_saved_stories');
    if (saved) {
      try {
        setSavedStories(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved stories', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('herm_genres', JSON.stringify(selectedGenres));
    localStorage.setItem('herm_themes', themes);
    localStorage.setItem('herm_aim', aim);
    localStorage.setItem('herm_model', generationModel);
    localStorage.setItem('herm_story_length', storyLength);
    localStorage.setItem('herm_story_title', storyTitle);
    localStorage.setItem('herm_cycle', JSON.stringify(cycleData));
    localStorage.setItem('herm_completed', JSON.stringify(completedExperts));
    localStorage.setItem('herm_history', JSON.stringify(draftHistory));
  }, [selectedGenres, themes, aim, generationModel, storyLength, storyTitle, cycleData, completedExperts, draftHistory]);

  // Whenever currentExpert changes during generation, auto-select it for real-time viewing unless overridden by user
  useEffect(() => {
    if (isGenerating && currentExpert !== 'Idle') {
      setSelectedDisplayExpert(currentExpert);
    }
  }, [currentExpert, isGenerating]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cycleData, currentExpert]);

  const handleSaveExperts = (newExperts: Expert[]) => {
    setExperts(newExperts);
    localStorage.setItem('hermeneutic_experts_v4', JSON.stringify(newExperts));
  };

  const downloadStoryAsTxt = () => {
    if (!currentDisplayDraft) return;
    const element = document.createElement("a");
    const file = new Blob([currentDisplayDraft], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    const projSafe = storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || 'story';
    const stepSafe = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || 'draft';
    element.download = `${projSafe}_${stepSafe}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadStoryAsRtf = () => {
    if (!currentDisplayDraft) return;
    // Simple basic Rich Text Format (RTF) compiler supporting paragraph breaks
    const cleanText = currentDisplayDraft
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n\n/g, '\\par\\par ')
      .replace(/\n/g, '\\par ');
    const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}\r\n\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs24 ${cleanText}\r\n}`;
    const element = document.createElement("a");
    const file = new Blob([rtfContent], {type: 'application/rtf;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    const projSafe = storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || 'story';
    const stepSafe = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || 'polished';
    element.download = `${projSafe}_${stepSafe}.rtf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const triggerChapterDownload = (chap: ChapterProgress, format: 'txt' | 'rtf' = 'txt') => {
    const textToDownload = chap.polished || chap.draft;
    if (!textToDownload) return;
    const cleanContent = sanitizeUtf8(`## Chapter ${chap.number}: ${chap.title}\n\n${textToDownload}`);
    
    const element = document.createElement("a");
    const filenameBase = `chapter_${chap.number}_${chap.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") || 'story'}`;
    
    if (format === 'rtf') {
      const escapedText = cleanContent
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\n\n/g, '\\par\\par ')
        .replace(/\n/g, '\\par ');
      const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}\r\n\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs24 ${escapedText}\r\n}`;
      const file = new Blob([rtfContent], {type: 'application/rtf;charset=utf-8'});
      element.href = URL.createObjectURL(file);
      element.download = `${filenameBase}.rtf`;
    } else {
      const file = new Blob([cleanContent], {type: 'text/plain;charset=utf-8'});
      element.href = URL.createObjectURL(file);
      element.download = `${filenameBase}.txt`;
    }
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const saveCurrentStory = () => {
    if (!themes || !aim || draftHistory.length === 0) return;
    
    const newStory: SavedStory = {
      id: Date.now().toString(),
      title: storyTitle || 'Untitled Story',
      timestamp: Date.now(),
      genres: selectedGenres,
      themes,
      aim,
      draftHistory,
      cycleData,
      experts,
      storyChapters
    };
    
    const updatedStories = [newStory, ...savedStories];
    setSavedStories(updatedStories);
    localStorage.setItem('hermeneutic_saved_stories', JSON.stringify(updatedStories));
  };

  const loadStory = (story: SavedStory) => {
    setSelectedGenres(story.genres);
    setThemes(story.themes);
    setAim(story.aim);
    setStoryTitle(story.title || 'The Obsidian Spire');
    setDraftHistory(story.draftHistory);
    setCycleData(story.cycleData);
    if (story.experts) setExperts(story.experts);
    if (story.storyChapters) {
      setStoryChapters(story.storyChapters);
    } else {
      setStoryChapters([]);
    }
    setShowSaved(false);
  };

  const deleteStory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedStories = savedStories.filter(s => s.id !== id);
    setSavedStories(updatedStories);
    localStorage.setItem('hermeneutic_saved_stories', JSON.stringify(updatedStories));
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  // Prose statistics and AI Cliché verification
  const getProseStats = (text: string) => {
    if (!text) return { words: 0, readTime: 0, AIClichés: 0, score: 100, clichéMatches: [] as string[] };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const readTime = Math.ceil(words / 200);
    
    const cliches = [
      "delve", "tapestry", "testament", "beacon", "dance of", "echoes of", "whispered", "shrouded", 
      "intertwined", "cacophony", "reign", "resonate", "symphony of", "cradle", "harbinger", 
      "at a crossroads", "as if on cue", "only added to", "a grim reminder", "testament to", 
      "crucial role", "newfound", "whispers of the draft"
    ];
    
    let matchCount = 0;
    const found: string[] = [];
    cliches.forEach(c => {
      const regex = new RegExp(`\\b${c}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        matchCount += matches.length;
        found.push(`${c} (${matches.length}x)`);
      }
    });

    // Deduction logic: 1.5% per cliche keyword match, 3% per unique cliche pattern
    const score = Math.max(0, 100 - matchCount * 1.5 - found.length * 3);
    
    return {
      words,
      readTime,
      AIClichés: matchCount,
      clichéMatches: found,
      score: Math.round(score)
    };
  };

  // Save manual formatting rewrite
  const handleSaveManualEdit = () => {
    if (activeDisplayId === 'final') {
      const updatedHistory = [...draftHistory];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1] = manualTextBuffer;
      } else {
        updatedHistory.push(manualTextBuffer);
      }
      setDraftHistory(updatedHistory);
    } else if (
      activeDisplayId.startsWith('chapter_') ||
      activeDisplayId.startsWith('wordsmith_chapter_') ||
      activeDisplayId.startsWith('critic_chapter_') ||
      activeDisplayId.startsWith('editor_chapter_')
    ) {
      let chNum = 1;
      let mode = 'draft';
      if (activeDisplayId.startsWith('chapter_')) {
        const parts = activeDisplayId.split('_');
        chNum = parseInt(parts[1], 10);
        mode = parts[2];
      } else if (activeDisplayId.startsWith('wordsmith_chapter_')) {
        chNum = parseInt(activeDisplayId.replace('wordsmith_chapter_', ''), 10);
        mode = 'draft';
      } else if (activeDisplayId.startsWith('critic_chapter_')) {
        chNum = parseInt(activeDisplayId.replace('critic_chapter_', ''), 10);
        mode = 'critique';
      } else if (activeDisplayId.startsWith('editor_chapter_')) {
        chNum = parseInt(activeDisplayId.replace('editor_chapter_', ''), 10);
        mode = 'polished';
      }
      
      const updatedChapters = storyChapters.map(chap => {
        if (chap.number === chNum) {
          return {
            ...chap,
            [mode]: manualTextBuffer
          };
        }
        return chap;
      });
      setStoryChapters(updatedChapters);
      localStorage.setItem('herm_chapters', JSON.stringify(updatedChapters));
      
      const activeStitched = updatedChapters.map((c) => {
        return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
      }).join('\n\n\n');
      
      setCycleData(prev => ({ ...prev, wordsmith: activeStitched }));
    } else {
      setCycleData(prev => ({ ...prev, [activeDisplayId]: manualTextBuffer }));
    }
    
    setIsEditingManual(false);
  };

  // Highly modular Single-Chapter Selective Refiner Flow
  const handleGenerateSingleChapter = async (chapNumber: number, instructionText: string) => {
    if (isGenerating || !instructionText.trim()) return;
    
    setIsGenerating(true);
    const directives = getGenreDirectives(selectedGenres);
    setError(null);
    setIsEditingManual(false);
    
    try {
      const activeLengthObj = LENGTH_OPTIONS.find(o => o.id === storyLength) || LENGTH_OPTIONS[2];
      const chapters = [...storyChapters];
      const chapIndex = chapters.findIndex(c => c.number === chapNumber);
      if (chapIndex === -1) {
        throw new Error(`Chapter ${chapNumber} not found.`);
      }
      const chap = chapters[chapIndex];
      
      let previousChaptersText = '';
      for (let j = 0; j < chapIndex; j++) {
        previousChaptersText += `### Chapter ${chapters[j].number}: ${chapters[j].title}\n${chapters[j].polished || chapters[j].draft}\n\n`;
      }
      
      // Step A: Chapters wordsmith rewrite
      chap.status = 'drafting';
      chap.draft = '';
      chap.critique = '';
      chap.polished = '';
      setStoryChapters([...chapters]);
      localStorage.setItem('herm_chapters', JSON.stringify(chapters));
      
      setCurrentExpert(`wordsmith_chapter_${chap.number}`);
      setSelectedDisplayExpert(`chapter_${chap.number}_draft`);
      
      const wordsmithPrompt = `You are a master novelist revising Chapter ${chap.number}: "${chap.title}" of our ${storyLength} story.
Selected Genres: ${selectedGenres.join(', ')}
Themes & Context: ${themes}
Overall Aim/Pitch: ${aim}

${PROSE_AND_STYLE_MANDATES}

BACKGROUND WORLD-BUILDING LORE:
${cycleData['researcher']}

CHARACTER PSYCHOLOGICAL PROFILES:
${cycleData['character_profiler']}

DETAILED PLOT OUTLINE:
${cycleData['architect']}

${previousChaptersText ? `PREVIOUSLY GENERATED CHAPTERS (For narrative continuity and smooth tone transitions):\n${previousChaptersText}` : 'This is the FIRST chapter of the story. Formulate a gripping, evocative opening.'}

USER SPECIFIC REFINEMENT GUIDELINES FOR THIS REWRITE:
${instructionText}

Please rewrite the complete first draft of Chapter ${chap.number}: "${chap.title}". Apply the user's specific instructions with meticulous accuracy while adhering perfectly to absolute verisimilitude. Provide full, richly padded literature, extensive scenes, fully spoken dialogues, detailed environments, and characters' interior psychology. Do NOT summarize or use quick narrative jumps. Avoid adding meta-commentary or chat of any kind.`;

      const wsSy = `You are an award-winning literary novelist specializing in high-fidelity prose and subtext.\n\nGENRE-SPECIFIC SENSORY TEXTURES & DIALOGUE STYLE:\n${directives.wordsmithFocus}`;

      const wsResult = await runExpertStream(
        wsSy,
        wordsmithPrompt,
        (chunk) => {
          chap.draft += chunk;
          
          const activeStitched = chapters.map((c, idx) => {
            if (idx < chapIndex) return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
            if (idx === chapIndex) return `## Chapter ${c.number}: ${c.title}\n\n${chap.draft}`;
            return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
          }).filter(Boolean).join('\n\n');
          
          setCycleData(prev => ({ ...prev, wordsmith: activeStitched }));
          setStoryChapters([...chapters]);
        },
        generationModel
      );
      
      chap.draft = wsResult;
      chap.status = 'critiquing';
      setStoryChapters([...chapters]);
      localStorage.setItem('herm_chapters', JSON.stringify(chapters));
      
      // Step B: Chapters critique review
      setCurrentExpert(`critic_chapter_${chap.number}`);
      setSelectedDisplayExpert(`chapter_${chap.number}_critique`);
      
      const criticPrompt = `You are a professional literary critic, historical accuracy consultant, and rigorous technical editor. Evaluate the newly revised draft of Chapter ${chap.number}: "${chap.title}" of our ${storyLength} story.

${PROSE_AND_STYLE_MANDATES}

ORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Your Source of Absolute Truth):
${cycleData['researcher']}

THE USER'S REFOCUS INSTRUCTIONS:
${instructionText}

REVISED CHAPTER ${chap.number} DRAFT:
${chap.draft}

Perform a painstaking, rigorous double audit of this chapter:
1. FACTUAL AND TECHNICAL SYSTEM AUDIT: Crosscheck every mechanical, historical, chemical, and physical detail in the draft against the reference World Bible. Flag any contradictions.
2. STYLISTIC AND COGNITIVE AI CLEANSE: List every violation of the STRICT STYLE AND ANTI-AI-SLOP PROSE MANDATES. Identify monotonous sentences, trailing helper clauses, clichéd keywords, and poetic closures.

Provide clear, numbered revision instructions for the Editor to polish this specific chapter.`;

      const criticSy = `You are a professional literary critic, historical accuracy consultant, and copyeditor.\n\nGENRE-SPECIFIC VERIFICATION DIRECTIVES:\n${directives.criticFocus}`;

      const criticResult = await runExpertStream(
        criticSy,
        criticPrompt,
        (chunk) => {
          chap.critique += chunk;
          setStoryChapters([...chapters]);
        },
        generationModel
      );
      
      chap.critique = criticResult;
      chap.status = 'polishing';
      setStoryChapters([...chapters]);
      localStorage.setItem('herm_chapters', JSON.stringify(chapters));
      
      // Step C: Chapters editor polish
      setCurrentExpert(`editor_chapter_${chap.number}`);
      setSelectedDisplayExpert(`chapter_${chap.number}_polished`);
      
      const editorPrompt = `You are an elite senior fiction editor and master prose stylist. Produce the final polished cut of revised Chapter ${chap.number}: "${chap.title}", seamlessly implementing the critic's directives to remove all AI signatures and ensure absolute fidelity to the World Bible.

${PROSE_AND_STYLE_MANDATES}

ORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Your Source of Absolute Truth):
${cycleData['researcher']}

ORIGINAL CHAPTER DRAFT:
${chap.draft}

CRITIQUE & REVISION GUIDELINES:
${chap.critique}

Apply these revisions with clinical precision:
1. Re-engineer, polish, and seamlessly rewrite the draft based on the technical corrections and stylistic directives of the Critique. Resolve any technical inconsistencies by aligning descriptions 100% with the World Bible.
2. Ensure the prose has jagged, variable, human sentence lengths, rich active sensory verbs, zero AI crutch words (no "delve", "tapestry"), zero explanatory tellings, and finishes abruptly and organically without neat summaries or poetic closures.
3. Write the COMPLETE, fully realized, polished version of Chapter ${chap.number}: "${chap.title}". Ensure it starts and finishes beautifully without truncation or meta-text. Do not include any meta-commentary, notes, or intro headers other than the chapter title line.`;

      const editorSy = `You are an elite senior fiction editor and master prose stylist.\n\nGENRE-SPECIFIC EDITORIAL AND PROSE POLISHING RULES:\n${directives.wordsmithFocus}`;

      const editorResult = await runExpertStream(
        editorSy,
        editorPrompt,
        (chunk) => {
          chap.polished += chunk;
          
          const activeStitched = chapters.map((c, idx) => {
            if (idx < chapIndex) return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
            if (idx === chapIndex) return `## Chapter ${c.number}: ${c.title}\n\n${chap.polished}`;
            return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
          }).filter(Boolean).join('\n\n');
          
          setCycleData(prev => ({ ...prev, wordsmith: activeStitched }));
          setStoryChapters([...chapters]);
        },
        generationModel
      );
      
      chap.polished = editorResult;
      chap.status = 'completed';
      setStoryChapters([...chapters]);
      localStorage.setItem('herm_chapters', JSON.stringify(chapters));
      
      const finalFullStory = chapters.map(c => `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`).join('\n\n\n');
      setCycleData(prev => ({ ...prev, wordsmith: finalFullStory }));
      setDraftHistory([finalFullStory]);
      setChapterRefinePrompt('');
      setSelectedDisplayExpert(`chapter_${chap.number}_polished`);
      
    } catch (err: any) {
      console.error('Single chapter regeneration failed:', err);
      setError(err.message || 'Single chapter regeneration failed.');
    } finally {
      setCurrentExpert('Idle');
      setIsGenerating(false);
    }
  };

  const clearProgress = () => {
    if (window.confirm('Are you sure you want to clear all current progress? This cannot be undone.')) {
      setCycleData({});
      setCompletedExperts([]);
      setDraftHistory([]);
      setStoryChapters([]);
      localStorage.removeItem('herm_chapters');
      setError(null);
    }
  };

  const handleGenerate = async (resume = false) => {
    if (!themes || !aim || selectedGenres.length === 0 || experts.length === 0) return;
    
    setIsGenerating(true);
    const directives = getGenreDirectives(selectedGenres);
    setError(null);
    
    let newCycleData: Record<string, string> = resume ? { ...cycleData } : {};
    let newCompleted = resume ? [...completedExperts] : [];
    
    if (!resume) {
      setCycleData({});
      setCompletedExperts([]);
      setDraftHistory([]);
      setStoryChapters([]);
      localStorage.removeItem('herm_chapters');
    }
    
    try {
      const activeLengthObj = LENGTH_OPTIONS.find(o => o.id === storyLength) || LENGTH_OPTIONS[2];
      
      for (const expert of experts) {
        if (resume && newCompleted.includes(expert.id)) {
          continue;
        }
        
        setCurrentExpert(expert.id);
        setMobileTab('pipeline');
        
        // INTERcept Wordsmith stage to write, critique, and polish chapter-by-chapter
        if (expert.id === 'wordsmith') {
          let chapters: ChapterProgress[] = [];
          
          if (resume) {
            const savedChaps = localStorage.getItem('herm_chapters');
            if (savedChaps) {
              try { chapters = JSON.parse(savedChaps); } catch { chapters = []; }
            }
          }
          
          if (chapters.length === 0) {
            // First time or parsing failed - construct chapters from the plot architect's outline
            const parsed = parseChaptersFromOutline(newCycleData['architect'] || '');
            const minChaptersRequired = storyLength === 'Flash Fiction' ? 1 : (storyLength === 'Short Story' ? 2 : (storyLength === 'Novelette' ? 3 : 5));
            
            if (parsed.length < minChaptersRequired) {
              const fallback = getFallbackChapters(storyLength);
              chapters = fallback.map(f => ({
                number: f.number,
                title: f.title,
                status: 'pending',
                draft: '',
                critique: '',
                polished: ''
              }));
            } else {
              chapters = parsed.map(p => ({
                number: p.number,
                title: p.title,
                status: 'pending',
                draft: '',
                critique: '',
                polished: ''
              }));
            }
          }
          
          setStoryChapters(chapters);
          localStorage.setItem('herm_chapters', JSON.stringify(chapters));
          
          // Execute sequential Chapter Loop
          for (let i = 0; i < chapters.length; i++) {
            const chap = chapters[i];
            if (resume && chap.status === 'completed') {
              continue;
            }
            
            // 1. Chapter Draft (Wordsmith Phase)
            if (chap.status === 'pending' || chap.status === 'drafting') {
              chap.status = 'drafting';
              setStoryChapters([...chapters]);
              localStorage.setItem('herm_chapters', JSON.stringify(chapters));
              setCurrentExpert(`wordsmith_chapter_${chap.number}`);
              setSelectedDisplayExpert(`chapter_${chap.number}_draft`);
              
              let previousChaptersText = '';
              for (let j = 0; j < i; j++) {
                previousChaptersText += `### Chapter ${chapters[j].number}: ${chapters[j].title}\n${chapters[j].polished || chapters[j].draft}\n\n`;
              }
              
              const wordsmithPrompt = `You are a master novelist writing Chapter ${chap.number}: "${chap.title}" of a ${storyLength} story.
Selected Genres: ${selectedGenres.join(', ')}
Themes & Context: ${themes}
Overall Aim/Pitch: ${aim}

${PROSE_AND_STYLE_MANDATES}

BACKGROUND WORLD-BUILDING LORE:
${newCycleData['researcher']}

CHARACTER PSYCHOLOGICAL PROFILES:
${newCycleData['character_profiler']}

DETAILED PLOT OUTLINE:
${newCycleData['architect']}

${previousChaptersText ? `PREVIOUSLY GENERATED CHAPTERS (For narrative continuity and smooth tone transitions):
${previousChaptersText}` : 'This is the FIRST chapter of the story. Formulate a gripping, evocative opening that anchors the setting and hooks the reader.'}

Please write the complete first draft of Chapter ${chap.number}: "${chap.title}".
Format and styling guidelines: ${activeLengthObj.prompts.wordsmith}
Provide full, richly padded literature, extensive scenes, fully spoken dialogues, detailed environments, and characters' interior psychology. Do NOT summarize or use quick narrative jumps. Avoid adding meta-commentary or chat or instructions of any kind. Go straight to writing the story.`;
              
              chap.draft = '';
              setStoryChapters([...chapters]);
              
              const activeStitched = chapters.map((c, idx) => {
                if (idx < i) return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
                if (idx === i) return `## Chapter ${c.number}: ${c.title}\n\n${chap.draft}`;
                return '';
              }).filter(Boolean).join('\n\n');
              
              newCycleData['wordsmith'] = activeStitched;
              setCycleData({ ...newCycleData });
              
              // Cool-off buffer to prevent rate limits on standard/free keys
              await new Promise(resolve => setTimeout(resolve, 3500));
              
              const wordsmithSyValue = `${expert.systemInstruction}\n\nGENRE-SPECIFIC SENSORY TEXTURES & DIALOGUE STYLE:\n${directives.wordsmithFocus}`;

              const result = await runExpertStream(
                wordsmithSyValue,
                wordsmithPrompt,
                (chunk) => {
                  chap.draft += chunk;
                  
                  const activeStitched = chapters.map((c, idx) => {
                    if (idx < i) return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
                    if (idx === i) return `## Chapter ${c.number}: ${c.title}\n\n${chap.draft}`;
                    return '';
                  }).filter(Boolean).join('\n\n');
                  
                  newCycleData['wordsmith'] = activeStitched;
                  setCycleData({ ...newCycleData });
                  setStoryChapters([...chapters]);
                },
                generationModel
              );
              
              chap.draft = result;
              chap.status = 'critiquing';
              setStoryChapters([...chapters]);
              localStorage.setItem('herm_chapters', JSON.stringify(chapters));
            }
            
            // 2. Chapter Evaluation (Critic Phase)
            if (chap.status === 'critiquing') {
              setCurrentExpert(`critic_chapter_${chap.number}`);
              setSelectedDisplayExpert(`chapter_${chap.number}_critique`);
              
              const criticPrompt = `You are a professional literary critic, historical accuracy consultant, and rigorous technical editor. Evaluate the newly written draft of Chapter ${chap.number}: "${chap.title}" of our ${storyLength} story.

${PROSE_AND_STYLE_MANDATES}

ORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Your Source of Absolute Truth):
${newCycleData['researcher']}

THE PLOT ARCHITECT'S OUTLINE FOR THIS CHAPTER:
${newCycleData['architect']}

WRITTEN CHAPTER ${chap.number} DRAFT:
${chap.draft}

Perform a painstaking, rigorous double audit of this chapter:
1. FACTUAL AND TECHNICAL SYSTEM AUDIT: Crosscheck every mechanical, historical, chemical, and physical detail in the draft against the invariants and constraints in the reference World Bible. Flag any contradictions (e.g., fuel type discrepancies, wrong weight tons, unrealistic component failures, inaccurate historical dates, sci-fi drift).
2. STYLISTIC AND COGNITIVE AI CLEANSE: List every violation of the STRICT STYLE AND ANTI-AI-SLOP PROSE MANDATES. Identify monotonous sentences, trailing helper clauses (", participle..."), clichéd keywords (e.g., "delve", "tapestry"), instances of showing-not-telling, and poetic summaries.

Provide clear, numbered, non-speculative revision directives for the Editor to refine, rewrite, and elevate this chapter.`;
              
              chap.critique = '';
              setStoryChapters([...chapters]);
              
              // Cool-off buffer to prevent rate limits on standard/free keys
              await new Promise(resolve => setTimeout(resolve, 3500));
              
              const criticSyValue = `You are a professional literary critic, historical accuracy consultant, and copyeditor.\n\nGENRE-SPECIFIC VERIFICATION DIRECTIVES:\n${directives.criticFocus}`;

              const result = await runExpertStream(
                criticSyValue,
                criticPrompt,
                (chunk) => {
                  chap.critique += chunk;
                  setStoryChapters([...chapters]);
                },
                generationModel
              );
              
              chap.critique = result;
              chap.status = 'polishing';
              setStoryChapters([...chapters]);
              localStorage.setItem('herm_chapters', JSON.stringify(chapters));
            }
            
            // 3. Chapter Revision & Polish (Editor Phase)
            if (chap.status === 'polishing') {
              setCurrentExpert(`editor_chapter_${chap.number}`);
              setSelectedDisplayExpert(`chapter_${chap.number}_polished`);
              
              const editorPrompt = `You are an elite senior fiction editor and master prose stylist. Produce the final polished cut of Chapter ${chap.number}: "${chap.title}", seamlessly implementing the critic's directives to remove all AI signatures and ensure absolute fidelity to the World Bible.

${PROSE_AND_STYLE_MANDATES}

ORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Your Source of Absolute Truth):
${newCycleData['researcher']}

ORIGINAL CHAPTER DRAFT:
${chap.draft}

CRITIQUE & REVISION GUIDELINES:
${chap.critique}

Apply these revisions with clinical precision:
1. Re-engineer, polish, and seamlessly rewrite the draft based on the technical corrections and stylistic directives of the Critique. Resolve any technical inconsistencies by aligning descriptions 100% with the World Bible.
2. Ensure the prose has jagged, variable, human sentence lengths, rich active sensory verbs, zero AI crutch words (no "delve", "tapestry"), zero explanatory tellings, and finishes abruptly and organically without neat summaries or poetic closures.
3. Write the COMPLETE, fully realized, polished version of Chapter ${chap.number}: "${chap.title}". Ensure it starts and finishes beautifully without truncation or meta-text. Do not include any meta-commentary, notes, or intro headers other than the chapter title line.`;
              
              chap.polished = '';
              setStoryChapters([...chapters]);
              
              // Cool-off buffer to prevent rate limits on standard/free keys
              await new Promise(resolve => setTimeout(resolve, 3500));
              
              const editorSyValue = `You are an elite senior fiction editor and master prose stylist.\n\nGENRE-SPECIFIC EDITORIAL AND PROSE POLISHING RULES:\n${directives.wordsmithFocus}`;

              const result = await runExpertStream(
                editorSyValue,
                editorPrompt,
                (chunk) => {
                  chap.polished += chunk;
                  
                  const activeStitched = chapters.map((c, idx) => {
                    if (idx < i) return `## Chapter ${c.number}: ${c.title}\n\n${c.polished || c.draft}`;
                    if (idx === i) return `## Chapter ${c.number}: ${c.title}\n\n${chap.polished}`;
                    return '';
                  }).filter(Boolean).join('\n\n');
                  
                  newCycleData['wordsmith'] = activeStitched;
                  setCycleData({ ...newCycleData });
                  setStoryChapters([...chapters]);
                },
                generationModel
              );
              
              chap.polished = result;
              chap.status = 'completed';
              setStoryChapters([...chapters]);
              localStorage.setItem('herm_chapters', JSON.stringify(chapters));
            }
          }
          
          // Once the full chapter sequential loop is finished
          let finalFullStory = chapters.map(c => `## Chapter ${c.number}: ${c.title}\n\n${c.polished}`).join('\n\n\n');
          newCycleData['wordsmith'] = finalFullStory;
          setCycleData({ ...newCycleData });
          
          // SPECIAL FINAL PROCESS FOR NOVELLA: Restructure/split into multiple standard novella chapters to avoid excessively long segments
          if (storyLength === 'Novella') {
            setCurrentExpert('novella_splitter');
            setSelectedDisplayExpert('novella_splitter');
            
            const splitterPrompt = `You are an expert novel editor. We have generated a comprehensive multi-chapter draft for a Novella.
However, these chapters are excessively long and dense.
Your task is to take the entire narrative text and restructure/split it into a proper Novella format with 10 to 15 shorter, beautifully balanced and paced chapters.

For each newly created chapter:
1. Provide a beautiful, evocative chapter title (e.g., "Chapter 1: The Quiet Before", "Chapter 2: Drifting Shadows").
2. Ensure absolutely NO text is lost or summarized. You must preserve all prose, scenes, dialogue, description, and internal thoughts, simply splitting them at natural narrative breaks, cliffhangers, or scene transitions.
3. Keep the language exquisite, adding brief transition lines if necessary to open/close newly created chapters elegantly.

Here is the complete original text:
${finalFullStory}

Please output the restructured, split Novella. Use clear markdown headers like "## Chapter 1: [Title]" for each of the new chapters. Do not include any meta-commentary, notes, or chat. Start directly with Chapter 1.`;
            
            newCycleData['novella_splitter'] = '';
            setCycleData({ ...newCycleData });
            
            // Cool-off buffer to prevent rate limits on standard/free keys
            await new Promise(resolve => setTimeout(resolve, 3500));
            
            const splitResult = await runExpertStream(
              'You are a meticulous novel structuring editor. You split long manuscripts into beautifully proportioned, pacing-optimized chapters without losing a single word of prose.',
              splitterPrompt,
              (chunk) => {
                newCycleData['novella_splitter'] += chunk;
                // Stream it to the wordsmith slot so the user can see it in real-time
                newCycleData['wordsmith'] = newCycleData['novella_splitter'];
                setCycleData({ ...newCycleData });
              },
              generationModel
            );
            
            newCycleData['novella_splitter'] = splitResult;
            newCycleData['wordsmith'] = splitResult;
            setCycleData({ ...newCycleData });
            
            // Parse newly split chapters to update the sidebar navigator beautifully
            const parsedSplit = parseChaptersFromOutline(splitResult);
            if (parsedSplit.length > 0) {
              const splitChaptersText = splitResult.split(/(?=##\s*Chapter\s*\d+)/gi);
              const newChaptersList: ChapterProgress[] = [];
              let chapIndex = 1;
              for (const splitText of splitChaptersText) {
                if (!splitText.trim()) continue;
                
                const firstLine = splitText.split('\n')[0] || '';
                const titleMatch = /##\s*Chapter\s*(\d+)[\s:-]+([^\n]+)/gi.exec(firstLine);
                const title = titleMatch ? titleMatch[2].trim().replace(/^[:\-\s#*`"']+|[:\-\s#*`"']+$/g, '') : `Chapter ${chapIndex}`;
                const cleanContent = splitText.replace(firstLine, '').trim();
                
                newChaptersList.push({
                  number: chapIndex,
                  title: title,
                  status: 'completed',
                  draft: cleanContent,
                  critique: 'Split and restructured into real Novella format.',
                  polished: cleanContent
                });
                chapIndex++;
              }
              if (newChaptersList.length > 0) {
                chapters = newChaptersList;
                setStoryChapters(newChaptersList);
                localStorage.setItem('herm_chapters', JSON.stringify(newChaptersList));
              }
            }
          }
          
          newCompleted.push('wordsmith');
          setCompletedExperts([...newCompleted]);
          continue;
        }
        
        // Auto-fulfill Critic & Editor stages if we hit them in the parent loop
        // since they got executed inside the Chapter loop
        if (expert.id === 'critic') {
          newCycleData['critic'] = 'The Critic analyzed each chapter sequentially inside the loop, providing detailed revision guidelines prior to editorial cut.';
          setCycleData({ ...newCycleData });
          newCompleted.push('critic');
          setCompletedExperts([...newCompleted]);
          continue;
        }
        
        if (expert.id === 'editor') {
          newCycleData['editor'] = newCycleData['wordsmith'] || '';
          setCycleData({ ...newCycleData });
          newCompleted.push('editor');
          setCompletedExperts([...newCompleted]);
          continue;
        }
        
        // --- Standard Global Stages (Researcher, Character Profiler, Architect) ---
        let prompt = expert.promptTemplate;
        prompt = prompt.replace(/\{\{genres\}\}/g, selectedGenres.join(', '));
        prompt = prompt.replace(/\{\{themes\}\}/g, themes);
        prompt = prompt.replace(/\{\{aim\}\}/g, aim);
        
        const expertPromptId = expert.id as keyof typeof activeLengthObj.prompts;
        const lengthPrompt = activeLengthObj.prompts[expertPromptId] || activeLengthObj.prompts.wordsmith;
        prompt = prompt.replace(/\{\{length\}\}/g, lengthPrompt);
        
        for (const prevExpert of experts) {
          const escapedName = prevExpert.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\{\\{${escapedName}\\}\\}`, 'g');
          prompt = prompt.replace(regex, () => newCycleData[prevExpert.id] || '');
        }
        
        newCycleData[expert.id] = '';
        setCycleData({ ...newCycleData });
        
        // Cool-off buffer to prevent rate limits on standard/free keys
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let syInstruction = expert.systemInstruction;
        if (expert.id === 'researcher') {
          syInstruction += `\n\nGENRE-SPECIFIC SYSTEM RESEARCH FOCUS:\n${directives.researcherFocus}`;
        } else if (expert.id === 'character_profiler') {
          syInstruction += `\n\nGENRE-SPECIFIC CHARACTERIZATION REVERSALS:\n${directives.characterFocus}`;
        } else if (expert.id === 'architect') {
          syInstruction += `\n\nGENRE-SPECIFIC NARRATIVE PACING TENSIONS:\n${directives.architectFocus}`;
        }

        const result = await runExpertStream(
          syInstruction,
          prompt,
          (chunk) => {
            newCycleData[expert.id] += chunk;
            setCycleData({ ...newCycleData });
          },
          generationModel
        );
        newCycleData[expert.id] = result;
        setCycleData({ ...newCycleData });
        
        newCompleted.push(expert.id);
        setCompletedExperts([...newCompleted]);
      }
      
      const finalExpert = experts[experts.length - 1];
      const finalCompiledStory = newCycleData[finalExpert.id] || newCycleData['wordsmith'] || '';
      setDraftHistory([finalCompiledStory]);
      setMobileTab('draft');
      setSelectedDisplayExpert('final');
      
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err.message || 'Generation failed. You can resume from where it left off.');
    } finally {
      setCurrentExpert('Idle');
      setIsGenerating(false);
    }
  };

  const handleIterate = async (resume = false) => {
    if (!iterationPrompt || draftHistory.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    const currentStory = draftHistory[draftHistory.length - 1];
    
    let newCycleData = { ...cycleData };
    let newCompleted = [...completedExperts];
    
    try {
      setMobileTab('pipeline');
      
      if (!resume || !newCompleted.includes('iteration_critic')) {
        setCurrentExpert('iteration_critic');
        const activeLengthObj = LENGTH_OPTIONS.find(o => o.id === storyLength) || LENGTH_OPTIONS[2];
        const critiquePrompt = `Current Draft:\n${currentStory}\n\nORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Your Source of Absolute Truth):\n${newCycleData['researcher'] || 'None'}\n\nUser Feedback/Prompt for Iteration: ${iterationPrompt}\n\nTarget Story Format & Length Guidelines:\n${activeLengthObj.prompts.critic}\n\n${PROSE_AND_STYLE_MANDATES}\n\nAnalyze the user's feedback and the current draft against our World Bible. Provide specific instructions for the Editor on how to revise the draft to incorporate this feedback while maintaining narrative cohesion, technical accuracy, and satisfying modern literary excellence standards of verisimilitude. Evaluate and direct fixes for any AI-writing traits (monotonous prose rhythms, overused metaphors, lack of subtext showing, technical discontinuity, neat/poetic summarizing closures).`;
        
        newCycleData['iteration_critic'] = '';
        setCycleData({ ...newCycleData });
        
        // Cool-off buffer to prevent rate limits on standard/free keys
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        const critiqueResult = await runExpertStream(
          'You are a constructively harsh literary critic. Translate user feedback into actionable technical and stylistic revision steps.',
          critiquePrompt,
          (chunk) => {
            newCycleData['iteration_critic'] += chunk;
            setCycleData({ ...newCycleData });
          },
          generationModel
        );
        newCycleData['iteration_critic'] = critiqueResult;
        newCompleted.push('iteration_critic');
        setCompletedExperts([...newCompleted]);
      }

      if (!resume || !newCompleted.includes('iteration_editor')) {
        setCurrentExpert('iteration_editor');
        const activeLengthObj = LENGTH_OPTIONS.find(o => o.id === storyLength) || LENGTH_OPTIONS[2];
        const editorPrompt = `Current Draft:\n${currentStory}\n\nORIGINAL WORLD & TECHNICAL REFERENCE BIBLE (Absolute Truth Reference):\n${newCycleData['researcher'] || 'None'}\n\nRevision Instructions:\n${newCycleData['iteration_critic']}\n\nTarget Story Format & Length Guidelines:\n${activeLengthObj.prompts.editor}\n\n${PROSE_AND_STYLE_MANDATES}\n\nRevise the draft according to the instructions. Provide the complete revised story. Ensure factual specs are perfectly aligned with the World Bible. Ensure the final story is a cohesive, fully complete narrative that starts and finishes elegantly, strictly eliminating any mechanical, predictable, or summarizing traits of AI writing. Apply the STRICT STYLE AND ANTI-AI-SLOP PROSE MANDATES thoroughly.`;
        
        newCycleData['iteration_editor'] = '';
        setCycleData({ ...newCycleData });
        
        // Cool-off buffer to prevent rate limits on standard/free keys
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        const finalResult = await runExpertStream(
          'You are an elite senior book editor and copywriter. Apply revisions and strip AI signatures seamlessly.',
          editorPrompt,
          (chunk) => {
            newCycleData['iteration_editor'] += chunk;
            setCycleData({ ...newCycleData });
          },
          generationModel
        );
        newCycleData['iteration_editor'] = finalResult;
        newCompleted.push('iteration_editor');
        setCompletedExperts([...newCompleted]);
        
        setDraftHistory(prev => [...prev, finalResult]);
        setIterationPrompt('');
        setMobileTab('draft');
        
        setCompletedExperts(newCompleted.filter(id => id !== 'iteration_critic' && id !== 'iteration_editor'));
      }
      
    } catch (err: any) {
      console.error('Iteration failed:', err);
      setError(err.message || 'Iteration failed. You can resume from where it left off.');
    } finally {
      setCurrentExpert('Idle');
      setIsGenerating(false);
    }
  };

  const ExpertStatus = ({ role, icon: Icon, active, completed, selected }: { role: string, icon: any, active: boolean, completed: boolean, selected?: boolean }) => (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 select-none",
      selected ? "bg-orange-500/20 border-orange-500/50 text-orange-300" :
      active ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(255,78,0,0.15)]" : 
      completed ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10" : "bg-transparent border-transparent text-white/30"
    )}>
      <div className={cn(
        "p-2 rounded-lg",
        selected ? "bg-orange-500/30 text-orange-300" :
        active ? "bg-orange-500/20" : completed ? "bg-white/10" : "bg-white/5"
      )}>
        {active ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : completed ? <CheckCircle2 className="w-4 h-4 text-orange-400/80" /> : <Icon className="w-4 h-4" />}
      </div>
      <span className="font-medium text-sm tracking-wide">{role}</span>
    </div>
  );

  const hasStarted = Object.keys(cycleData).length > 0;
  
  let currentDisplayDraft = '';
  let displayTitle = "Final Draft";

  const activeDisplayId = selectedDisplayExpert || 'final';

  if (activeDisplayId === 'final') {
    currentDisplayDraft = draftHistory[draftHistory.length - 1] || '';
    displayTitle = "Final Story Draft";
    
    if (!currentDisplayDraft) {
      if (cycleData['iteration_editor']) {
        currentDisplayDraft = cycleData['iteration_editor'];
        displayTitle = 'Iteration Editor (Completed)';
      } else if (completedExperts.length > 0) {
        const lastCompleted = completedExperts[completedExperts.length - 1];
        currentDisplayDraft = cycleData[lastCompleted] || '';
        const expert = experts.find(e => e.id === lastCompleted);
        if (expert) {
          displayTitle = `${expert.name} (Completed)`;
        } else {
          displayTitle = `${lastCompleted} (Completed)`;
        }
      }
    }
  } else if (
    activeDisplayId.startsWith('chapter_') ||
    activeDisplayId.startsWith('wordsmith_chapter_') ||
    activeDisplayId.startsWith('critic_chapter_') ||
    activeDisplayId.startsWith('editor_chapter_')
  ) {
    let chNum = 1;
    let mode = 'draft';
    if (activeDisplayId.startsWith('chapter_')) {
      const parts = activeDisplayId.split('_');
      chNum = parseInt(parts[1], 10);
      mode = parts[2];
    } else if (activeDisplayId.startsWith('wordsmith_chapter_')) {
      chNum = parseInt(activeDisplayId.replace('wordsmith_chapter_', ''), 10);
      mode = 'draft';
    } else if (activeDisplayId.startsWith('critic_chapter_')) {
      chNum = parseInt(activeDisplayId.replace('critic_chapter_', ''), 10);
      mode = 'critique';
    } else if (activeDisplayId.startsWith('editor_chapter_')) {
      chNum = parseInt(activeDisplayId.replace('editor_chapter_', ''), 10);
      mode = 'polished';
    }
    
    const matchedChap = storyChapters.find(c => c.number === chNum);
    if (matchedChap) {
      if (mode === 'draft') {
        currentDisplayDraft = matchedChap.draft || '';
        displayTitle = `Chapter ${chNum}: ${matchedChap.title} (Draft)`;
      } else if (mode === 'critique') {
        currentDisplayDraft = matchedChap.critique || '';
        displayTitle = `Chapter ${chNum}: ${matchedChap.title} (Review Guidelines)`;
      } else if (mode === 'polished') {
        currentDisplayDraft = matchedChap.polished || '';
        displayTitle = `Chapter ${chNum}: ${matchedChap.title} (Polished Cut)`;
      }
    }
  } else {
    currentDisplayDraft = cycleData[activeDisplayId] || '';
    const expert = experts.find(e => e.id === activeDisplayId);
    if (expert) {
      displayTitle = currentExpert === activeDisplayId ? `${expert.name} (Generating...)` : `${expert.name} (Completed)`;
    } else if (activeDisplayId === 'iteration_critic') {
      displayTitle = currentExpert === 'iteration_critic' ? 'Iteration Critic (Generating...)' : 'Iteration Critic (Completed)';
    } else if (activeDisplayId === 'iteration_editor') {
      displayTitle = currentExpert === 'iteration_editor' ? 'Iteration Editor (Generating...)' : 'Iteration Editor (Completed)';
    } else if (activeDisplayId === 'novella_splitter') {
      currentDisplayDraft = cycleData['novella_splitter'] || '';
      displayTitle = currentExpert === 'novella_splitter' ? 'Novella Restructuring (Structuring...)' : 'Novella Restructuring (Completed)';
    } else {
      displayTitle = `${activeDisplayId}`;
    }
  }

  currentDisplayDraft = sanitizeUtf8(currentDisplayDraft);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0a0502] text-white/90 font-sans selection:bg-orange-500/30 overflow-hidden">
      {showPipelineSettings && (
        <PipelineEditor experts={experts} setExperts={handleSaveExperts} onClose={() => setShowPipelineSettings(false)} />
      )}
      {/* Left Sidebar - Inputs */}
      <div className={cn(
        "w-full lg:w-80 border-r border-white/10 bg-[#0f0805] p-6 flex-col h-full overflow-y-auto shrink-0",
        mobileTab === 'inputs' ? 'flex' : 'hidden lg:flex'
      )}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-serif text-xl tracking-wide text-white">Hermeneutic Weaver</h1>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowPipelineSettings(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
              title="Pipeline Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowSaved(!showSaved)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
              title="Saved Stories"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSaved ? (
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-white/50 mb-4">Saved Stories</h2>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {savedStories.length === 0 ? (
                <div className="text-white/30 text-sm italic text-center py-8">No saved stories yet.</div>
              ) : (
                savedStories.map(story => (
                  <div 
                    key={story.id} 
                    onClick={() => loadStory(story)}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all cursor-pointer group relative"
                  >
                    <h3 className="text-sm font-medium text-white/90 truncate pr-8">{story.title}</h3>
                    <p className="text-xs text-white/40 mt-1">{new Date(story.timestamp).toLocaleDateString()}</p>
                    <button 
                      onClick={(e) => deleteStory(story.id, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowSaved(false)}
              className="mt-4 w-full py-2 px-4 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-colors"
            >
              Back to Editor
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6 flex-1">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-transparent to-transparent border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-300">Flash 3.5 Brainstormer</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Enter minimal notes or select a genre, then click below. AI Flash will instantly expand your ideas into immersive settings, rich themes, and a cohesive story aim.
                </p>
                <button
                  type="button"
                  onClick={handleExpandIdeas}
                  disabled={isExpanding || isGenerating}
                  className="w-full py-2.5 px-3 bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20 active:scale-[0.98] font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExpanding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isExpanding ? "AI Fleshing Out Ideas..." : "Auto-Flesh Out Basic Ideas"}
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Story Project Title</label>
                <input
                  type="text"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="e.g., The Obsidian Spire, Whispers in Steel..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-white/90 font-medium"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Weaver Engine Model</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setGenerationModel('gemini-3.5-flash')}
                    className={cn(
                      "py-2 px-1 text-center text-[11px] font-semibold rounded-lg transition-all",
                      generationModel === 'gemini-3.5-flash'
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    Gemini 3.5 Flash
                    <span className="block text-[9px] text-white/30 font-normal">Super-Fast</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationModel('gemini-3.1-pro-preview')}
                    className={cn(
                      "py-2 px-1 text-center text-[11px] font-semibold rounded-lg transition-all",
                      generationModel === 'gemini-3.1-pro-preview'
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    Gemini 3.1 Pro
                    <span className="block text-[9px] text-white/30 font-normal">Deep Logic</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Target Story Length</label>
                <div className="grid grid-cols-2 gap-2">
                  {LENGTH_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStoryLength(option.id)}
                      className={cn(
                        "py-2 px-1.5 text-center rounded-xl transition-all border flex flex-col items-center justify-center cursor-pointer",
                        storyLength === option.id
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                          : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10 border-transparent"
                      )}
                    >
                      <span className="text-[11px] font-semibold">{option.label}</span>
                      <span className="text-[9px] text-white/30 font-normal">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full border transition-all",
                        selectedGenres.includes(g) 
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-300" 
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Themes & Content Cues</label>
                <textarea
                  value={themes}
                  onChange={e => setThemes(e.target.value)}
                  placeholder="e.g., betrayal, artificial consciousness, a hidden city..."
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none placeholder:text-white/20"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold tracking-widest uppercase text-white/50">Overall Story Aim</label>
                <textarea
                  value={aim}
                  onChange={e => setAim(e.target.value)}
                  placeholder="e.g., A tragic hero's journey ending in a bittersweet sacrifice..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all resize-none placeholder:text-white/20"
                />
              </div>

              {selectedGenres.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white/50 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>Active Agent Specialties</span>
                  </label>
                  <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3.5 space-y-3">
                    <div className="text-[11px] leading-relaxed text-white/60">
                      The Hermeneutic Cycle has specialized the sequential agents for your selected genre combination:
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedGenres.map(g => {
                        const spec = GENRE_SPECS[g];
                        if (!spec) return null;
                        return (
                          <div key={g} className="text-[10px] bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="font-bold text-orange-400 block mb-0.5">{g} Specialty</span>
                            <p className="text-white/50 leading-normal">{spec.wordsmithFocus.replace(/^[A-Z\s&]+:\s*/, '')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {completedExperts.length > 0 && completedExperts.length < experts.length && !isGenerating ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerate(true)}
                    className="flex-1 py-3 px-4 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </button>
                  <button
                    onClick={() => handleGenerate(false)}
                    className="flex-1 py-3 px-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating || !themes || !aim || selectedGenres.length === 0 || experts.length === 0}
                  className="w-full py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating && currentExpert !== 'Idle' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Weaving Story...</>
                  ) : (
                    <><PenTool className="w-4 h-4" /> {completedExperts.length === experts.length ? 'Generate New Story' : 'Start Generation'}</>
                  )}
                </button>
              )}
              
              {hasStarted && !isGenerating && (
                <button
                  onClick={clearProgress}
                  className="w-full py-3 px-4 bg-red-500/10 text-red-400 font-medium rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Clear Progress
                </button>
              )}
              
              {draftHistory.length > 0 && (
                <button
                  onClick={saveCurrentStory}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Story
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex-col h-full overflow-hidden relative bg-black/40 backdrop-blur-sm",
        mobileTab === 'draft' || mobileTab === 'pipeline' ? 'flex' : 'hidden lg:flex'
      )}>
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-red-900/10 blur-[150px] rounded-full mix-blend-screen" />
        </div>

        {hasStarted ? (
          <div className="flex-1 flex overflow-hidden z-10 min-w-0">
            {/* Expert Pipeline Visualization */}
            <div className={cn(
              "w-full lg:w-64 border-r border-white/5 bg-black/20 backdrop-blur-md p-6 flex flex-col gap-2 overflow-y-auto shrink-0 select-none",
              mobileTab === 'pipeline' ? 'flex' : 'hidden lg:flex'
            )}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">The Cycle</h3>
              <div className="space-y-1.5">
                {experts.map((expert) => (
                  <div
                    key={expert.id}
                    onClick={() => {
                      if (cycleData[expert.id] || currentExpert === expert.id) {
                        setSelectedDisplayExpert(expert.id);
                        setMobileTab('draft');
                      }
                    }}
                    className={cn(
                      "transition-all",
                      (cycleData[expert.id] || currentExpert === expert.id) ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                    )}
                    title={!(cycleData[expert.id] || currentExpert === expert.id) ? "This stage has not been executed yet." : "View stage output"}
                  >
                    <ExpertStatus 
                      role={expert.name} 
                      icon={PenTool} 
                      active={currentExpert === expert.id} 
                      completed={!!cycleData[expert.id] && currentExpert !== expert.id} 
                      selected={activeDisplayId === expert.id}
                    />
                  </div>
                ))}
              </div>

              {/* Sequential Chapter Progression Navigator */}
              {storyChapters.length > 0 && (
                <div className="mt-4 space-y-2 select-none">
                  <div className="my-2 border-t border-white/10" />
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2 flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5 text-orange-400" />
                    Chapters
                  </h3>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {storyChapters.map((chap) => {
                      const isActive = currentExpert.includes(`_chapter_${chap.number}`);
                      const isSelected = activeDisplayId.startsWith(`chapter_${chap.number}_`);
                      const isDrafting = currentExpert === `wordsmith_chapter_${chap.number}`;
                      const isCritiquing = currentExpert === `critic_chapter_${chap.number}`;
                      const isPolishing = currentExpert === `editor_chapter_${chap.number}`;
                      
                      return (
                        <div
                          key={chap.number}
                          onClick={() => {
                            if (chap.polished) {
                              setSelectedDisplayExpert(`chapter_${chap.number}_polished`);
                            } else if (chap.critique) {
                              setSelectedDisplayExpert(`chapter_${chap.number}_critique`);
                            } else if (chap.draft) {
                              setSelectedDisplayExpert(`chapter_${chap.number}_draft`);
                            } else {
                              return; // pending
                            }
                            setMobileTab('draft');
                          }}
                          className={cn(
                            "flex flex-col gap-1 p-2.5 rounded-xl border transition-all cursor-pointer",
                            isSelected 
                              ? "bg-orange-500/15 border-orange-500/40 text-orange-200" 
                              : isActive 
                              ? "bg-orange-500/5 border-orange-500/20 text-orange-300"
                              : chap.status === 'completed' 
                              ? "bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-white/10"
                              : "opacity-40 border-transparent text-white/30 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2 justify-between">
                            <span className="font-semibold text-xs tracking-wide truncate max-w-[140px]">
                              {chap.number}. {chap.title}
                            </span>
                            
                            <div>
                              {chap.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                              {isDrafting && <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />}
                              {isCritiquing && <Eye className="w-3.5 h-3.5 text-orange-300 animate-pulse" />}
                              {isPolishing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />}
                              {chap.status === 'pending' && <Lock className="w-3.5 h-3.5 text-white/20" />}
                            </div>
                          </div>
                          
                          {/* Inner Tabs to switch chapter versions */}
                          {(chap.draft || chap.critique || chap.polished) && (
                            <div className="flex items-center gap-1 mt-1 text-[9px] font-mono w-full">
                              {chap.draft && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDisplayExpert(`chapter_${chap.number}_draft`);
                                    setMobileTab('draft');
                                  }}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded cursor-pointer",
                                    activeDisplayId === `chapter_${chap.number}_draft` 
                                      ? "bg-orange-500/30 text-orange-200 font-bold" 
                                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  Draft
                                </button>
                              )}
                              {chap.critique && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDisplayExpert(`chapter_${chap.number}_critique`);
                                    setMobileTab('draft');
                                  }}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded cursor-pointer",
                                    activeDisplayId === `chapter_${chap.number}_critique` 
                                      ? "bg-orange-500/30 text-orange-200 font-bold" 
                                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  Review
                                </button>
                              )}
                              {chap.polished && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDisplayExpert(`chapter_${chap.number}_polished`);
                                    setMobileTab('draft');
                                  }}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded cursor-pointer",
                                    activeDisplayId === `chapter_${chap.number}_polished` 
                                      ? "bg-orange-500/30 text-orange-200 font-bold" 
                                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                  )}
                                >
                                  Polish
                                </button>
                              )}
                              
                              {/* Swift Single-Chapter Download Actions */}
                              <div className="ml-auto flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerChapterDownload(chap, 'txt');
                                  }}
                                  title={`Download Ch ${chap.number} as .txt`}
                                  className="p-1 rounded bg-white/5 text-white/40 hover:text-orange-400 hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center"
                                >
                                  <Download className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerChapterDownload(chap, 'rtf');
                                  }}
                                  title={`Download Ch ${chap.number} as .rtf`}
                                  className="p-1 rounded bg-white/5 text-white/40 hover:text-orange-400 hover:bg-white/15 transition-all cursor-pointer flex items-center justify-center"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {cycleData['iteration_critic'] && (
                <div className="space-y-1.5 mt-2">
                  <div className="my-2 border-t border-white/10" />
                  <div 
                    onClick={() => {
                      setSelectedDisplayExpert('iteration_critic');
                      setMobileTab('draft');
                    }}
                    className="cursor-pointer"
                  >
                    <ExpertStatus 
                      role="Iteration Critic" 
                      icon={Eye} 
                      active={currentExpert === 'iteration_critic'} 
                      completed={!!cycleData['iteration_critic'] && currentExpert !== 'iteration_critic'} 
                      selected={activeDisplayId === 'iteration_critic'}
                    />
                  </div>
                  <div 
                    onClick={() => {
                      if (cycleData['iteration_editor'] || currentExpert === 'iteration_editor') {
                        setSelectedDisplayExpert('iteration_editor');
                        setMobileTab('draft');
                      }
                    }}
                    className={cn(
                      "transition-all",
                      (cycleData['iteration_editor'] || currentExpert === 'iteration_editor') ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <ExpertStatus 
                      role="Iteration Editor" 
                      icon={RefreshCw} 
                      active={currentExpert === 'iteration_editor'} 
                      completed={!!cycleData['iteration_editor'] && currentExpert !== 'iteration_editor'} 
                      selected={activeDisplayId === 'iteration_editor'}
                    />
                  </div>
                </div>
              )}

              {/* View Final Story Button in pipeline list */}
              {draftHistory.length > 0 && (
                <div className="mt-4">
                  <div className="border-t border-white/10 my-2" />
                  <button
                    onClick={() => {
                      setSelectedDisplayExpert('final');
                      setMobileTab('draft');
                    }}
                    className={cn(
                      "w-full text-left py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2",
                      activeDisplayId === 'final'
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                        : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <BookOpen className="w-4 h-4" />
                    View Final Story
                  </button>
                </div>
              )}
              
              {/* Live Output Log */}
              <div className="mt-8 flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-4">Live Feed</h3>
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto text-[11px] font-mono text-white/50 leading-relaxed space-y-4 pr-2 custom-scrollbar"
                >
                  {experts.map(expert => (
                    currentExpert === expert.id && cycleData[expert.id] ? <div key={expert.id} className="opacity-80">{cycleData[expert.id]}</div> : null
                  ))}
                  {currentExpert === 'iteration_critic' && cycleData['iteration_critic'] && <div className="opacity-80">{cycleData['iteration_critic']}</div>}
                  {currentExpert === 'iteration_editor' && cycleData['iteration_editor'] && <div className="opacity-80">{cycleData['iteration_editor']}</div>}
                </div>
              </div>
            </div>

            {/* Story Display with min-w-0 and proper container parameters to solve right-cutoff */}
            <div className={cn(
              "flex-1 flex flex-col bg-black/40 backdrop-blur-sm relative min-w-0",
              mobileTab === 'draft' ? 'flex' : 'hidden lg:flex'
            )}>
              {/* Header HUD - Shows active progress of the Hermeneutic Cycle */}
              {isGenerating && (
                <div className="border-b border-white/10 bg-[#0f0805]/95 backdrop-blur-xl p-4 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-lg relative overflow-hidden">
                  {/* Subtle progress track bar at bottom of header */}
                  <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500" style={{
                    width: `${currentExpert === 'iteration_critic' ? 50 : currentExpert === 'iteration_editor' ? 100 : Math.round(((completedExperts.length + (cycleData[currentExpert]?.length ? 0.5 : 0)) / experts.length) * 100)}%`
                  }} />
                  
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                        <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                      </div>
                      <span className="absolute flex h-2 w-2 top-0 right-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                          {currentExpert === 'iteration_critic' || currentExpert === 'iteration_editor' ? 'Iteration Cycle Active' : 'Hermeneutic Cycle Active'}
                        </span>
                        <span className="text-[9px] py-0.5 px-1.5 rounded bg-white/5 border border-white/10 font-mono text-white/50">
                          {generationModel === 'gemini-3.1-pro-preview' ? 'Pro 3.1' : 'Flash 3.5'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-white/90 text-ellipse overflow-hidden truncate max-w-[400px]">
                        {currentExpert === 'iteration_critic' ? 'Iteration Critic evaluating feedback...' :
                         currentExpert === 'iteration_editor' ? 'Iteration Editor polishing draft...' :
                         currentExpert === 'novella_splitter' ? 'Novella Restructuring into 10-15 balanced chapters...' :
                         currentExpert.startsWith('wordsmith_chapter_') ? `Wordsmith drafting Chapter ${currentExpert.split('_')[2]}...` :
                         currentExpert.startsWith('critic_chapter_') ? `Critic reviewing Chapter ${currentExpert.split('_')[2]}...` :
                         currentExpert.startsWith('editor_chapter_') ? `Editor polishing Chapter ${currentExpert.split('_')[2]}...` :
                         `Step ${completedExperts.length + 1} of ${experts.length}: ${experts.find(e => e.id === currentExpert)?.name || 'Initializing agent...'}`}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">Overall Process</div>
                      <div className="text-[11px] font-mono font-medium text-orange-300">
                        {currentExpert === 'iteration_critic' ? 'Critique & Translation (50%)' :
                         currentExpert === 'iteration_editor' ? 'Prose Enrichment (95%)' :
                         `${completedExperts.length} / ${experts.length} Agents (${Math.round((completedExperts.length / experts.length) * 100)}%)`}
                      </div>
                    </div>
                    
                    <div className="h-8 w-px bg-white/10 hidden md:block" />
                    
                    <div className="text-right">
                      <div className="text-[9px] text-white/40 uppercase tracking-widest font-semibold font-mono">Character Buffer</div>
                      <div className="text-[11px] font-mono font-medium text-white/80">
                        {(cycleData[currentExpert] || '').length.toLocaleString()} chars
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar min-w-0">
                <div className="max-w-3xl mx-auto w-full">
                  {isGenerating && !currentDisplayDraft ? (
                    <div className="h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(255,100,0,0.15)]">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      </div>
                      <h3 className="text-xl font-serif text-white/95">
                        {currentExpert === 'iteration_critic' ? 'Consulting the Critique Analyst...' :
                         currentExpert === 'iteration_editor' ? 'Spurting Revision guidelines...' :
                         currentExpert === 'novella_splitter' ? 'Novella Restructuring...' :
                         currentExpert.startsWith('wordsmith_chapter_') ? `Writing Chapter ${currentExpert.split('_')[2]}...` :
                         currentExpert.startsWith('critic_chapter_') ? `Reviewing Chapter ${currentExpert.split('_')[2]}...` :
                         currentExpert.startsWith('editor_chapter_') ? `Polishing Chapter ${currentExpert.split('_')[2]}...` :
                         `Summoning ${experts.find(e => e.id === currentExpert)?.name || 'the Next Expert'}...`}
                      </h3>
                      <p className="text-sm text-white/55 leading-relaxed max-w-sm">
                        {currentExpert === 'iteration_critic' ? 'Analyzing your feedback and checking prose weaknesses to plan precision changes.' :
                         currentExpert === 'iteration_editor' ? 'Synthesizing evaluation logs and revising the prose to incorporate your instructions.' :
                         currentExpert === 'novella_splitter' ? 'Pacing the manuscript out and structuring narrative arcs into clean, standard, publishing-ready chapters without truncating raw words.' :
                         currentExpert.startsWith('wordsmith_chapter_') ? 'Plucking deep characters, extensive dialogue, world mechanics, and sensory depth to build this chapter.' :
                         currentExpert.startsWith('critic_chapter_') ? 'Refactoring pacing, evaluating tone shifts, checking character agency, and recommending structural adjustments.' :
                         currentExpert.startsWith('editor_chapter_') ? 'Amalgamating critic feedback, polishing the sentence metrics, and enriching standard style prose.' :
                         experts.find(e => e.id === currentExpert)?.systemInstruction || 'Gathering world archives and establishing character motivations.'}
                      </p>
                      <div className="text-[10px] font-mono text-white/35 border border-white/5 bg-white/5 py-1 px-2.5 rounded-full">
                        Streaming with {generationModel === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro' : 'Gemini 3.5 Flash'}
                      </div>
                    </div>
                  ) : currentDisplayDraft ? (
                    <>
                      <div className="mb-6 pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest">{displayTitle}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              if (isEditingManual) {
                                handleSaveManualEdit();
                              } else {
                                setManualTextBuffer(currentDisplayDraft);
                                setIsEditingManual(true);
                              }
                            }}
                            className={cn(
                              "py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer",
                              isEditingManual 
                                ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600" 
                                : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                            )}
                            title="Edit this prose manually"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>{isEditingManual ? "Save Changes" : "Edit Text"}</span>
                          </button>

                          {isEditingManual && (
                            <button
                              onClick={() => setIsEditingManual(false)}
                              className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Discard
                            </button>
                          )}

                          <button
                            onClick={downloadStoryAsTxt}
                            className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                            title="Download as Plain Text (.txt)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .txt</span>
                          </button>
                          <button
                            onClick={downloadStoryAsRtf}
                            className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                            title="Download as Rich Text (.rtf) - fully editable in Word/Pages/WordPad"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download .rtf</span>
                          </button>
                        </div>
                      </div>

                      {/* Prose metrics and scanning scoreboard */}
                      {(() => {
                        const stats = getProseStats(currentDisplayDraft);
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 rounded-xl border border-white/5 bg-white/5 select-none text-[11px]">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-0.5">Word Count</span>
                              <span className="text-xs font-semibold text-white/80">{stats.words.toLocaleString()} words</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-0.5">Read Pace</span>
                              <span className="text-xs font-semibold text-white/80">{stats.readTime} min read</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-0.5">AI clichés</span>
                              <span className={cn(
                                "text-xs font-semibold", 
                                stats.AIClichés > 0 ? "text-orange-400/80" : "text-emerald-400"
                              )}>
                                {stats.AIClichés} matched
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-0.5">Human Purity</span>
                              <span className={cn(
                                "text-xs font-semibold flex items-center gap-1",
                                stats.score > 85 ? "text-emerald-400" : stats.score > 70 ? "text-orange-400" : "text-red-400"
                              )}>
                                {stats.score}%
                                <span className="text-[8px] font-normal text-white/30">
                                  {stats.score > 85 ? 'Pristine' : stats.score > 70 ? 'Human' : 'Sloppy'}
                                </span>
                              </span>
                            </div>
                            {stats.clichéMatches.length > 0 && (
                              <div className="col-span-2 md:col-span-4 mt-1 bg-black/20 p-2 rounded text-[10px] text-white/40 border border-white/5 flex flex-wrap gap-1.5 items-center">
                                <span className="font-mono text-orange-400 font-semibold">Matched Crutches:</span>
                                {stats.clichéMatches.map((val, idx) => (
                                  <span key={idx} className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] font-mono select-all text-white/60">
                                    {val}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {isEditingManual ? (
                        <div className="flex flex-col gap-4">
                          <textarea
                            value={manualTextBuffer}
                            onChange={(e) => setManualTextBuffer(e.target.value)}
                            className="w-full min-h-[50vh] bg-white/5 border border-white/10 rounded-2xl p-6 font-serif text-lg leading-relaxed focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 text-white/90 whitespace-pre-wrap outline-none"
                            placeholder="Manually refine your masterpiece prose style..."
                          />
                          <div className="flex justify-end gap-3 pb-6">
                            <button
                              onClick={() => setIsEditingManual(false)}
                              className="px-4 py-2 bg-white/5 text-white/70 hover:bg-white/10 rounded-xl transition-all font-medium text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveManualEdit}
                              className="px-5 py-2 bg-orange-500 text-white hover:bg-orange-600 rounded-xl transition-all font-medium text-xs cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-orange max-w-none font-serif text-lg leading-relaxed text-white/80 prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-tight prose-a:text-orange-400 w-full break-words whitespace-pre-wrap">
                          <Markdown>{currentDisplayDraft}</Markdown>
                        </div>
                      )}

                      {/* Focused Selective Chapter Regeneration Tool */}
                      {(() => {
                        let parsedChapNum: number | null = null;
                        if (activeDisplayId.startsWith('chapter_')) {
                          const parts = activeDisplayId.split('_');
                          parsedChapNum = parseInt(parts[1], 10);
                        } else if (activeDisplayId.startsWith('wordsmith_chapter_')) {
                          parsedChapNum = parseInt(activeDisplayId.replace('wordsmith_chapter_', ''), 10);
                        } else if (activeDisplayId.startsWith('critic_chapter_')) {
                          parsedChapNum = parseInt(activeDisplayId.replace('critic_chapter_', ''), 10);
                        } else if (activeDisplayId.startsWith('editor_chapter_')) {
                          parsedChapNum = parseInt(activeDisplayId.replace('editor_chapter_', ''), 10);
                        }

                        if (parsedChapNum !== null && !isGenerating && !isEditingManual) {
                          return (
                            <div className="mt-12 p-5 rounded-2xl border border-white/5 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-1 px-2 bg-orange-500/10 border border-orange-500/20 text-[9px] font-mono uppercase tracking-wide rounded text-orange-400 font-bold">Chapter {parsedChapNum} Selector</div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">Selective Focused Re-generation</h4>
                              </div>
                              <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
                                Refine style or adjust mechanics of Chapter {parsedChapNum} specifically. Give natural language commands (e.g. "make the dialogue tenser and describe the coolant spraying everywhere"). It will stream Wordsmith, Critic and Editor cycles on this chapter alone.
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={chapterRefinePrompt}
                                  onChange={e => setChapterRefinePrompt(e.target.value)}
                                  placeholder={`Describe corrections or tone adjustments to re-weave chapter ${parsedChapNum}...`}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500/55 transition-all placeholder:text-white/20 text-white/90 font-medium"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && chapterRefinePrompt.trim()) {
                                      handleGenerateSingleChapter(parsedChapNum!, chapterRefinePrompt);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleGenerateSingleChapter(parsedChapNum!, chapterRefinePrompt)}
                                  disabled={!chapterRefinePrompt.trim() || isGenerating}
                                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 select-none cursor-pointer"
                                >
                                  Re-weave Chapter
                                </button>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white/20 font-serif italic py-24">
                      The story is taking shape...
                    </div>
                  )}
                </div>
              </div>

              {/* Iteration Panel */}
              {draftHistory.length > 0 && !isGenerating && (
                <div className="p-6 border-t border-white/10 bg-[#0a0502]/80 backdrop-blur-xl">
                  <div className="max-w-3xl mx-auto flex flex-col gap-2">
                    {error && currentExpert === 'Idle' && completedExperts.includes('iteration_critic') && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Iteration failed.</span>
                        </div>
                        <button onClick={() => handleIterate(true)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300 font-medium transition-colors">
                          Resume Iteration
                        </button>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={iterationPrompt}
                        onChange={e => setIterationPrompt(e.target.value)}
                        placeholder="Provide feedback or a new direction to iterate on this draft..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-white/30"
                        onKeyDown={e => e.key === 'Enter' && handleIterate(false)}
                      />
                      <button
                        onClick={() => handleIterate(false)}
                        disabled={!iterationPrompt || isGenerating}
                        className="px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Iterate</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={cn(
            "flex-1 items-center justify-center z-10 p-6",
            mobileTab === 'draft' ? 'flex' : 'hidden lg:flex'
          )}>
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-orange-500/50" />
              </div>
              <h2 className="text-2xl font-serif mb-3 text-white/90">The Blank Page Awaits</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Define your genres, themes, and overall aim in the sidebar. The Hermeneutic Weaver will orchestrate a team of expert AI agents to research, draft, critique, and refine your story.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden flex border-t border-white/10 bg-[#0f0805] shrink-0 z-50">
        <button onClick={() => setMobileTab('inputs')} className={cn("flex-1 py-3 flex flex-col items-center gap-1", mobileTab === 'inputs' ? "text-orange-500" : "text-white/50")}>
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Inputs</span>
        </button>
        <button onClick={() => setMobileTab('pipeline')} className={cn("flex-1 py-3 flex flex-col items-center gap-1", mobileTab === 'pipeline' ? "text-orange-500" : "text-white/50")}>
          <GitCommit className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Pipeline</span>
        </button>
        <button onClick={() => setMobileTab('draft')} className={cn("flex-1 py-3 flex flex-col items-center gap-1", mobileTab === 'draft' ? "text-orange-500" : "text-white/50")}>
          <Book className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Draft</span>
        </button>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

