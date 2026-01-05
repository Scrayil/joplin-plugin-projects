/**
 * Comprehensive map of emojis to their keywords for search functionality.
 */
const EMOJI_MAP = {
    // --- Productivity / Recent ---
    "📁": "folder directory file project",
    "📂": "open folder directory",
    "📓": "notebook notes journal",
    "📕": "closed book red",
    "📚": "books library study",
    "📝": "memo note writing pencil",
    "🗓️": "calendar date schedule",
    "✅": "check mark done success",
    "🚧": "construction work building",
    "🚀": "rocket launch startup space",
    "🎯": "target bullseye goal",
    "💡": "idea light bulb",
    "🔥": "fire hot trend",
    "⭐": "star favorite rating",
    "🚩": "flag red urgent",
    "📌": "pin pushpin fix",
    "🗑️": "trash delete remove",
    "⚙️": "settings gear config",

    // --- Smileys & Emotion ---
    "😀": "grinning face happy", "😃": "smiley face", "😄": "smile happy", "😁": "beaming face",
    "😆": "laughing", "😅": "sweat smile", "🤣": "rofl laughing", "😂": "joy tears",
    "🙂": "slightly smiling", "😉": "wink", "😊": "blush", "😇": "halo angel",
    "🥰": "love hearts", "😍": "heart eyes", "🤩": "star struck", "😎": "sunglasses cool",
    "🤔": "thinking", "😐": "neutral", "😑": "expressionless", "😶": "silent",
    "🙄": "rolling eyes", "😏": "smirk", "😣": "persevering", "😥": "sad relieved",
    "😮": "open mouth", "😫": "tired", "😴": "sleeping", "😌": "relieved",
    "😛": "tongue", "😜": "winking tongue", "😝": "squinting tongue", "🤤": "drooling",
    "😒": "unamused", "😓": "sweat", "😔": "pensive", "😕": "confused",
    "🙃": "upside down", "🤑": "money mouth", "😲": "astonished", "☹️": "frowning",
    "🙁": "slightly frowning", "😖": "confounded", "😞": "disappointed", "😤": "triumph steam",
    "😢": "crying", "😭": "loudly crying", "😦": "frowning open", "😧": "anguished",
    "😨": "fearful", "😩": "weary", "🤯": "exploding head", "😬": "grimacing",
    "😰": "anxious sweat", "😱": "scream fear", "🥵": "hot face", "🥶": "cold face",
    "😳": "flushed", "🤪": "zany crazy", "😵": "dizzy", "😡": "pouting angry",
    "😠": "angry", "🤬": "cursing", "😷": "mask medical", "🤒": "thermometer sick",
    "🤕": "bandage injury", "🤢": "nauseated", "🤮": "vomiting", "🤧": "sneezing",
    "💀": "skull dead", "👻": "ghost", "👽": "alien", "🤖": "robot", "💩": "poop",

    // --- People ---
    "👋": "wave hello", "🤚": "raised back of hand", "🖐️": "fingers splayed", "✋": "raised hand",
    "🖖": "vulcan salute", "👌": "ok hand", "🤏": "pinching hand", "✌️": "victory peace",
    "🤞": "crossed fingers", "🤟": "love you", "🤘": "sign of horns", "🤙": "call me",
    "👈": "point left", "👉": "point right", "👆": "point up", "🖕": "middle finger",
    "👇": "point down", "👍": "thumbs up", "👎": "thumbs down", "✊": "fist raised",
    "👊": "fist oncoming", "🤛": "fist left", "🤜": "fist right", "👏": "clapping",
    "🙌": "raising hands", "👐": "open hands", "🤲": "palms up", "🤝": "handshake deal",
    "🙏": "pray thanks", "✍️": "writing", "💅": "nail polish", "🤳": "selfie",
    "💪": "muscle strong", "👂": "ear", "👃": "nose", "🧠": "brain", "👀": "eyes",
    "👁️": "eye", "👶": "baby", "👦": "boy", "👧": "girl", "🧑": "person",
    "👱": "blond", "👨": "man", "🧔": "beard", "👩": "woman", "🧓": "older person",
    "👴": "old man", "👵": "old woman", "👮": "police cop", "👷": "construction worker",
    "💂": "guard", "🕵️": "detective", "🧑‍⚕️": "health worker doctor", "🧑‍🌾": "farmer",
    "🧑‍🍳": "cook chef", "🧑‍🎓": "student", "🧑‍🎤": "singer", "🧑‍🏫": "teacher",
    "🧑‍🏭": "factory worker", "🧑‍💻": "technologist developer", "🧑‍💼": "office worker",
    "🧑‍🔧": "mechanic", "🧑‍🔬": "scientist", "🧑‍🎨": "artist", "🧑‍🚒": "firefighter",
    "🧑‍✈️": "pilot", "🧑‍🚀": "astronaut", "🧑‍⚖️": "judge", "🕴️": "suit levitating",
    "🦸": "superhero", "🦹": "supervillain", "🧙": "mage wizard", "🧚": "fairy",
    "🧛": "vampire", "🧜": "mermaid", "🧞": "genie", "🧟": "zombie",
    "🚶": "walking", "🏃": "running", "👯": "bunny ears party", "👫": "couple holding hands",

    // --- Animals ---
    "🐵": "monkey", "🐒": "monkey", "🦍": "gorilla", "🐶": "dog", "🐕": "dog",
    "🐩": "poodle", "🐺": "wolf", "🦊": "fox", "🦝": "raccoon", "🐱": "cat",
    "🐈": "cat", "🦁": "lion", "🐯": "tiger", "🐅": "tiger", "🐆": "leopard",
    "🐴": "horse", "🐎": "horse", "🦄": "unicorn", "🦓": "zebra", "🐮": "cow",
    "🐂": "ox", "🐄": "cow", "🐷": "pig", "🐖": "pig", "🐗": "boar",
    "🐏": "ram", "🐑": "sheep", "🐐": "goat", "🐪": "camel", "🐫": "camel",
    "🦒": "giraffe", "🐘": "elephant", "🦏": "rhinoceros", "🐭": "mouse", "🐁": "mouse",
    "🐀": "rat", "🐹": "hamster", "🐰": "rabbit", "🐇": "rabbit", "🐿️": "chipmunk",
    "🦇": "bat", "🐻": "bear", "🐼": "panda", "🐨": "koala", "🦥": "sloth",
    "🐾": "paw prints", "🦃": "turkey", "🐔": "chicken", "🐓": "rooster", "🐣": "chick hatching",
    "🐤": "chick", "🐥": "chick", "🐦": "bird", "🐧": "penguin", "🕊️": "dove peace",
    "🦅": "eagle", "🦆": "duck", "🦢": "swan", "🦉": "owl", "🐸": "frog",
    "🐊": "crocodile", "🐢": "turtle", "🦎": "lizard", "🐍": "snake", "🐲": "dragon face",
    "🐉": "dragon", "🦕": "sauropod", "🦖": "t-rex", "🐳": "whale", "🐋": "whale",
    "🐬": "dolphin", "🐟": "fish", "🐠": "tropical fish", "🐡": "blowfish", "🦈": "shark",
    "🐙": "octopus", "🐌": "snail", "🦋": "butterfly", "🐛": "bug", "🐜": "ant",
    "🐝": "bee", "🐞": "ladybug", "🕷️": "spider", "🕸️": "web", "🦂": "scorpion",
    "💐": "bouquet", "🌸": "cherry blossom", "💮": "white flower", "🌹": "rose",
    "🥀": "wilted flower", "🌺": "hibiscus", "🌻": "sunflower", "🌼": "blossom",
    "🌷": "tulip", "🌱": "seedling", "🌲": "evergreen tree", "🌳": "tree",
    "🌴": "palm tree", "🌵": "cactus", "🌾": "sheaf of rice", "🌿": "herb",
    "☘️": "shamrock", "🍀": "four leaf clover", "🍁": "maple leaf", "🍂": "fallen leaf",
    "🍃": "leaf wind",

    // --- Food ---
    "🍇": "grapes", "🍈": "melon", "🍉": "watermelon", "🍊": "tangerine", "🍋": "lemon",
    "🍌": "banana", "🍍": "pineapple", "🥭": "mango", "🍎": "apple red", "🍏": "apple green",
    "🍐": "pear", "🍑": "peach", "🍒": "cherries", "🍓": "strawberry", "🥝": "kiwi",
    "🍅": "tomato", "🥥": "coconut", "🥑": "avocado", "🍆": "eggplant", "🥔": "potato",
    "🥕": "carrot", "🌽": "corn", "🌶️": "hot pepper", "🥒": "cucumber", "🥦": "broccoli",
    "🍄": "mushroom", "🥜": "peanuts", "🌰": "chestnut", "🍞": "bread", "🥐": "croissant",
    "🥖": "baguette", "🥨": "pretzel", "🥯": "bagel", "🥞": "pancakes", "🧀": "cheese",
    "🍖": "meat bone", "🍗": "poultry leg", "🥩": "cut of meat", "🥓": "bacon", "🍔": "hamburger",
    "🍟": "fries", "🍕": "pizza", "🌭": "hot dog", "🥪": "sandwich", "🌮": "taco",
    "🌯": "burrito", "🥙": "stuffed flatbread", "🥚": "egg", "🍳": "cooking", "🥘": "pan of food",
    "🍲": "pot of food", "🥣": "bowl", "🥗": "salad", "🍿": "popcorn", "🧂": "salt",
    "🥫": "canned food", "🍱": "bento", "🍙": "rice ball", "🍚": "cooked rice", "🍛": "curry rice",
    "🍜": "noodles", "🍝": "spaghetti", "🍠": "roasted sweet potato", "🍣": "sushi", "🍤": "fried shrimp",
    "🍥": "fish cake", "🍡": "dango", "🥟": "dumpling", "🥠": "fortune cookie", "🥡": "takeout box",
    "🦀": "crab", "🦞": "lobster", "🦐": "shrimp", "🦑": "squid", "🍦": "soft ice cream",
    "🍧": "shaved ice", "🍨": "ice cream", "🍩": "doughnut", "🍪": "cookie", "🎂": "birthday cake",
    "🍰": "shortcake", "🧁": "cupcake", "🥧": "pie", "🍫": "chocolate", "🍬": "candy",
    "🍭": "lollipop", "🍮": "custard", "🍯": "honey", "🍼": "baby bottle", "🥛": "milk",
    "☕": "coffee", "🍵": "tea", "🍶": "sake", "🍾": "champagne", "🍷": "wine",
    "🍸": "cocktail", "🍹": "tropical drink", "🍺": "beer", "🍻": "clinking beer", "🥂": "clinking glasses",
    "🥃": "tumbler glass", "🥤": "cup with straw", "🥢": "chopsticks", "🍽️": "plate fork knife",
    "🍴": "fork and knife", "🥄": "spoon",

    // --- Activities ---
    "🎃": "jack-o-lantern halloween", "🎄": "christmas tree", "🎆": "fireworks", "🎇": "sparkler",
    "🧨": "firecracker", "✨": "sparkles", "🎈": "balloon", "🎉": "party popper",
    "🎊": "confetti ball", "🎋": "tanabata tree", "🎍": "pine decoration", "🎎": "dolls",
    "🎏": "carp streamer", "🎐": "wind chime", "🎑": "moon viewing", "🧧": "red envelope",
    "🎀": "ribbon", "🎁": "gift", "🎗️": "reminder ribbon", "🎟️": "admission tickets",
    "🎫": "ticket", "🎖️": "military medal", "🏆": "trophy", "🏅": "sports medal",
    "🥇": "1st place medal", "🥈": "2nd place medal", "🥉": "3rd place medal", "⚽": "soccer ball",
    "⚾": "baseball", "🥎": "softball", "🏀": "basketball", "🏐": "volleyball",
    "🏈": "american football", "🏉": "rugby football", "🎾": "tennis", "🥏": "flying disc",
    "🎳": "bowling", "🏏": "cricket", "🏑": "field hockey", "🏒": "ice hockey",
    "🥍": "lacrosse", "🏓": "ping pong", "🏸": "badminton", "🥊": "boxing glove",
    "🥋": "martial arts uniform", "🥅": "goal net", "⛳": "flag in hole golf", "⛸️": "ice skate",
    "🎣": "fishing pole", "🤿": "diving mask", "🎽": "running shirt", "🎿": "skis",
    "🛷": "sled", "🥌": "curling stone", "🎯": "direct hit target", "🪀": "yo-yo",
    "🪁": "kite", "🎱": "pool 8 ball", "🔮": "crystal ball", "🧿": "nazar amulet",
    "🎮": "video game", "🕹️": "joystick", "🎰": "slot machine", "🎲": "game die",
    "🧩": "puzzle piece", "🧸": "teddy bear", "♠️": "spade suit", "♥️": "heart suit",
    "♦️": "diamond suit", "♣️": "club suit", "♟️": "chess pawn", "🃏": "joker",
    "🀄": "mahjong", "🎴": "flower cards", "🎭": "performing arts", "🖼️": "framed picture",
    "🎨": "artist palette", "🧵": "thread", "🧶": "yarn",

    // --- Travel ---
    "🌍": "globe europe africa", "🌎": "globe americas", "🌏": "globe asia australia", "🌐": "globe meridians",
    "🗺️": "map", "🗾": "map of japan", "🧭": "compass", "🏔️": "snow capped mountain",
    "⛰️": "mountain", "🌋": "volcano", "🗻": "mount fuji", "🏕️": "camping",
    "🏖️": "beach umbrella", "🏜️": "desert", "🏝️": "island", "🏞️": "national park",
    "🏟️": "stadium", "🏛️": "classical building", "🏗️": "building construction", "🧱": "brick",
    "🏘️": "houses", "🏚️": "derelict house", "🏠": "house home", "🏡": "house garden",
    "🏢": "office building", "🏣": "post office japanese", "🏤": "post office", "🏥": "hospital",
    "🏦": "bank", "🏨": "hotel", "🏩": "love hotel", "🏪": "convenience store",
    "🏫": "school", "🏬": "department store", "🏭": "factory", "🏯": "japanese castle",
    "🏰": "castle", "💒": "wedding", "🗼": "tokyo tower", "🗽": "statue of liberty",
    "⛪": "church", "🕌": "mosque", "🛕": "hindu temple", "🕍": "synagogue",
    "⛩️": "shinto shrine", "🕋": "kaaba", "⛲": "fountain", "⛺": "tent",
    "🌁": "foggy", "🌃": "night with stars", "🏙️": "cityscape", "🌄": "sunrise mountains",
    "🌅": "sunrise", "🌆": "cityscape dusk", "🌇": "sunset", "🌉": "bridge at night",
    "♨️": "hot springs", "🎠": "carousel horse", "🎡": "ferris wheel", "🎢": "roller coaster",
    "🚂": "locomotive", "🚃": "railway car", "🚄": "high-speed train", "🚅": "bullet train",
    "🚆": "train", "🚇": "metro", "🚈": "light rail", "🚉": "station",
    "🚊": "tram", "🚝": "monorail", "🚞": "mountain railway", "🚋": "tram car",
    "🚌": "bus", "🚍": "oncoming bus", "🚎": "trolleybus", "🚐": "minibus",
    "🚑": "ambulance", "🚒": "fire engine", "🚓": "police car", "🚔": "oncoming police car",
    "🚕": "taxi", "🚖": "oncoming taxi", "🚗": "car automobile", "🚘": "oncoming automobile",
    "🚙": "suv", "🚚": "delivery truck", "🚛": "lorry", "🚜": "tractor",
    "🏎️": "racing car", "🏍️": "motorcycle", "🛵": "scooter", "🦽": "manual wheelchair",
    "🦼": "motorized wheelchair", "🛺": "auto rickshaw", "🚲": "bicycle", "🛴": "kick scooter",
    "🛹": "skateboard", "🚏": "bus stop", "🛣️": "motorway", "🛤️": "railway track",
    "🛢️": "oil drum", "⛽": "fuel pump", "🚨": "police car light", "🚥": "traffic light",
    "🚦": "traffic light vertical", "🛑": "stop sign", "🚧": "construction", "⚓": "anchor",
    "⛵": "sailboat", "🛶": "canoe", "🚤": "speedboat", "🛳️": "passenger ship",
    "⛴️": "ferry", "🛥️": "motor boat", "🚢": "ship", "✈️": "airplane",
    "🛩️": "small airplane", "🛫": "airplane departure", "🛬": "airplane arrival", "🪂": "parachute",
    "💺": "seat", "🚁": "helicopter", "🚟": "suspension railway", "🚠": "mountain cableway",
    "🚡": "aerial tramway", "🛰️": "satellite", "🚀": "rocket", "🛸": "flying saucer",
    "🛎️": "bellhop bell", "🧳": "luggage", "⌛": "hourglass done", "⏳": "hourglass not done",
    "⌚": "watch", "⏰": "alarm clock", "⏱️": "stopwatch", "⏲️": "timer clock",
    "🕰️": "mantelpiece clock", "🕛": "twelve", "🕧": "twelve thirty", "🕐": "one",
    "🕜": "one thirty", "🕑": "two", "🕝": "two thirty", "🕒": "three",
    "🕞": "three thirty", "🕓": "four", "🕟": "four thirty", "🕔": "five",
    "🕠": "five thirty", "🕕": "six", "🕡": "six thirty", "🕖": "seven",
    "🕢": "seven thirty", "🕗": "eight", "🕣": "eight thirty", "🕘": "nine",
    "🕤": "nine thirty", "🕙": "ten", "🕥": "ten thirty", "🕚": "eleven",
    "🕦": "eleven thirty", "🌑": "new moon", "🌒": "waxing crescent", "🌓": "first quarter",
    "🌔": "waxing gibbous", "🌕": "full moon", "🌖": "waning gibbous", "🌗": "last quarter",
    "🌘": "waning crescent", "🌙": "crescent moon", "🌚": "new moon face", "🌛": "first quarter face",
    "🌜": "last quarter face", "🌡️": "thermometer", "☀️": "sun", "🌝": "full moon face",
    "🌞": "sun with face", "🪐": "ringed planet", "⭐": "star", "🌟": "glowing star",
    "🌠": "shooting star", "🌌": "milky way", "☁️": "cloud", "⛅": "sun behind cloud",
    "⛈️": "cloud lightning rain", "🌤️": "sun small cloud", "🌥️": "sun large cloud", "🌦️": "sun rain cloud",
    "🌧️": "cloud rain", "🌨️": "cloud snow", "🌩️": "cloud lightning", "🌪️": "tornado",
    "🌫️": "fog", "🌬️": "wind face", "🌀": "cyclone", "🌈": "rainbow",
    "🌂": "closed umbrella", "☂️": "umbrella", "☔": "umbrella rain", "⛱️": "umbrella ground",
    "⚡": "high voltage", "❄️": "snowflake", "☃️": "snowman", "⛄": "snowman no snow",
    "☄️": "comet", "🔥": "fire", "💧": "droplet", "🌊": "water wave",

    // --- Objects ---
    "👓": "glasses", "🕶️": "sunglasses", "🥽": "goggles", "🥼": "lab coat",
    "🦺": "safety vest", "👔": "necktie", "👕": "t-shirt", "👖": "jeans",
    "🧣": "scarf", "🧤": "gloves", "🧥": "coat", "🧦": "socks",
    "👗": "dress", "👘": "kimono", "🥻": "sari", "🩱": "swimsuit",
    "🩲": "briefs", "🩳": "shorts", "👙": "bikini", "👚": "clothes",
    "👛": "purse", "👜": "handbag", "👝": "clutch bag", "🛍️": "shopping bags",
    "🎒": "backpack", "👞": "man shoe", "👟": "running shoe", "🥾": "hiking boot",
    "🥿": "flat shoe", "👠": "high-heeled shoe", "👡": "sandal", "🩰": "ballet shoes",
    "👢": "woman boot", "👑": "crown", "👒": "woman hat", "🎩": "top hat",
    "🎓": "graduation cap", "🧢": "billed cap", "⛑️": "helmet", "📿": "prayer beads",
    "💄": "lipstick", "💍": "ring", "💎": "gem stone", "🔇": "muted speaker",
    "🔈": "speaker low", "🔉": "speaker medium", "🔊": "speaker high", "📢": "loudspeaker",
    "📣": "megaphone", "📯": "postal horn", "🔔": "bell", "🔕": "bell slash",
    "🎼": "musical score", "🎵": "musical note", "🎶": "musical notes", "🎙️": "studio microphone",
    "🎚️": "level slider", "🎛️": "control knobs", "🎤": "microphone", "🎧": "headphone",
    "📻": "radio", "🎷": "saxophone", "🎸": "guitar", "🎹": "musical keyboard",
    "🎺": "trumpet", "🎻": "violin", "🪕": "banjo", "🥁": "drum",
    "📱": "mobile phone", "📲": "mobile phone arrow", "☎️": "telephone", "📞": "telephone receiver",
    "📟": "pager", "📠": "fax machine", "🔋": "battery", "🔌": "electric plug",
    "💻": "laptop", "🖥️": "desktop computer", "🖨️": "printer", "⌨️": "keyboard",
    "🖱️": "mouse", "🖲️": "trackball", "💽": "computer disk", "💾": "floppy disk",
    "💿": "optical disk", "📀": "dvd", "🧮": "abacus", "🎥": "movie camera",
    "🎞️": "film frames", "📽️": "film projector", "🎬": "clapper board", "📺": "television",
    "📷": "camera", "📸": "camera flash", "📹": "video camera", "📼": "videocassette",
    "🔍": "magnifying glass left", "🔎": "magnifying glass right", "🕯️": "candle", "💡": "light bulb",
    "🔦": "flashlight", "🏮": "red paper lantern", "🪔": "diya lamp", "📔": "notebook decorative",
    "📕": "closed book", "📖": "open book", "📗": "green book", "📘": "blue book",
    "📙": "orange book", "📚": "books", "📓": "notebook", "📒": "ledger",
    "📃": "page curl", "📜": "scroll", "📄": "page facing up", "📰": "newspaper",
    "🗞️": "rolled newspaper", "📑": "bookmark tabs", "🔖": "bookmark", "🏷️": "label",
    "💰": "money bag", "💴": "yen banknote", "💵": "dollar banknote", "💶": "euro banknote",
    "💷": "pound banknote", "💸": "money wings", "💳": "credit card", "🧾": "receipt",
    "💹": "chart yen", "✉️": "envelope", "📧": "e-mail", "📨": "incoming envelope",
    "📩": "envelope arrow", "📤": "outbox tray", "📥": "inbox tray", "📦": "package",
    "📫": "mailbox closed raised", "📪": "mailbox closed lowered", "📬": "mailbox open raised", "📭": "mailbox open lowered",
    "📮": "postbox", "🗳️": "ballot box", "✏️": "pencil", "✒️": "black nib",
    "🖋️": "fountain pen", "🖊️": "pen", "🖌️": "paintbrush", "🖍️": "crayon",
    "📝": "memo", "💼": "briefcase", "📁": "file folder", "📂": "open folder",
    "🗂️": "card index dividers", "📅": "calendar", "📆": "tear-off calendar", "🗒️": "spiral notepad",
    "🗓️": "spiral calendar", "📇": "card index", "📈": "chart increasing", "📉": "chart decreasing",
    "📊": "bar chart", "📋": "clipboard", "📌": "pushpin", "📍": "round pushpin",
    "📎": "paperclip", "🖇️": "linked paperclips", "📏": "straight ruler", "📐": "triangular ruler",
    "✂️": "scissors", "🗃️": "card file box", "🗄️": "file cabinet", "🗑️": "wastebasket",
    "🔒": "locked", "🔓": "unlocked", "🔏": "locked pen", "🔐": "locked key",
    "🔑": "key", "🗝️": "old key", "🔨": "hammer", "🪓": "axe",
    "⛏️": "pick", "⚒️": "hammer and pick", "🛠️": "hammer and wrench", "🗡️": "dagger",
    "⚔️": "crossed swords", "🔫": "pistol", "🏹": "bow and arrow", "🛡️": "shield",
    "🔧": "wrench", "🔩": "nut and bolt", "⚙️": "gear", "🗜️": "clamp",
    "⚖️": "balance scale", "🦯": "white cane", "🔗": "link", "⛓️": "chains",
    "🧰": "toolbox", "🧲": "magnet", "⚗️": "alembic", "🧪": "test tube",
    "🧫": "petri dish", "🧬": "dna", "🔬": "microscope", "🔭": "telescope",
    "📡": "satellite antenna", "💉": "syringe", "🩸": "drop of blood", "💊": "pill",
    "🩹": "adhesive bandage", "🩺": "stethoscope", "🚪": "door", "🛏️": "bed",
    "🛋️": "couch and lamp", "🪑": "chair", "🚽": "toilet", "🚿": "shower",
    "🛁": "bathtub", "🪒": "razor", "🧴": "lotion bottle", "🧷": "safety pin",
    "🧹": "broom", "🧺": "basket", "🧻": "roll of paper", "🧼": "soap",
    "🧽": "sponge", "🧯": "fire extinguisher", "🛒": "shopping cart", "🚬": "cigarette",
    "⚰️": "coffin", "⚱️": "funeral urn", "🗿": "moai",

    // --- Symbols ---
    "🏧": "atm sign", "🚮": "litter bin", "🚰": "potable water", "♿": "wheelchair symbol",
    "🚹": "mens room", "🚺": "womens room", "🚻": "restroom", "🚼": "baby symbol",
    "🚾": "water closet", "🛂": "passport control", "🛃": "customs", "🛄": "baggage claim",
    "🛅": "left luggage", "⚠️": "warning", "🚸": "children crossing", "⛔": "no entry",
    "🚫": "prohibited", "🚳": "no bicycles", "🚭": "no smoking", "🚯": "no littering",
    "🚱": "non-potable water", "🚷": "no pedestrians", "📵": "no mobile phones", "🔞": "no under eighteen",
    "☢️": "radioactive", "☣️": "biohazard", "⬆️": "up arrow", "↗️": "up-right arrow",
    "➡️": "right arrow", "↘️": "down-right arrow", "⬇️": "down arrow", "↙️": "down-left arrow",
    "⬅️": "left arrow", "↖️": "up-left arrow", "↕️": "up-down arrow", "↔️": "left-right arrow",
    "↩️": "right arrow curving left", "↪️": "left arrow curving right", "⤴️": "right arrow curving up", "⤵️": "right arrow curving down",
    "🔃": "clockwise vertical arrows", "🔄": "counterclockwise arrows", "🔙": "back arrow", "🔚": "end arrow",
    "🔛": "on arrow", "🔜": "soon arrow", "🔝": "top arrow", "🛐": "place of worship",
    "⚛️": "atom symbol", "🕉️": "om", "✡️": "star of david", "☸️": "wheel of dharma",
    "☯️": "yin yang", "✝️": "latin cross", "☦️": "orthodox cross", "☪️": "star and crescent",
    "☮️": "peace symbol", "🕎": "menorah", "🔯": "dotted six-pointed star", "♈": "aries",
    "♉": "taurus", "♊": "gemini", "♋": "cancer", "♌": "leo",
    "♍": "virgo", "♎": "libra", "♏": "scorpio", "♐": "sagittarius",
    "♑": "capricorn", "♒": "aquarius", "♓": "pisces", "⛎": "ophiuchus",
    "🔀": "shuffle tracks", "🔁": "repeat", "🔂": "repeat single", "▶️": "play button",
    "⏩": "fast-forward", "⏭️": "next track", "⏯️": "play pause", "◀️": "reverse",
    "⏪": "fast reverse", "⏮️": "last track", "🔼": "upwards button", "⏫": "fast up",
    "🔽": "downwards button", "⏬": "fast down", "⏸️": "pause", "⏹️": "stop",
    "⏺️": "record", "⏏️": "eject", "🎦": "cinema", "🔅": "dim button",
    "🔆": "bright button", "📶": "antenna bars", "📳": "vibration mode", "📴": "mobile phone off",
    "♀️": "female sign", "♂️": "male sign", "✖️": "multiply", "➕": "plus",
    "➖": "minus", "➗": "divide", "♾️": "infinity", "‼️": "double exclamation",
    "⁉️": "exclamation question", "❓": "question mark", "❔": "white question mark", "❕": "white exclamation mark",
    "❗": "exclamation mark", "〰️": "wavy dash", "💱": "currency exchange", "💲": "heavy dollar sign",
    "⚕️": "medical symbol", "♻️": "recycling symbol", "⚜️": "fleur-de-lis", "🔱": "trident emblem",
    "📛": "name badge", "🔰": "japanese symbol beginner", "⭕": "hollow red circle", "✅": "check mark button",
    "☑️": "check box with check", "✔️": "check mark", "❌": "cross mark", "❎": "cross mark button",
    "➰": "curly loop", "➿": "double curly loop", "〽️": "part alternation mark", "✳️": "eight-spoked asterisk",
    "✴️": "eight-pointed star", "❇️": "sparkle", "©️": "copyright", "®️": "registered",
    "™️": "trade mark", "#️⃣": "keycap #", "*️⃣": "keycap *", "0️⃣": "keycap 0",
    "1️⃣": "keycap 1", "2️⃣": "keycap 2", "3️⃣": "keycap 3", "4️⃣": "keycap 4",
    "5️⃣": "keycap 5", "6️⃣": "keycap 6", "7️⃣": "keycap 7", "8️⃣": "keycap 8",
    "9️⃣": "keycap 9", "🔟": "keycap 10", "🔠": "input latin uppercase", "🔡": "input latin lowercase",
    "🔢": "input numbers", "🔣": "input symbols", "🔤": "input latin letters", "🅰️": "a button blood",
    "🆎": "ab button blood", "🅱️": "b button blood", "🆑": "cl button", "🆒": "cool button",
    "🆓": "free button", "ℹ️": "information", "🆔": "id button", "Ⓜ️": "circled m",
    "🆕": "new button", "🆖": "ng button", "🅾️": "o button blood", "🆗": "ok button",
    "🅿️": "p button", "🆘": "sos button", "🆙": "up button", "🆚": "vs button",
    "🈁": "japanese here", "🈂️": "japanese service charge", "🈷️": "japanese monthly amount", "🈶": "japanese not free",
    "🈯": "japanese reserved", "🉐": "japanese bargain", "🈹": "japanese discount", "🈚": "japanese free",
    "🈲": "japanese prohibited", "🉑": "japanese acceptable", "🈸": "japanese application", "🈴": "japanese passing grade",
    "🈳": "japanese vacancy", "㊗️": "japanese congratulations", "㊙️": "japanese secret", "🈺": "japanese open for business",
    "🈵": "japanese no vacancy", "🔴": "red circle", "🟠": "orange circle", "🟡": "yellow circle",
    "🟢": "green circle", "🔵": "blue circle", "🟣": "purple circle", "🟤": "brown circle",
    "⚫": "black circle", "⚪": "white circle", "🟥": "red square", "🟧": "orange square",
    "🟨": "yellow square", "🟩": "green square", "🟦": "blue square", "🟪": "purple square",
    "🟫": "brown square", "⬛": "black large square", "⬜": "white large square", "◼️": "black medium square",
    "◻️": "white medium square", "◾": "black medium-small square", "◽": "white medium-small square",
    "▪️": "black small square", "▫️": "white small square", "🔶": "large orange diamond", "🔷": "large blue diamond",
    "🔸": "small orange diamond", "🔹": "small blue diamond", "🔺": "red triangle up", "🔻": "red triangle down",
    "💠": "diamond with dot", "🔘": "radio button", "🔳": "white square button", "🔲": "black square button",

    // --- Flags (Finalmente!) ---
    "🏁": "chequered flag", "🚩": "triangular flag", "🎌": "crossed flags", "🏴": "black flag",
    "🏳️": "white flag", "🏳️‍🌈": "rainbow flag lgbt", "🏴‍☠️": "pirate flag",
    "🇦🇨": "ascension island", "🇦🇩": "andorra", "🇦🇪": "united arab emirates uae", "🇦🇫": "afghanistan",
    "🇦🇬": "antigua & barbuda", "🇦🇮": "anguilla", "🇦🇱": "albania", "🇦🇲": "armenia",
    "🇦🇴": "angola", "🇦🇶": "antarctica", "🇦🇷": "argentina", "🇦🇸": "american samoa",
    "🇦🇹": "austria", "🇦🇺": "australia", "🇦🇼": "aruba", "🇦🇽": "aland islands",
    "🇦🇿": "azerbaijan", "🇧🇦": "bosnia & herzegovina", "🇧🇧": "barbados", "🇧🇩": "bangladesh",
    "🇧🇪": "belgium", "🇧🇫": "burkina faso", "🇧🇬": "bulgaria", "🇧🇭": "bahrain",
    "🇧🇮": "burundi", "🇧🇯": "benin", "🇧🇱": "st. barthélemy", "🇧🇲": "bermuda",
    "🇧🇳": "brunei", "🇧🇴": "bolivia", "🇧🇶": "caribbean netherlands", "🇧🇷": "brazil",
    "🇧🇸": "bahamas", "🇧🇹": "bhutan", "🇧🇻": "bouvet island", "🇧🇼": "botswana",
    "🇧🇾": "belarus", "🇧🇿": "belize", "🇨🇦": "canada", "🇨🇨": "cocos (keeling) islands",
    "🇨🇩": "congo - kinshasa", "🇨🇫": "central african republic", "🇨🇬": "congo - brazzaville", "🇨🇭": "switzerland",
    "🇨🇮": "côte d’ivoire ivory coast", "🇨🇰": "cook islands", "🇨🇱": "chile", "🇨🇲": "cameroon",
    "🇨🇳": "china", "🇨🇴": "colombia", "🇨🇵": "clipperton island", "🇨🇷": "costa rica",
    "🇨🇺": "cuba", "🇨🇻": "cape verde", "🇨🇼": "curaçao", "🇨🇽": "christmas island",
    "🇨🇾": "cyprus", "🇨🇿": "czechia czech republic", "🇩🇪": "germany", "🇩🇬": "diego garcia",
    "🇩🇯": "djibouti", "🇩🇰": "denmark", "🇩🇲": "dominica", "🇩🇴": "dominican republic",
    "🇩🇿": "algeria", "🇪🇦": "ceuta & melilla", "🇪🇨": "ecuador", "🇪🇪": "estonia",
    "🇪🇬": "egypt", "🇪🇭": "western sahara", "🇪🇷": "eritrea", "🇪🇸": "spain",
    "🇪🇹": "ethiopia", "🇪🇺": "european union", "🇫🇮": "finland", "🇫🇯": "fiji",
    "🇫🇰": "falkland islands", "🇫🇲": "micronesia", "🇫🇴": "faroe islands", "🇫🇷": "france",
    "🇬🇦": "gabon", "🇬🇧": "united kingdom uk", "🇬🇩": "grenada", "🇬🇪": "georgia",
    "🇬🇫": "french guiana", "🇬🇬": "guernsey", "🇬🇭": "ghana", "🇬🇮": "gibraltar",
    "🇬🇱": "greenland", "🇬🇲": "gambia", "🇬🇳": "guinea", "🇬🇵": "guadeloupe",
    "🇬🇶": "equatorial guinea", "🇬🇷": "greece", "🇬🇸": "south georgia & south sandwich islands", "🇬🇹": "guatemala",
    "🇬🇺": "guam", "🇬🇼": "guinea-bissau", "🇬🇾": "guyana", "🇭🇰": "hong kong",
    "🇭🇲": "heard & mcdonald islands", "🇭🇳": "honduras", "🇭🇷": "croatia", "🇭🇹": "haiti",
    "🇭🇺": "hungary", "🇮🇨": "canary islands", "🇮🇩": "indonesia", "🇮🇪": "ireland",
    "🇮🇱": "israel", "🇮🇲": "isle of man", "🇮🇳": "india", "🇮🇴": "british indian ocean territory",
    "🇮🇶": "iraq", "🇮🇷": "iran", "🇮🇸": "iceland", "🇮🇹": "italy",
    "🇯🇪": "jersey", "🇯🇲": "jamaica", "🇯🇴": "jordan", "🇯🇵": "japan",
    "🇰🇪": "kenya", "🇰🇬": "kyrgyzstan", "🇰🇭": "cambodia", "🇰🇮": "kiribati",
    "🇰🇲": "comoros", "🇰🇳": "st. kitts & nevis", "🇰🇵": "north korea", "🇰🇷": "south korea",
    "🇰🇼": "kuwait", "🇰🇾": "cayman islands", "🇰🇿": "kazakhstan", "🇱🇦": "laos",
    "🇱🇧": "lebanon", "🇱🇨": "st. lucia", "🇱🇮": "liechtenstein", "🇱🇰": "sri lanka",
    "🇱🇷": "liberia", "🇱🇸": "lesotho", "🇱🇹": "lithuania", "🇱🇺": "luxembourg",
    "🇱🇻": "latvia", "🇱🇾": "libya", "🇲🇦": "morocco", "🇲🇨": "monaco",
    "🇲🇩": "moldova", "🇲🇪": "montenegro", "🇲🇫": "st. martin", "🇲🇬": "madagascar",
    "🇲🇭": "marshall islands", "🇲🇰": "north macedonia", "🇲🇱": "mali", "🇲🇲": "myanmar burma",
    "🇲🇳": "mongolia", "🇲🇴": "macao", "🇲🇵": "northern mariana islands", "🇲🇶": "martinique",
    "🇲🇷": "mauritania", "🇲🇸": "montserrat", "🇲🇹": "malta", "🇲🇺": "mauritius",
    "🇲🇻": "maldives", "🇲🇼": "malawi", "🇲🇽": "mexico", "🇲🇾": "malaysia",
    "🇲🇿": "mozambique", "🇳🇦": "namibia", "🇳🇨": "new caledonia", "🇳🇪": "niger",
    "🇳🇫": "norfolk island", "🇳🇬": "nigeria", "🇳🇮": "nicaragua", "🇳🇱": "netherlands",
    "🇳🇴": "norway", "🇳🇵": "nepal", "🇳🇷": "nauru", "🇳🇺": "niue",
    "🇳🇿": "new zealand", "🇴🇲": "oman", "🇵🇦": "panama", "🇵🇪": "peru",
    "🇵🇫": "french polynesia", "🇵🇬": "papua new guinea", "🇵🇭": "philippines", "🇵🇰": "pakistan",
    "🇵🇱": "poland", "🇵🇲": "st. pierre & miquelon", "🇵🇳": "pitcairn islands", "🇵🇷": "puerto rico",
    "🇵🇸": "palestinian territories", "🇵🇹": "portugal", "🇵🇼": "palau", "🇵🇾": "paraguay",
    "🇶🇦": "qatar", "🇷🇪": "réunion", "🇷🇴": "romania", "🇷🇸": "serbia",
    "🇷🇺": "russia", "🇷🇼": "rwanda", "🇸🇦": "saudi arabia", "🇸🇧": "solomon islands",
    "🇸🇨": "seychelles", "🇸🇩": "sudan", "🇸🇪": "sweden", "🇸🇬": "singapore",
    "🇸🇭": "st. helena", "🇸🇮": "slovenia", "🇸🇯": "svalbard & jan mayen", "🇸🇰": "slovakia",
    "🇸🇱": "sierra leone", "🇸🇲": "san marino", "🇸🇳": "senegal", "🇸🇴": "somalia",
    "🇸🇷": "suriname", "🇸🇸": "south sudan", "🇸🇹": "são tomé & príncipe", "🇸🇻": "el salvador",
    "🇸🇽": "sint maarten", "🇸🇾": "syria", "🇸🇿": "eswatini", "🇹🇦": "tristan da cunha",
    "🇹🇨": "turks & caicos islands", "🇹🇩": "chad", "🇹🇫": "french southern territories", "🇹🇬": "togo",
    "🇹🇭": "thailand", "🇹🇯": "tajikistan", "🇹🇰": "tokelau", "🇹🇱": "timor-leste",
    "🇹🇲": "turkmenistan", "🇹🇳": "tunisia", "🇹🇴": "tonga", "🇹🇷": "turkey",
    "🇹🇹": "trinidad & tobago", "🇹🇻": "tuvalu", "🇹🇼": "taiwan", "🇹🇿": "tanzania",
    "🇺🇦": "ukraine", "🇺🇬": "uganda", "🇺🇲": "us outlying islands", "🇺🇳": "united nations",
    "🇺🇸": "united states usa", "🇺🇾": "uruguay", "🇺🇿": "uzbekistan", "🇻🇦": "vatican city",
    "🇻🇨": "st. vincent & grenadines", "🇻🇪": "venezuela", "🇻🇬": "british virgin islands", "🇻🇮": "us virgin islands",
    "🇻🇳": "vietnam", "🇻🇺": "vanuatu", "🇼🇫": "wallis & futuna", "🇼🇸": "samoa",
    "🇽🇰": "kosovo", "🇾🇪": "yemen", "🇾🇹": "mayotte", "🇿🇦": "south africa",
    "🇿🇲": "zambia", "🇿🇼": "zimbabwe", "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "england", "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "scotland",
    "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "wales"
};

/**
 * Scrolls the emoji picker to the specified category.
 * @param {number} index The index of the category to scroll to.
 */
window.scrollToCategory = function(index) {
    const headers = document.querySelectorAll('.emoji-picker__category-name');
    if (headers[index]) {
        headers[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * Initializes the emoji picker functionality within the dialog.
 * Handles search, selection, and display of emojis.
 */
const initPlugin = () => {
    const dialogRoot = document.querySelector('.dialog-root');
    const triggerBtn = document.getElementById('btn-emoji-trigger');
    const fileBtn = document.getElementById('btn-file-trigger'); // This seems unused, leaving for now.
    const wrapper = document.getElementById('emoji-picker-wrapper');
    const displaySpan = document.getElementById('current-icon-display');
    const searchInput = document.getElementById('emoji-search-input');
    const emojiBtns = document.querySelectorAll('.emoji-picker__emoji');
    const previewName = document.getElementById('preview-name');
    const hiddenInput = document.getElementById('selectedIcon');

    // 1. Populate search titles for emojis
    emojiBtns.forEach(btn => {
        const emoji = btn.getAttribute('data-emoji') || btn.textContent.trim();
        const keywords = EMOJI_MAP[emoji] || emoji;
        btn.setAttribute('title', keywords);
    });

    /**
     * Toggles the visibility of the emoji picker.
     * @param {boolean} show True to show the picker, false to hide.
     */
    const togglePicker = (show) => {
        if (!wrapper || !dialogRoot) return;

        if (show) {
            wrapper.style.display = 'flex';
            dialogRoot.classList.add('expanded');
            if (searchInput) {
                setTimeout(() => {
                    searchInput.value = '';
                    searchInput.focus();
                    triggerSearch('');
                }, 150);
            }
        } else {
            wrapper.style.display = 'none';
            dialogRoot.classList.remove('expanded');
        }
    };

    /**
     * Filters emojis based on a search term and updates category visibility.
     * @param {string} term The search term.
     */
    const triggerSearch = (term) => {
        const lowerTerm = term.toLowerCase();

        // 1. Filter individual emojis (show/hide buttons)
        emojiBtns.forEach(btn => {
            const keywords = (btn.getAttribute('title') || '').toLowerCase();
            const emoji = (btn.getAttribute('data-emoji') || '').toLowerCase();

            if (keywords.includes(lowerTerm) || emoji.includes(lowerTerm)) {
                btn.style.display = 'flex'; // Or 'inline-block' depending on your CSS
            } else {
                btn.style.display = 'none';
            }
        });

        // 2. Manage section visibility (hide empty categories)
        const containers = document.querySelectorAll('.emoji-picker__container');

        containers.forEach(container => {
            // Check if there is at least one visible emoji button within this container
            const hasVisibleEmojis = Array.from(container.children).some(child => child.style.display !== 'none');

            // Select the header (H2) immediately preceding the container
            const header = container.previousElementSibling;

            if (hasVisibleEmojis) {
                // Results found: show grid and title
                container.style.display = 'grid';
                if (header) header.style.display = 'block';
            } else {
                // No results: hide everything for a cleaner UI
                container.style.display = 'none';
                if (header) header.style.display = 'none';
            }
        });
    };

    const templateFileInput = document.getElementById('templateFile');
    const templateContentArea = document.getElementById('projectTemplateContent');
    const fileStatus = document.getElementById('file-status');

    if (templateFileInput) {
        templateFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                templateContentArea.value = '';
                fileStatus.style.display = 'none';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // Basic validation that it looks like JSON
                    const json = JSON.parse(event.target.result);
                    templateContentArea.value = JSON.stringify(json); // Store minified JSON
                    fileStatus.textContent = `Loaded: ${file.name}`;
                    fileStatus.style.color = 'green';
                    fileStatus.style.display = 'block';
                } catch (err) {
                    templateContentArea.value = '';
                    fileStatus.textContent = 'Error: Invalid JSON file';
                    fileStatus.style.color = 'red';
                    fileStatus.style.display = 'block';
                }
            };
            reader.readAsText(file);
        });
    }

    if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = wrapper.style.display === 'none';
            togglePicker(isHidden);
        });
    }

    if (fileBtn) {
        // This button's functionality is not fully implemented or clear.
        // It's commented out in the original HTML, but leaving the JS listener in case it's intended for future use.
        fileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("File open request...");
        });
    }

    document.addEventListener('click', (e) => {
        if (wrapper && triggerBtn &&
            !wrapper.contains(e.target) &&
            !triggerBtn.contains(e.target)) {
            togglePicker(false);
        }
    });

    emojiBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            // Display a clean preview name for the emoji
            const fullTitle = btn.getAttribute('title') || '';
            // Truncate long descriptions, otherwise use the emoji itself
            const shortName = fullTitle.length > 20 ? fullTitle.substring(0, 20) + "..." : fullTitle;
            previewName.textContent = shortName || btn.getAttribute('data-emoji');
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const emojiChar = btn.getAttribute('data-emoji') || btn.textContent;

            if (displaySpan) displaySpan.textContent = emojiChar;
            if (hiddenInput) hiddenInput.value = emojiChar;

            togglePicker(false);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            triggerSearch(e.target.value);
        });

        searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    const categoryBtns = document.querySelectorAll('.emoji-picker__category-button');
    const categoryHeaders = document.querySelectorAll('.emoji-picker__category-name');

    categoryBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (categoryHeaders[index]) {
                categoryHeaders[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlugin);
} else {
    initPlugin();
}