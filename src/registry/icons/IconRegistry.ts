let _recentIcons: string[] = [];
let _favoriteIcons: string[] = [];
let _listeners = new Set<() => void>();

const RECENT_MAX = 24;
const STORAGE_KEY_FAVORITES = "noska_favorite_icons";
const STORAGE_KEY_RECENTS = "noska_recent_icons";

function loadPersisted(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function savePersisted(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

_favoriteIcons = loadPersisted(STORAGE_KEY_FAVORITES);
_recentIcons = loadPersisted(STORAGE_KEY_RECENTS);

export const EMOJI_ICONS = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘",
  "😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨",
  "😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒",
  "🤕","🤧","🤮","🥵","🥶","🥴","😵","🤯","🥳","🥺","😢","😭","😤","😠","😡",
  "🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥",
  "😶","😐","😑","😬","🙄","😯","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐",
  "🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","💀","👻",
  "👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊",
  "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅",
  "🙆","💁","🙋","🧏","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷","🤴","👸","👳",
  "👲","🧕","🤵","👰","🤰","🤱","👩‍🍼","👨‍🍼","🧑‍🍼","👼","🎅","🤶","🦸","🦹","🧙",
  "🧚","🧛","🧜","🧝","🧞","🧟","🧌","💆","💇","🚶","🧍","🧎","🏃","💃","🕺",
  "👯","🧖","🛀","🛌","👫","👬","👭","💏","💑","👪","🐶","🐱","🐭","🐹","🐰",
  "🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🐣",
  "🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜",
  "🦟","🦗","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠",
  "🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪",
  "🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩",
  "🦮","🐕‍🦺","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡",
  "🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲","🌵","🎄","🌲","🌳","🌴",
  "🌱","🌿","☘️","🍀","🎍","🍃","🍂","🍁","🍄","🐚","🌾","💐","🌷","🌹","🥀",
  "🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒",
  "🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐","🌟","✨","⚡","☄️","💥","🔥",
  "🌪️","🌈","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄",
  "🌬️","💨","💧","💦","☔","☂️","🌊","🌫️","🍏","🍎","🍐","🍊","🍋","🍌","🍉",
  "🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬",
  "🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🫐","🥐","🍞","🥖","🥨",
  "🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🫓",
  "🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣",
  "🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦",
  "🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛",
  "🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🫗","🥃","🍸",
  "🍹","🧉","🍾","🧊","🥄","🍴","🥣","🍽️","🍳","🧂","🥢","🎾","🏀","🏈","⚾",
  "🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅",
  "⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️",
  "🏂","🪂","🏋️","🤼","🤸","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗",
  "🚵","🚴","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗",
  "🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🕹️","🎰","🚗","🚕","🚙","🚌","🚎",
  "🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🛹",
  "🚏","🛣️","🛤️","⛽","🛳️","⛴️","🛥️","🚢","✈️","🛩️","🛫","🛬","🪂","💺",
  "🚁","🚟","🚠","🚡","🛰️","🚀","🛸","🏠","🏡","🏘️","🏚️","🏗️","🏢","🏭",
  "🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽",
  "⛪","🕌","🛕","🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇",
  "🌉","🗾","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️","📱","💻","⌨️",
  "🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹",
  "🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️",
  "⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🪫","🔌","💡","🔦","🕯️","🪔","🧯",
  "🗑️","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰",
  "🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🧱","⛓️","🧲","🔫","💣",
  "🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿",
  "🪬","💈","⚗️","🔭","🔬","🕳️","🩻","🩺","💊","💉","🩸","🧬","🦠","🧫",
  "🧪","🌡️","🧹","🪠","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪥","🪒",
  "🧽","🪣","🧴","🛎️","🔑","🗝️","🚪","🪑","🛋️","🛏️","🛌","🧸","🪆","🖼️",
  "🪟","🛍️","🛒","🎁","🎈","🎏","🎀","🪄","🪅","🎊","🎉","🎎","🏮","🎐",
  "🧧","✉️","📩","📨","📧","💌","📤","📥","📦","📫","📪","📬","📭","📮",
  "📝","💼","📁","📂","🗂️","📅","📆","🗒️","🗓️","📇","📈","📉","📊","📋",
  "📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔏","🔐",
  "🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🔧","🔩","⚙️","🧰","🧲","🔗","⛓️",
  "🪝","🧬","🔬","🔭","📡","💉","🩸","💊","🩹","🩺","🩻","🚑","🩼","🩽",
  "🩾","🩿","🪀","🪁","🪂","🪃","🪄","🪅","🪆","🪐","🪑","🪒","🪓","🪔",
  "🪕","🪖","🪗","🪘","🪙","🪚","🪛","🪜","🪝","🪞","🪟","🪠","🪡","🪢",
  "🪣","🪤","🪥","🪦","🪧","🪨","🪩","🪪","🪫","🪬","🪭","🪮","🪯",
];

export const ICON_CATEGORIES = [
  { id: "emoji", label: "Emoji", type: "emoji" },
  { id: "objects", label: "Objects", type: "emoji", filter: (e) => {
    const obj = "⌛⏳⏰⌚📱💻⌨️🖥️🖨️🖱️🕹️🗜️💽💾💿📀📼📷📸📹🎥📽️🎞️📞☎️📟📠📺📻🎙️🎚️🎛️🧭⏱️⏲️🕰️📡🔋🪫🔌💡🔦🕯️🪔🧯🗑️🛢️💸💵💴💶💷🪙💰💳💎⚖️🪜🧰🪛🔧🔨⚒️🛠️⛏️🪚🔩⚙️🧱⛓️🧲🔫💣🧨🪓🔪🗡️⚔️🛡️🔮📿🧿🪬⚗️🔭🔬💈🩻🩺💊💉🩸🧬🦠🧫🧪🌡️🧹🪠🧺🧻🚽🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🔑🗝️🚪🪑🛋️🛏️🛌🧸🪆🖼️🪟🛍️🛒🎁🎈🎏🎀🪄🪅🎊🎉🎎🏮🎐🧧✉️📩📨📧💌📤📥📦📫📪📬📭📮📝💼📁📂🗂️📅📆🗒️🗓️📇📈📉📊📋📌📍📎🖇️📏📐✂️🗃️🗄️🔒🔓🔏🔐🔑🗝️🔗🎲♟️🎯🎳🎮🕹️🎰";
    return obj.includes(e);
  }},
  { id: "nature", label: "Nature", type: "emoji", filter: (e) => {
    const nat = "🌵🎄🌲🌳🌴🌱🌿☘️🍀🎍🍃🍂🍁🍄🐚🌾💐🌷🌹🥀🌺🌸🌼🌻🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏🪐💫⭐🌟✨⚡☄️💥🔥🌪️🌈☀️🌤️⛅🌥️☁️🌦️🌧️⛈️🌩️🌨️❄️☃️⛄🌬️💨💧💦☔☂️🌊🌫️🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🦟🦗🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐕‍🦺🐈🐓🦃🦤🦚🦜🦢🦩🕊️🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿️🦔🐾🐉🐲";
    return nat.includes(e);
  }},
  { id: "food", label: "Food & Drink", type: "emoji", filter: (e) => {
    const fd = "🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🫒🧄🧅🥔🍠🫐🥐🍞🥖🥨🧀🥚🍳🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🥫🍝🍜🍲🍛🍣🍱🥟🦪🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼🫖☕🍵🧃🥤🧋🍶🍺🍻🥂🍷🫗🥃🍸🍹🧉🍾🧊🥄🍴🥣🍽️🍳🧂🥢";
    return fd.includes(e);
  }},
  { id: "activity", label: "Activity", type: "emoji", filter: (e) => {
    const act = "🎾🏀🏈⚾🥎🎾🏐🏉🥏🎱🪀🏓🏸🏒🏑🥍🏏🪃🥅⛳🪁🏹🎣🤿🥊🥋🎽🛹🛼🛷⛸️🥌🎿⛷️🏂🪂🏋️🤼🤸🤺🤾🏌️🏇🧘🏄🏊🤽🚣🧗🚵🚴🎪🎭🎨🎬🎤🎧🎼🎹🥁🪘🎷🎺🪗🎸🪕🎻🎲♟️🎯🎳🎮🕹️🎰";
    return act.includes(e);
  }},
  { id: "travel", label: "Travel & Places", type: "emoji", filter: (e) => {
    const tr = "🚗🚕🚙🚌🚎🏎️🚓🚑🚒🚐🛻🚚🚛🚜🏍️🛵🛺🚲🛴🛹🚏🛣️🛤️⛽🛳️⛴️🛥️🚢✈️🛩️🛫🛬🪂💺🚁🚟🚠🚡🛰️🚀🛸🏠🏡🏘️🏚️🏗️🏢🏭🏣🏤🏥🏦🏨🏩🏪🏫🏬🏭🏯🏰💒🗼🗽⛪🕌🛕🕍⛩️🕋⛲⛺🌁🌃🏙️🌄🌅🌆🌇🌉🗾🏔️⛰️🌋🗻🏕️🏖️🏜️🏝️🏞️";
    return tr.includes(e);
  }},
  { id: "symbols", label: "Symbols", type: "emoji", filter: (e) => "❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟☮️✝️☪️🕉️☸️✡️🔯🕎☯️☦️🛐⛎♈♉♊♋♌♍♎♏♐♑♒♓🆔⚕️♿🚹🚺🚻🚼🚾🛂🛃🛄🛅⚠️🚸⛔🚫🚳🚭🚯🚱🚷📵🔞☢️☣️⬆️↗️➡️↘️⬇️↙️⬅️↖️↕️↔️↩️↪️⤴️⤵️🔃🔄🔙🔚🔛🔜🔝🛐⚛️🉑☸️✡️🔯🕎ℹ️Ⓜ️㊗️㊙️🈺🈵🔴🟠🟡🟢🔵🟣🟤⚫⚪🟥🟧🟨🟩🟦🟪🟫⬛⬜◼️◻️◾◽▪️▫️🔶🔷🔸🔹🔺🔻💠🔘🔳🔲".includes(e) },
];

export const EMOJI_BY_CATEGORY = ICON_CATEGORIES.map(cat => ({
  ...cat,
  icons: cat.filter ? EMOJI_ICONS.filter(cat.filter) : EMOJI_ICONS,
}));

export const LUCIDE_ICON_NAMES = [
  "Type","Heading1","Heading2","Heading3","Heading4","List","ListChecks","CheckSquare",
  "ChevronRight","FileText","MessageSquare","Quote","Clipboard","Link","Image","Video",
  "Music","Code","File","Globe","Table","Layout","ImageIcon","Calendar","Clock",
  "LayoutDashboard","MapPin","FormInput","Database","BookOpen","Square","Route",
  "Copy","ToggleLeft","Sparkles","Columns2","Columns3","Smile","Bold","Italic",
  "Underline","Edit3","FolderOpen","ExternalLink","GitFork","Pen","VideoIcon",
  "Link2","CopyPlus","Move","Trash2","Presentation","Wifi","Maximize2","Palette",
  "Lock","Eye","FileEdit","Languages","Upload","FileDown","BarChart3","History",
  "Search","X","Star","MoreHorizontal","Plus","ChevronDown","ChevronUp","ChevronLeft",
  "Settings","User","Users","Home","Bell","Bookmark","AlertCircle","AlertTriangle",
  "Info","HelpCircle","RotateCcw","Download","Share2","Heart","Zap","Target",
  "TrendingUp","TrendingDown","Award","Flag","Gift","Anchor","Archive","ArrowUp",
  "ArrowDown","ArrowLeft","ArrowRight","AtSign","Axe","Backpack","BadgeCheck",
  "Battery","Beaker","Bed","Bike","Binoculars","Bluetooth","Bomb","Book","BookmarkPlus",
  "Brain","Briefcase","Brush","Bug","Building","Bus","Cake","Calculator","CalendarCheck",
  "CalendarClock","CalendarDays","CalendarRange","Camera","Car","Carrot","CassetteTape",
  "Cast","Cat","Charging","ChartArea","ChartBar","ChartLine","ChartPie","ChatCircle",
  "ChatSquare","Check","ChefHat","Cherry","ChevronFirst","ChevronLast","Circle",
  "CircleCheck","CircleDot","CircleEllipsis","CircleUser","CircuitBoard","Clapperboard",
  "ClipboardCheck","ClipboardCopy","ClipboardList","ClipboardPaste","ClipboardPlus",
  "ClipboardX","Clock1","Clock10","Clock11","Clock12","Clock2","Clock3","Clock4",
  "Clock5","Clock6","Clock7","Clock8","Clock9","Cloud","CloudDownload","CloudUpload",
  "Clover","Code2","Codepen","Coffee","Cog","Coins","Columns","Command","Compass",
  "Component","Computer","Contact","Contrast","Cookie","CookingPot","CopyCheck",
  "Copilot","Copyright","CornerDownLeft","CornerDownRight","CornerLeftDown",
  "CornerLeftUp","CornerRightDown","CornerRightUp","CornerUpLeft","CornerUpRight",
  "Cpu","Crab","CreditCard","Crop","Cross","Crosshair","Crown","Cuboid","CupSoda",
  "Currency","CurlyBraces","Cursor","Cylinder","Dashboard","DatabaseBackup","DatabaseZap",
  "Delete","Dessert","Diameter","Diamond","Dice1","Dice2","Dice3","Dice4","Dice5",
  "Dice6","Dices","Diff","Disc","Disc3","DiscAlbum","Divide","Dna","Dock","Dog",
  "DollarSign","Donut","DoorClosed","DoorOpen","Dot","DownloadCloud","DraftingCompass",
  "Drama","Dribbble","Drill","Droplet","Droplets","Drum","Drumstick","Dumbbell",
  "Ear","EarOff","Earth","Eclipse","Egg","EggFried","EggOff","Eject","Ellipsis",
  "EllipsisVertical","Equal","Eraser","Euro","EuroCircle","EuroSquare","Expand",
  "ExternalLink","EyeOff","Facebook","Factory","Fan","FastForward","Feather",
  "Fence","FerrisWheel","Figma","FileArchive","FileAudio","FileAxis3d","FileBadge",
  "FileBadge2","FileBox","FileChart","FileChartColumn","FileChartLine","FileChartPie",
  "FileCheck","FileCheck2","FileClock","FileCode","FileCode2","FileCog","FileDiff",
  "FileDigit","FileDown","FileHeart","FileImage","FileInput","FileJson","FileJson2",
  "FileKey","FileKey2","FileLineChart","FileLock","FileLock2","FileMinus","FileMinus2",
  "FileMusic","FileOutput","FilePen","FilePenLine","FilePieChart","FilePlus","FilePlus2",
  "FileQuestion","FileScan","FileSearch","FileSearch2","FileSliders","FileSpreadsheet",
  "FileStack","FileSymlink","FileTerminal","FileText","FileType","FileUndo","FileUp",
  "FileVideo","FileVolume","FileVolume2","FileWarning","FileX","FileX2","Files",
  "Film","Filter","FilterX","Fingerprint","FireExtinguisher","Fish","FishOff",
  "FishSymbol","FlagOff","FlagTriangleLeft","FlagTriangleRight","Flame","Flashlight",
  "FlashlightOff","FlaskConical","FlaskConicalOff","FlaskRound","FlipHorizontal",
  "FlipVertical","Flower","Flower2","Focus","FoldHorizontal","FoldVertical",
  "Folder","FolderArchive","FolderCheck","FolderClock","FolderClosed","FolderCode",
  "FolderCog","FolderDot","FolderDown","FolderGit","FolderGit2","FolderHeart",
  "FolderInput","FolderKanban","FolderKey","FolderLock","FolderMinus","FolderOpen",
  "FolderOpenDot","FolderOutput","FolderPen","FolderPlus","FolderRoot","FolderSearch",
  "FolderSearch2","FolderSymlink","FolderSync","FolderTree","FolderUp","FolderX",
  "Folders","Footprints","ForkKnife","ForkKnifeCross","Forklift","FormInput","Forward",
  "Frame","Framer","Frown","Fuel","Fullscreen","Funnel","GalleryHorizontal",
  "GalleryHorizontalEnd","GalleryThumbnails","GalleryVertical","GalleryVerticalEnd",
  "Gamepad2","Gamepad","GanttChart","Gauge","Gavel","Gem","Ghost","Gift",
  "GitBranch","GitBranchPlus","GitCommit","GitCompare","GitCompareArrows",
  "GitFork","GitGraph","GitMerge","GitPullRequest","GitPullRequestArrow",
  "GitPullRequestClosed","GitPullRequestCreate","GitPullRequestCreateArrow",
  "GitPullRequestDraft","Github","Gitlab","GlassWater","Glasses","Globe2",
  "GlobeLock","Goal","Golf","Grab","GraduationCap","Grape","Grid2x2","Grid2x2Check",
  "Grid2x2Plus","Grid2x2X","Grid3x3","Grip","GripHorizontal","GripVertical",
  "Group","GroupOff","Guitar","Ham","Hammer","Hand","HandCoins","HandHeart",
  "HandHelping","HandMetal","HandPlatter","Handshake","HardDrive","HardDriveDownload",
  "HardDriveUpload","HardHat","Hash","Hashtag","Hat","HdmiPort","Headphones",
  "Headset","Heart","HeartCrack","HeartHandshake","HeartOff","HeartPulse","Heater",
  "HelpCircle","HelpingHand","Hexagon","Highlighter","History","Home","Hospital",
  "Hotel","Hourglass","IceCreamBowl","IceCreamCone","IdCard","ImageCheck",
  "ImageDown","ImageMinus","ImageOff","ImagePlus","ImageUp","Images","Import",
  "Inbox","IndentDecrease","IndentIncrease","IndianRupee","Infinity","Info",
  "Inspect","InspectionPanel","Instagram","Italic","IterationCcw","IterationCch",
  "JapaneseYen","Joystick","Kanban","Key","KeyRound","KeySquare","Keyboard",
  "KeyboardMusic","Lamp","LampCeiling","LampDesk","LampFloor","LampWallDown",
  "LampWallUp","LandPlot","Landmark","Languages","Laptop","Laptop2","LaptopMinimal",
  "Lasso","LassoSelect","Laugh","Layers","Layers2","Layout","LayoutDashboard",
  "LayoutGrid","LayoutList","LayoutPanelLeft","LayoutPanelTop","LayoutTemplate",
  "Leaf","LeafyGreen","Lego","LetterText","Library","LifeBuoy","Ligature",
  "Lightbulb","LightbulbOff","LineChart","Link","Linkedin","List","ListCheck",
  "ListChecks","ListCollapse","ListEnd","ListFilter","ListMinus","ListMusic",
  "ListOrdered","ListPlus","ListRestart","ListStart","ListTodo","ListTree",
  "ListVideo","ListX","Loader","Loader2","LoaderCircle","LoaderPinwheel",
  "Locate","LocateFixed","LocateOff","Lock","LockKeyhole","LockKeyholeOpen",
  "LockOpen","LogIn","LogOut","Logs","Lollipop","Luggage","Magnet","Mail",
  "MailCheck","MailMinus","MailOpen","MailPlus","MailQuestion","MailSearch",
  "MailWarning","MailX","Mailbox","Mails","Map","MapPin","MapPinCheck",
  "MapPinCheckInside","MapPinHouse","MapPinMinus","MapPinMinusInside","MapPinOff",
  "MapPinPlus","MapPinPlusInside","MapPinX","MapPinXInside","MapPinned","Martini",
  "Maximize","Medal","Megaphone","MegaphoneOff","Meh","MemoryStick","Menu",
  "Merge","MessageCircle","MessageCircleCode","MessageCircleDashed",
  "MessageCircleHeart","MessageCircleMore","MessageCircleOff","MessageCirclePlus",
  "MessageCircleQuestion","MessageCircleReply","MessageCircleX","MessageSquare",
  "MessageSquareCode","MessageSquareDashed","MessageSquareDiff","MessageSquareDot",
  "MessageSquareHeart","MessageSquareLock","MessageSquareMore","MessageSquareOff",
  "MessageSquarePlus","MessageSquareQuote","MessageSquareReply","MessageSquareShare",
  "MessageSquareText","MessageSquareX","MessagesSquare","Mic","MicOff",
  "MicVocal","Microscope","Microchip","Microwave","Milk","Milestone",
  "MilkOff","Minimize","Minimize2","Minus","Monitor","MonitorCheck",
  "MonitorCog","MonitorDot","MonitorDown","MonitorOff","MonitorPause",
  "MonitorPlay","MonitorSmartphone","MonitorSpeaker","MonitorStop",
  "MonitorUp","MonitorX","Moon","MoonStar","MoreHorizontal","MoreVertical",
  "Mountain","MountainSnow","Mouse","MouseOff","MousePointer","MousePointer2",
  "MousePointerBan","MousePointerClick","MousePointerSquareDashed","Move",
  "Move3d","MoveDiagonal","MoveDiagonal2","MoveDown","MoveDownLeft",
  "MoveDownRight","MoveHorizontal","MoveLeft","MoveRight","MoveUp",
  "MoveUpLeft","MoveUpRight","MoveVertical","Music","Music2","Music3",
  "Music4","Navigation","Navigation2","Navigation2Off","NavigationOff",
  "Network","Newspaper","Nfc","Notebook","NotebookPen","NotebookTabs",
  "NotebookText","NotepadText","NotepadTextDashed","Nut","NutOff","Octagon",
  "OctagonAlert","OctagonMinus","OctagonPause","OctagonX","Omega","Option",
  "Orbit","Origami","Outdent","Package","Package2","PackageCheck","PackageMinus",
  "PackageOpen","PackagePlus","PackageSearch","PackageX","PackedBubble",
  "Packing","Pail","PailOff","PaintBucket","PaintRoller","Paintbrush",
  "PaintbrushVertical","Palette","PaletteOff","PanelBottom","PanelBottomClose",
  "PanelBottomDashed","PanelBottomOpen","PanelLeft","PanelLeftClose",
  "PanelLeftDashed","PanelLeftOpen","PanelRight","PanelRightClose",
  "PanelRightDashed","PanelRightOpen","PanelTop","PanelTopClose",
  "PanelTopDashed","PanelTopOpen","PanelsLeftBottom","PanelsRightBottom",
  "PanelsTopLeft","PanelsBottomRight","PanelsBottomLeft","Paperclip",
  "Paperclip","Parentheses","ParkingCircle","ParkingMeter","ParkingSquare",
  "PartyPopper","Passkey","Password","Paste","Pattern","Pause","PcCase",
  "Pen","PenLine","PenOff","PenTool","Pencil","PencilLine","PencilOff",
  "PencilRuler","Pentagon","Percent","PersonStanding","PhilippinePeso",
  "Phone","PhoneCall","PhoneForwarded","PhoneIncoming","PhoneMissed",
  "PhoneOff","PhoneOutgoing","Pi","Piano","Pickaxe","PictureInPicture",
  "PictureInPicture2","PiggyBank","Pilcrow","PilcrowLeft","PilcrowRight",
  "Pill","PillBottle","Pin","PinOff","Pipette","Pizza","Plane","PlaneLanding",
  "PlaneTakeoff","Play","PlayIcon","Plug","Plug2","PlugZap","PlugZap2",
  "Plus","Pocket","PocketKnife","Podcast","Pointer","PointerOff","Popcorn",
  "Popsicle","PoundSterling","Power","PowerOff","Presentation","Printer",
  "Projector","Proportions","Puzzle","QrCode","Quote","Radar","Radiation",
  "Radio","RadioReceiver","RadioTower","Radius","RailSymbol","Rainbow",
  "Rat","Rate","Receipt","ReceiptCent","ReceiptEuro","ReceiptIndianRupee",
  "ReceiptJapaneseYen","ReceiptPoundSterling","ReceiptRussianRuble",
  "ReceiptSwissFranc","ReceiptText","RectangleEllipsis","RectangleHorizontal",
  "RectangleVertical","Recycle","Redo","Redo2","RedoDot","RefreshCcw",
  "RefreshCcwDot","RefreshCw","RefreshCwOff","Refrigerator","Regex","RemoveFormatting",
  "Repeat","Repeat1","Repeat2","Replace","ReplaceAll","Reply","ReplyAll",
  "Rewind","Ribbon","Rocket","RockingChair","RollerCoaster","Rotate3d",
  "RotateCcw","RotateCw","Route","RouteOff","Router","Rows","Rows2",
  "Rows3","Rows4","Rss","Ruler","RulerIcon","RussianRuble","Sailboat",
  "Salad","Sandwich","Satellite","SatelliteDish","Save","SaveAll","SaveOff",
  "Scale","Scale3d","Scaling","Scan","ScanBarcode","ScanEye","ScanFace",
  "ScanLine","ScanQrCode","ScanSearch","ScanText","ScatterChart","School",
  "Scissors","ScissorsLineDashed","ScreenShare","ScreenShareOff","Scroll",
  "ScrollText","Search","SearchCheck","SearchCode","SearchSlash","SearchX",
  "Section","Send","SendHorizontal","SendToBack","SeparatorHorizontal",
  "SeparatorVertical","Server","ServerCog","ServerCrash","ServerOff",
  "Settings","Settings2","Shapes","Share","Share2","Sheet","Shell","Shield",
  "ShieldAlert","ShieldBan","ShieldCheck","ShieldEllipsis","ShieldHalf",
  "ShieldMinus","ShieldOff","ShieldPlus","ShieldQuestion","ShieldX",
  "Ship","ShipWheel","Shirt","ShoppingBag","ShoppingBasket","ShoppingCart",
  "Shovel","ShowerHead","Shrink","Shrub","Shuffle","Sidebar","SidebarClose",
  "SidebarOpen","Sigma","Signpost","SignpostBig","Siren","SkipBack",
  "SkipForward","Skull","Slash","Slice","SlidersHorizontal","SlidersVertical",
  "Smartphone","SmartphoneCharging","SmartphoneNfc","Smile","SmilePlus",
  "Snail","Snake","Snowflake","Sofa","SolarPanel","SortAsc","SortDesc",
  "Spade","Sparkle","Sparkles","Speaker","Speech","SpeechIcon","SpellCheck",
  "SpellCheck2","Spline","Split","Spoon","SprayCan","Sprout","Square",
  "SquareActivity","SquareArrowDown","SquareArrowDownLeft","SquareArrowDownRight",
  "SquareArrowLeft","SquareArrowOutDownLeft","SquareArrowOutDownRight",
  "SquareArrowOutUpLeft","SquareArrowOutUpRight","SquareArrowRight",
  "SquareArrowUp","SquareArrowUpLeft","SquareArrowUpRight","SquareAsterisk",
  "SquareBottomDashedScissors","SquareChartGantt","SquareCheck",
  "SquareCheckBig","SquareChevronDown","SquareChevronLeft","SquareChevronRight",
  "SquareChevronUp","SquareCode","SquareDashed","SquareDashedBottom",
  "SquareDashedBottomCode","SquareDashedKanban","SquareDashedMousePointer",
  "SquareDivide","SquareDot","SquareEqual","SquareFunction","SquareKanban",
  "SquareLibrary","SquareM","SquareMenu","SquareMinus","SquareMousePointer",
  "SquareParking","SquareParkingOff","SquarePen","SquarePercent","SquarePi",
  "SquarePilcrow","SquarePlay","SquarePlus","SquarePower","SquareRadical",
  "SquareRoundCorner","SquareScissors","SquareSigma","SquareSlash",
  "SquareSplitHorizontal","SquareSplitVertical","SquareSquare","SquareStack",
  "SquareTerminal","SquareUser","SquareUserRound","SquareX","Squircle",
  "Squirrel","Stamp","Star","StarHalf","StarOff","Stars","Steam","SteeringWheel",
  "StepBack","StepForward","Stethoscope","Sticker","StickyNote","StopCircle",
  "Store","StretchHorizontal","StretchVertical","Strikethrough","Subscript",
  "Subtitles","Sun","SunDim","SunMedium","SunMoon","SunSnow","Sunrise",
  "Sunset","Superscript","SwatchBook","SwissFranc","SwitchCamera","Sword",
  "Swords","Syringe","Table","Table2","TableCellsMerge","TableCellsSplit",
  "TableColumnsSplit","TableOfContents","TableProperties","TableRowsSplit",
  "Tablet","TabletSmartphone","Tablets","Tag","Tags","Tally1","Tally2","Tally3",
  "Tally4","Tally5","Tangent","Target","Telescope","Tent","TentTree","Terminal",
  "TestTube","TestTubeDiagonal","TestTubes","Text","TextCursor","TextCursorInput",
  "TextQuote","TextSearch","TextSelect","TextSize","Texture","Thermometer","ThermometerIcon",
  "ThumbsDown","ThumbsUp","Ticket","TicketCheck","TicketMinus","TicketPercent",
  "TicketPlus","TicketSlash","TicketX","Tickets","TicketsPlane","Timer","TimerOff",
  "TimerReset","ToggleLeft","ToggleRight","Tornado","Torus","Touchpad",
  "TouchpadOff","TowerControl","ToyBrick","Tractor","TrafficCone","Train",
  "TrainFront","TrainFrontTunnel","TrainTrack","TramFront","Trash","Trash2",
  "TreeDeciduous","TreePine","Trees","Trello","TrendingDown","TrendingUp",
  "Triangle","TriangleAlert","TriangleRight","TriangleDashed","Trophy","Truck",
  "Turtle","Tv","TvMinimal","TvMinimalPlay","Twitch","Twitter","Type",
  "TypeIcon","Umbrella","UmbrellaOff","Underline","Undo","Undo2","UndoDot",
  "UnfoldHorizontal","UnfoldVertical","Ungroup","University","Unlink",
  "Unlink2","Unlock","Unplug","UnplugIcon","Upload","Usb","User","UserCheck",
  "UserCheck","UserCog","UserMinus","UserPen","UserPlus","UserRound",
  "UserRoundCheck","UserRoundCog","UserRoundMinus","UserRoundPen","UserRoundPlus",
  "UserRoundSearch","UserRoundX","UserSearch","UserX","Users","UsersRound",
  "Utensils","UtensilsCrossed","UtilityPole","Variable","Vault","Vegan",
  "VenetianMask","Venus","VenusAndMars","Vibrate","VibrateOff","Video",
  "VideoOff","Videotape","View","Voicemail","Volleyball","Volume",
  "Volume1","Volume2","VolumeIcon","VolumeOff","VolumeX","Vote","Wallet",
  "WalletCards","WalletMinimal","Wallpaper","Wand","WandSparkles","Warehouse",
  "WashingMachine","Watch","Waves","Waypoints","Webcam","Webhook","Weight",
  "Wheat","WheatOff","WholeWord","Wifi","WifiHigh","WifiLow","WifiOff",
  "WifiZero","Wind","Wine","WineOff","Workflow","Worm","WrapText","Wrench",
  "X","Youtube","Zap","ZapOff","ZoomIn","ZoomOut",
];

export const ICON_MAP = new Map();
LUCIDE_ICON_NAMES.forEach(name => ICON_MAP.set(name.toLowerCase(), name));

export function getRecentIcons() { return [..._recentIcons]; }
export function getFavoriteIcons() { return [..._favoriteIcons]; }

export function addRecentIcon(icon) {
  _recentIcons = [icon, ..._recentIcons.filter(i => i !== icon)].slice(0, RECENT_MAX);
  savePersisted(STORAGE_KEY_RECENTS, _recentIcons);
  notifyListeners();
}

export function toggleFavoriteIcon(icon) {
  const idx = _favoriteIcons.indexOf(icon);
  if (idx >= 0) _favoriteIcons.splice(idx, 1);
  else _favoriteIcons.push(icon);
  savePersisted(STORAGE_KEY_FAVORITES, _favoriteIcons);
  notifyListeners();
}

export function isFavoriteIcon(icon) {
  return _favoriteIcons.includes(icon);
}

export function subscribe(fn: () => void) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

function notifyListeners() {
  _listeners.forEach(fn => fn());
}

export function searchEmojis(query) {
  if (!query) return EMOJI_ICONS;
  const q = query.toLowerCase();
  return EMOJI_ICONS.filter(e => {
    try {
      return e.toLowerCase().includes(q);
    } catch {
      const desc = emojiDescriptions[e] || "";
      return desc.includes(q);
    }
  });
}

export const emojiDescriptions = {
  "😀": "grinning face","😃": "grinning face with big eyes","😄": "grinning face with smiling eyes",
  "😁": "beaming face with smiling eyes","😅": "grinning face with sweat","😂": "face with tears of joy",
  "🤣": "rolling on the floor laughing","😊": "smiling face with smiling eyes","😇": "smiling face with halo",
  "🙂": "slightly smiling face","😉": "winking face","😌": "relieved face","😍": "heart eyes",
  "🥰": "smiling face with hearts","😘": "face blowing a kiss","❤️": "red heart","💙": "blue heart",
  "💚": "green heart","💛": "yellow heart","💜": "purple heart","🖤": "black heart",
  "⭐": "star","🌟": "glowing star","✨": "sparkles","🔥": "fire","💡": "light bulb",
  "📝": "memo","💻": "laptop","📱": "mobile phone","⌨️": "keyboard","🖥️": "desktop computer",
  "📷": "camera","🎥": "movie camera","🔧": "wrench","⚙️": "gear","🔗": "link",
  "📎": "paperclip","✂️": "scissors","🔒": "lock","🔓": "unlock","💼": "briefcase",
  "📁": "folder","📂": "open folder","🗂️": "card index dividers","📅": "calendar","📆": "tear off calendar",
  "📊": "bar chart","📈": "chart increasing","📉": "chart decreasing","📋": "clipboard",
  "📌": "pushpin","📍": "round pushpin","🎯": "bullseye","🏆": "trophy","🥇": "1st place medal",
  "🥈": "2nd place medal","🥉": "3rd place medal","🏅": "sports medal","🎖️": "military medal",
  "🎨": "artist palette","🎭": "performing arts","🎤": "microphone","🎧": "headphone",
  "🎵": "musical note","🎶": "musical notes","🎼": "musical score","🎹": "musical keyboard",
  "🥁": "drum","🎷": "saxophone","🎺": "trumpet","🎸": "guitar","🎻": "violin",
  "🧠": "brain","👁️": "eye","👀": "eyes","🗣️": "speaking head","💬": "speech balloon",
  "💭": "thought balloon","📢": "loudspeaker","🔔": "bell","🔕": "bell with slash",
  "⏰": "alarm clock","🕰️": "mantelpiece clock",
  "🌐": "globe with meridians","🗺️": "world map","🧭": "compass","🏔️": "snow capped mountain",
  "⛰️": "mountain","🌋": "volcano","🏕️": "camping","🏖️": "beach","🏜️": "desert",
  "🏝️": "desert island","🏞️": "national park","🏟️": "stadium","🏛️": "classical building",
  "🏗️": "building construction","🧱": "brick","🏘️": "houses","🏚️": "derelict house",
  "🏠": "house","🏡": "house with garden","🏢": "office building","🏣": "japanese post office",
  "🏤": "post office","🏥": "hospital","🏦": "bank","🏨": "hotel","🏩": "love hotel",
  "🏪": "convenience store","🏫": "school","🏬": "department store","🏭": "factory",
  "🏯": "japanese castle","🏰": "castle","💒": "wedding","🗼": "tokyo tower","🗽": "statue of liberty",
  "⛪": "church","🕌": "mosque","🛕": "hindu temple","🕍": "synagogue","⛩️": "shinto shrine",
  "🕋": "kaaba","⛲": "fountain","⛺": "tent","🌁": "foggy","🌃": "night with stars",
  "🏙️": "cityscape","🌄": "sunrise over mountains","🌅": "sunrise","🌆": "cityscape at dusk",
  "🌇": "sunset","🌉": "bridge at night","🎠": "carousel horse","🎡": "ferris wheel",
  "🎢": "roller coaster","💈": "barber pole","🎪": "circus tent","🚂": "locomotive",
  "🚃": "railway car","🚄": "high speed train","🚅": "bullet train","🚆": "train",
  "🚇": "metro","🚈": "light rail","🚉": "station","🚊": "tram","🚝": "monorail",
  "🚞": "mountain railway","🚋": "tram car","🚌": "bus","🚍": "oncoming bus","🚎": "trolleybus",
  "🚐": "minibus","🚑": "ambulance","🚒": "fire engine","🚓": "police car","🚔": "oncoming police car",
  "🚕": "taxi","🚖": "oncoming taxi","🚗": "automobile","🚘": "oncoming automobile","🚙": "sport utility vehicle",
  "🚚": "delivery truck","🚛": "articulated lorry","🚜": "tractor","🏎️": "racing car",
  "🏍️": "motorcycle","🛵": "motor scooter","🛺": "auto rickshaw","🚲": "bicycle",
  "🛴": "kick scooter","🛹": "skateboard","🛼": "roller skate","🚏": "bus stop",
  "🛣️": "motorway","🛤️": "railway track","⛽": "fuel pump","🛳️": "passenger ship",
  "⛴️": "ferry","🛥️": "motor boat","🚢": "ship","✈️": "airplane","🛩️": "small airplane",
  "🛫": "airplane departure","🛬": "airplane arrival","🪂": "parachute","💺": "seat",
  "🚁": "helicopter","🚟": "suspension railway","🚠": "mountain cableway","🚡": "aerial tramway",
  "🛰️": "satellite","🚀": "rocket","🛸": "flying saucer","🛎️": "bellhop bell",
  "🧳": "luggage","⌛": "hourglass","⏳": "hourglass flowing sand","🌡️": "thermometer",
  "☀️": "sun","🪐": "ringed planet",
};

export function getEmojiDescription(emoji) {
  return emojiDescriptions[emoji] || "";
}
