"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users2,
  X,
} from "lucide-react"
import { useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  ScheduleSheet,
  type ScheduleBlock,
} from "./schedule-sheet"
import {
  PickerDialog,
  type PickerGroup,
} from "./picker-dialog"

type PolicyType = "allow" | "block" | "ytrestricted" | "safesearch"

type RuleItem = {
  id: string
  name: string
  type: PolicyType
  typeLabel: string
  badgeClass: string
}

const typeBadgeDefaults: Record<
  PolicyType,
  { label: string; className: string }
> = {
  allow: {
    label: "ALLOW",
    className: "bg-green-700 text-white hover:bg-green-700",
  },
  block: {
    label: "BLOCK",
    className: "bg-red-600 text-white hover:bg-red-600",
  },
  ytrestricted: {
    label: "YT RESTRICTED",
    className: "bg-gray-800 text-white hover:bg-gray-800",
  },
  safesearch: {
    label: "SAFESEARCH",
    className: "bg-blue-800 text-white hover:bg-blue-800",
  },
}

const mockRules: RuleItem[] = [
  {
    id: "rule-1",
    name: "Whitelist",
    type: "allow",
    typeLabel: typeBadgeDefaults.allow.label,
    badgeClass: typeBadgeDefaults.allow.className,
  },
  {
    id: "rule-2",
    name: "Whitelist",
    type: "allow",
    typeLabel: typeBadgeDefaults.allow.label,
    badgeClass: typeBadgeDefaults.allow.className,
  },
  {
    id: "rule-3",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-4",
    name: "YouTube Restricted",
    type: "ytrestricted",
    typeLabel: typeBadgeDefaults.ytrestricted.label,
    badgeClass: typeBadgeDefaults.ytrestricted.className,
  },
  {
    id: "rule-5",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-6",
    name: "Blacklist",
    type: "block",
    typeLabel: typeBadgeDefaults.block.label,
    badgeClass: typeBadgeDefaults.block.className,
  },
  {
    id: "rule-7",
    name: "SafeSearch on Supported Search Engines",
    type: "safesearch",
    typeLabel: typeBadgeDefaults.safesearch.label,
    badgeClass: typeBadgeDefaults.safesearch.className,
  },
]

type CreateRuleTab = "general" | "presets"

type GeneralRuleOption = {
  type: PolicyType
  title: string
  description: string
}

const generalRuleOptions: GeneralRuleOption[] = [
  {
    type: "block",
    title: "",
    description:
      "Block access to categories, apps, and domains.",
  },
  {
    type: "allow",
    title: "",
    description:
      "Whitelist something that is blocked in another rule.",
  },
  {
    type: "ytrestricted",
    title: "",
    description:
      "Enforces restricted mode on YouTube to filter out mature content.",
  },
]

type PresetRuleOption = {
  id: string
  type: PolicyType
  name: string
  description: string
  badgeText?: string
}

const presetRuleOptions: PresetRuleOption[] = [
  {
    id: "pr-safe",
    type: "safesearch",
    name: "Enforce SafeSearch",
    description:
      "Enforces SafeSearch if supported by a search engine.",
    badgeText: "SAFESEARCH",
  },
  {
    id: "pr-adult",
    type: "block",
    name: "Adult Content",
    description:
      "Restrict access to pornographic content and optional sub-categories that are adult themed.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-vpn",
    type: "block",
    name: "VPNs and Proxies",
    description:
      "Restrict access to VPN and Proxy services that can anonymize web traffic.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-apple-maps",
    type: "block",
    name: "Apple Maps Images",
    description: "Block images from displaying in Apple Maps.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-google-maps",
    type: "block",
    name: "Google Maps Images",
    description: "Block images from displaying in Google Maps.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-imsg-gifs",
    type: "block",
    name: "Block GIFs in iMessage",
    description:
      "Block GIFs that can be browsed in iMessage using the #images option.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-twitter-imgs",
    type: "block",
    name: "Twitter (X) Images",
    description:
      "Block profile icons and most embedded images on twitter.com (x.com).",
    badgeText: "BLOCK",
  },
  {
    id: "pr-twitter-vids",
    type: "block",
    name: "Twitter (X) Videos",
    description: "Block most embedded videos on twitter.com (x.com).",
    badgeText: "BLOCK",
  },
  {
    id: "pr-twitch-imgs",
    type: "block",
    name: "Twitch.tv Images",
    description: "Block profile icons and video thumbnails on Twitch.tv.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-spotify-imgs",
    type: "block",
    name: "Spotify Images",
    description:
      "Block most album and playlist images from displaying in Spotify.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-spotify-vids",
    type: "block",
    name: "Spotify Videos",
    description: "Block most video content from playing in Spotify.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-net-downtime",
    type: "block",
    name: "Internet Downtime",
    description:
      "Turn off the Internet at night. Allow specific apps or categories during downtime using an Allow rule.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-security",
    type: "block",
    name: "Security Threats",
    description:
      "Prevent security threats like phishing and less-obvious security risks like new domains.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-yt-imgs",
    type: "block",
    name: "YouTube Images",
    description: "Block YouTube video and shorts thumbnails.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-reddit-media",
    type: "block",
    name: "Reddit Media",
    description: "Block post thumbnails and most embedded media on reddit.com.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-imsg-gifs-2",
    type: "block",
    name: "Block GIFs in iMessage",
    description:
      "Block GIFs that can be browsed in iMessage using the #images option.",
    badgeText: "BLOCK",
  },
  {
    id: "pr-spotlight",
    type: "block",
    name: "Block Spotlight Image Results",
    description:
      "Block images that can be browsed in Spotlight search on both iOS and macOS.",
    badgeText: "BLOCK",
  },
]

const presetBadgeClass: Record<PolicyType, string> = {
  allow: "bg-green-700 text-white hover:bg-green-700",
  block: "bg-red-600 text-white hover:bg-red-600",
  ytrestricted: "bg-gray-800 text-white hover:bg-gray-800",
  safesearch: "bg-blue-800 text-white hover:bg-blue-800",
}


const headerBadgeByType: Record<PolicyType, { text: string; class: string }> = {
  allow: { text: "ALL3W", class: "bg-green-700 text-white hover:bg-green-700" },
  block: { text: "BLOCK", class: "bg-red-600 text-white hover:bg-red-600" },
  ytrestricted: {
    text: "YTRES",
    class: "bg-gray-800 text-white hover:bg-gray-800",
  },
  safesearch: {
    text: "SAFE",
    class: "bg-blue-800 text-white hover:bg-blue-800",
  },
}

type AddAddressMode = "auto" | "address" | "keyword"

type CategoryGroupId = "ads" | "business" | "communication" | "games" | "lifestyle" | "mature" | "newsgov" | "porn" | "security" | "social" | "streaming" | "tech" | "transport"
type AppGroupId = CategoryGroupId
type AudienceGroupId = "email" | "name"

const CATEGORY_GROUPS: PickerGroup<CategoryGroupId>[] = [
  {
    id: "ads",
    label: "ADS",
    items: [
      { id: "cat-ads-adv", label: "Advertisements" },
      { id: "cat-ads-mal", label: "Malvertising" },
    ],
  },
  {
    id: "business",
    label: "BUSINESS & ECONOMY",
    items: [
      { id: "cat-biz-brokerage", label: "Brokerage & Investing" },
      { id: "cat-biz-business", label: "Business" },
      { id: "cat-biz-crypto", label: "Cryptocurrency" },
      { id: "cat-biz-econ", label: "Economy & Finance" },
      { id: "cat-biz-jobs", label: "Job Search" },
      { id: "cat-biz-law", label: "Legal" },
      { id: "cat-biz-realestate", label: "Real Estate" },
    ],
  },
  {
    id: "communication",
    label: "COMMUNICATION",
    items: [
      { id: "cat-com-chat", label: "Chat & Instant Messaging" },
      { id: "cat-com-email", label: "Email" },
      { id: "cat-com-forums", label: "Forums & Message Boards" },
      { id: "cat-com-phone", label: "VOIP & Phone Services" },
    ],
  },
  {
    id: "games",
    label: "GAMES",
    items: [
      { id: "cat-gam-arcade", label: "Arcade & Classics" },
      { id: "cat-gam-casino", label: "Casino & Gambling" },
      { id: "cat-gam-mmo", label: "MMO Games" },
      { id: "cat-gam-moba", label: "MOBA & Competitive" },
      { id: "cat-gam-rpg", label: "RPG Games" },
      { id: "cat-gam-shooter", label: "Shooter Games" },
    ],
  },
  {
    id: "lifestyle",
    label: "LIFESTYLE",
    items: [
      { id: "cat-life-animals", label: "Animals & Pets" },
      { id: "cat-life-astrology", label: "Astrology & Horoscopes" },
      { id: "cat-life-beauty", label: "Beauty & Cosmetics" },
      { id: "cat-life-dating", label: "Dating" },
      { id: "cat-life-diet", label: "Diet & Nutrition" },
      { id: "cat-life-food", label: "Food & Cooking" },
      { id: "cat-life-health", label: "Health & Medicine" },
      { id: "cat-life-hobby", label: "Hobbies & Specialized Interests" },
      { id: "cat-life-military", label: "Military" },
      { id: "cat-life-parenting", label: "Parenting" },
      { id: "cat-life-religion", label: "Religion & Belief" },
      { id: "cat-life-sport", label: "Sports" },
      { id: "cat-life-travel", label: "Travel" },
      { id: "cat-life-vehicles", label: "Vehicles" },
    ],
  },
  {
    id: "newsgov",
    label: "NEWS & GOVERNMENT",
    items: [
      { id: "cat-ng-gov", label: "Government" },
      { id: "cat-ng-news", label: "News & Newspapers" },
      { id: "cat-ng-pol", label: "Politics" },
    ],
  },
  {
    id: "social",
    label: "SOCIAL",
    items: [
      { id: "cat-soc-social", label: "Social Networking" },
      { id: "cat-soc-blog", label: "Weblogs, Forums, Personal Sites" },
    ],
  },
  {
    id: "streaming",
    label: "STREAMING & ENTERTAINMENT",
    items: [
      { id: "cat-stream-movies", label: "Movies & Television" },
      { id: "cat-stream-music", label: "Music & Audio Streaming" },
      { id: "cat-stream-video", label: "Online Video (YouTube, TikTok...)" },
    ],
  },
  {
    id: "tech",
    label: "TECHNOLOGY",
    items: [
      { id: "cat-tech-dev", label: "Developer Tools & Resources" },
      { id: "cat-tech-hardware", label: "Hardware, Software, Consumer Tech" },
      { id: "cat-tech-cloud", label: "Cloud Services & Storage" },
    ],
  },
]

const APP_GROUPS: PickerGroup<AppGroupId>[] = [
  {
    id: "ads",
    label: "ADS",
    items: [
      { id: "app-ads-adv", label: "Advertisements" },
    ],
  },
  {
    id: "business",
    label: "BUSINESS & ECONOMY",
    items: [
      { id: "app-biz-robinhood", label: "Robinhood" },
      { id: "app-biz-etrade", label: "E*TRADE" },
      { id: "app-biz-coinbase", label: "Coinbase" },
      { id: "app-biz-binance", label: "Binance" },
      { id: "app-biz-linkedin", label: "LinkedIn" },
      { id: "app-biz-indeed", label: "Indeed" },
      { id: "app-biz-zillow", label: "Zillow" },
      { id: "app-biz-gmail-business", label: "Google Workspace" },
      { id: "app-biz-outlook-business", label: "Microsoft 365" },
      { id: "app-biz-slack", label: "Slack" },
      { id: "app-biz-zoom", label: "Zoom" },
      { id: "app-biz-dropbox", label: "Dropbox" },
    ],
  },
  {
    id: "communication",
    label: "COMMUNICATION",
    items: [
      { id: "app-com-discord", label: "Discord" },
      { id: "app-com-imessage", label: "iMessage" },
      { id: "app-com-signal", label: "Signal" },
      { id: "app-com-telegram", label: "Telegram" },
      { id: "app-com-whatsapp", label: "WhatsApp" },
      { id: "app-com-messenger", label: "Facebook Messenger" },
      { id: "app-com-wechat", label: "WeChat" },
      { id: "app-com-gmail", label: "Gmail" },
      { id: "app-com-outlook", label: "Microsoft Outlook" },
      { id: "app-com-yahoo-mail", label: "Yahoo Mail" },
      { id: "app-com-mail", label: "Apple Mail" },
      { id: "app-com-protonmail", label: "Proton Mail" },
      { id: "app-com-threads", label: "Threads" },
    ],
  },
  {
    id: "games",
    label: "GAMES",
    items: [
      { id: "app-gam-roblox", label: "Roblox" },
      { id: "app-gam-minecraft", label: "Minecraft" },
      { id: "app-gam-fortnite", label: "Fortnite" },
      { id: "app-gam-pubg", label: "PUBG Mobile" },
      { id: "app-gam-candy-crush", label: "Candy Crush Saga" },
      { id: "app-gam-clash-clans", label: "Clash of Clans" },
      { id: "app-gam-genshin", label: "Genshin Impact" },
      { id: "app-gam-cod-mobile", label: "Call of Duty Mobile" },
      { id: "app-gam-brawl-stars", label: "Brawl Stars" },
      { id: "app-gam-among-us", label: "Among Us" },
      { id: "app-gam-pokemon-go", label: "Pokémon GO" },
      { id: "app-gam-pokerstars", label: "PokerStars" },
    ],
  },
  {
    id: "lifestyle",
    label: "LIFESTYLE",
    items: [
      { id: "app-life-tinder", label: "Tinder" },
      { id: "app-life-hinge", label: "Hinge" },
      { id: "app-life-bumble", label: "Bumble" },
      { id: "app-life-grindr", label: "Grindr" },
      { id: "app-life-instacart", label: "Instacart" },
      { id: "app-life-ubereats", label: "Uber Eats" },
      { id: "app-life-doordash", label: "DoorDash" },
      { id: "app-life-recipe", label: "Allrecipes" },
      { id: "app-life-myfitnesspal", label: "MyFitnessPal" },
      { id: "app-life-headspace", label: "Headspace" },
      { id: "app-life-calm", label: "Calm" },
      { id: "app-life-strava", label: "Strava" },
      { id: "app-life-nike-run", label: "Nike Run Club" },
    ],
  },
  {
    id: "security",
    label: "SECURITY THREATS",
    items: [
      { id: "app-sec-vpn-nord", label: "NordVPN" },
      { id: "app-sec-vpn-express", label: "ExpressVPN" },
      { id: "app-sec-vpn-surfshark", label: "Surfshark" },
      { id: "app-sec-vpn-proton", label: "ProtonVPN" },
      { id: "app-sec-vpn-hola", label: "Hola VPN" },
      { id: "app-sec-tor", label: "Tor Browser" },
      { id: "app-sec-phish", label: "Known Phishing Hosts" },
      { id: "app-sec-malware", label: "Malware & Ransomware" },
    ],
  },
  {
    id: "social",
    label: "SOCIAL",
    items: [
      { id: "app-soc-facebook", label: "Facebook" },
      { id: "app-soc-instagram", label: "Instagram" },
      { id: "app-soc-twitter", label: "Twitter / X" },
      { id: "app-soc-tiktok", label: "TikTok" },
      { id: "app-soc-snapchat", label: "Snapchat" },
      { id: "app-soc-reddit", label: "Reddit" },
      { id: "app-soc-tumblr", label: "Tumblr" },
      { id: "app-soc-pinterest", label: "Pinterest" },
      { id: "app-soc-linkedin2", label: "LinkedIn" },
      { id: "app-soc-bluesky", label: "Bluesky" },
      { id: "app-soc-mastodon", label: "Mastodon" },
      { id: "app-soc-flickr", label: "Flickr" },
    ],
  },
  {
    id: "streaming",
    label: "STREAMING & ENTERTAINMENT",
    items: [
      { id: "app-stream-netflix", label: "Netflix" },
      { id: "app-stream-disney", label: "Disney+" },
      { id: "app-stream-amazon-prime", label: "Amazon Prime Video" },
      { id: "app-stream-hbo", label: "Max / HBO Max" },
      { id: "app-stream-hulu", label: "Hulu" },
      { id: "app-stream-paramount", label: "Paramount+" },
      { id: "app-stream-apple-tv", label: "Apple TV+" },
      { id: "app-stream-peacock", label: "Peacock" },
      { id: "app-stream-spotify", label: "Spotify" },
      { id: "app-stream-apple-music", label: "Apple Music" },
      { id: "app-stream-soundcloud", label: "SoundCloud" },
      { id: "app-stream-tidal", label: "TIDAL" },
      { id: "app-stream-youtube", label: "YouTube" },
      { id: "app-stream-twitch", label: "Twitch" },
      { id: "app-stream-vimeo", label: "Vimeo" },
      { id: "app-stream-plex", label: "Plex" },
      { id: "app-stream-crunchyroll", label: "Crunchyroll" },
    ],
  },
  {
    id: "tech",
    label: "TECHNOLOGY",
    items: [
      { id: "app-tech-github", label: "GitHub" },
      { id: "app-tech-gitlab", label: "GitLab" },
      { id: "app-tech-stackoverflow", label: "Stack Overflow" },
      { id: "app-tech-chatgpt", label: "ChatGPT / OpenAI" },
      { id: "app-tech-google-search", label: "Google Search" },
      { id: "app-tech-bing", label: "Bing" },
      { id: "app-tech-duckduckgo", label: "DuckDuckGo" },
      { id: "app-tech-app-store", label: "App Store" },
      { id: "app-tech-google-play", label: "Google Play Store" },
    ],
  },
  {
    id: "transport",
    label: "TRANSPORTATION",
    items: [
      { id: "app-tr-uber", label: "Uber" },
      { id: "app-tr-lyft", label: "Lyft" },
      { id: "app-tr-google-maps", label: "Google Maps" },
      { id: "app-tr-apple-maps", label: "Apple Maps" },
      { id: "app-tr-waze", label: "Waze" },
    ],
  },
]

const AUDIENCE_GROUPS: PickerGroup<AudienceGroupId>[] = [
  {
    id: "email",
    label: "LOGIN EMAIL",
    items: [
      { id: "aud-email-1", label: "abcd@gmail.com" },
      { id: "aud-email-2", label: "sarah.smith@yahoo.com" },
      { id: "aud-email-3", label: "mike.jones@outlook.com" },
      { id: "aud-email-4", label: "emma.wilson@proton.me" },
      { id: "aud-email-5", label: "admin@company.co" },
    ],
  },
  {
    id: "name",
    label: "MEMBERS",
    items: [
      { id: "aud-name-1", label: "Sarah Smith" },
      { id: "aud-name-2", label: "Mike Jones" },
      { id: "aud-name-3", label: "Emma Wilson" },
      { id: "aud-name-4", label: "Family — Kids" },
      { id: "aud-name-5", label: "Work Devices" },
      { id: "aud-name-6", label: "Guest Wi-Fi" },
    ],
  },
]

type PickedItem = {
  id: string
  label: string
  groupLabel: string
}

type Props = {
  policyId: string
}

export function PolicyDetail({ policyId }: Props) {
  const router = useRouter()
  const idCounterRef = useRef(100)
  const nextId = (prefix: string) => {
    idCounterRef.current += 1
    const c = idCounterRef.current
    return `${prefix}-${c}-${(c * 7919) % 100000}`
  }
  const [rulesList, setRulesList] = useState<RuleItem[]>(mockRules)
  const [selectedRuleId, setSelectedRuleId] = useState(mockRules[0].id)
  const [isActive, setIsActive] = useState(true)
  const [webAddresses, setWebAddresses] = useState([
    { id: "wa-1", tag: "M3 MAIN", url: "reallifeos.com" },
  ])

  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false)
  const [addressInput, setAddressInput] = useState(
    "facebook.com, messenger.facebook.com, face"
  )
  const [addressError, setAddressError] = useState("Value is required")
  const [addressMode, setAddressMode] =
    useState<AddAddressMode>("auto")
  const [pendingAddresses, setPendingAddresses] = useState<
    { id: string; url: string; mode: AddAddressMode; selected: boolean }[]
  >([])

  const selectedRule =
    rulesList.find((r) => r.id === selectedRuleId) ?? rulesList[0] ?? mockRules[0]

  const headerBadge = headerBadgeByType[selectedRule.type]

  const removeWebAddress = (id: string) => {
    setWebAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  const handleDetectAddresses = () => {
    if (!addressInput.trim()) {
      setAddressError("Value is required")
      setPendingAddresses([])
      return
    }
    setAddressError("")
    const parts = addressInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const detected = parts.map((part, idx) => ({
      id: nextId("pa"),
      url: part,
      mode: addressMode,
      selected: true,
    }))
    setPendingAddresses(detected)
  }

  const togglePendingSelection = (id: string) => {
    setPendingAddresses((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, selected: !p.selected } : p
      )
    )
  }

  const addSelectedAddresses = () => {
    const selected = pendingAddresses.filter((p) => p.selected)
    if (selected.length === 0) return
    setWebAddresses((prev) => [
      ...prev,
      ...selected.map((p) => ({
        id: nextId("wa"),
        tag:
          p.mode === "keyword"
            ? "KEYWORD"
            : p.mode === "address"
            ? "MANUAL"
            : "AUTO",
        url: p.url,
      })),
    ])
    setPendingAddresses([])
    setAddressInput("")
    setIsAddAddressOpen(false)
  }

  const hasAnyPendingSelected = pendingAddresses.some((p) => p.selected)

  // ========== Create Rule modal state ==========
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false)
  const [createRuleTab, setCreateRuleTab] =
    useState<CreateRuleTab>("general")
  const [presetSearch, setPresetSearch] = useState("")

  // ========== Categories, Apps, Audience per rule ==========
  const [categoriesByRule, setCategoriesByRule] = useState<
    Record<string, PickedItem[]>
  >({})
  const [appsByRule, setAppsByRule] = useState<Record<string, PickedItem[]>>({})
  const [audienceByRule, setAudienceByRule] = useState<
    Record<string, PickedItem[]>
  >({})

  const currentCategories = categoriesByRule[selectedRuleId] ?? []
  const currentApps = appsByRule[selectedRuleId] ?? []
  const currentAudience = audienceByRule[selectedRuleId] ?? []

  // Picker open states
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false)
  const [isAudiencePickerOpen, setIsAudiencePickerOpen] = useState(false)
  const [categoryPickerKey, setCategoryPickerKey] = useState(0)
  const [appPickerKey, setAppPickerKey] = useState(0)
  const [audiencePickerKey, setAudiencePickerKey] = useState(0)

  // Group label lookup helpers
  const catGroupLabelById = (id: CategoryGroupId) =>
    CATEGORY_GROUPS.find((g) => g.id === id)?.label ?? ""
  const appGroupLabelById = (id: AppGroupId) =>
    APP_GROUPS.find((g) => g.id === id)?.label ?? ""
  const audGroupLabelById = (id: AudienceGroupId) =>
    AUDIENCE_GROUPS.find((g) => g.id === id)?.label ?? ""

  const handleCategorySelected = (item: {
    id: string
    label: string
    groupId: CategoryGroupId
  }) => {
    if (currentCategories.some((c) => c.id === item.id)) return
    setCategoriesByRule((prev) => ({
      ...prev,
      [selectedRuleId]: [
        ...(prev[selectedRuleId] ?? []),
        { id: item.id, label: item.label, groupLabel: catGroupLabelById(item.groupId) },
      ],
    }))
  }
  const removeCategory = (id: string) => {
    setCategoriesByRule((prev) => ({
      ...prev,
      [selectedRuleId]: (prev[selectedRuleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  const handleAppSelected = (item: {
    id: string
    label: string
    groupId: AppGroupId
  }) => {
    if (currentApps.some((c) => c.id === item.id)) return
    setAppsByRule((prev) => ({
      ...prev,
      [selectedRuleId]: [
        ...(prev[selectedRuleId] ?? []),
        { id: item.id, label: item.label, groupLabel: appGroupLabelById(item.groupId) },
      ],
    }))
  }
  const removeApp = (id: string) => {
    setAppsByRule((prev) => ({
      ...prev,
      [selectedRuleId]: (prev[selectedRuleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  const handleAudienceSelected = (item: {
    id: string
    label: string
    groupId: AudienceGroupId
  }) => {
    if (currentAudience.some((c) => c.id === item.id)) return
    setAudienceByRule((prev) => ({
      ...prev,
      [selectedRuleId]: [
        ...(prev[selectedRuleId] ?? []),
        { id: item.id, label: item.label, groupLabel: audGroupLabelById(item.groupId) },
      ],
    }))
  }
  const removeAudience = (id: string) => {
    setAudienceByRule((prev) => ({
      ...prev,
      [selectedRuleId]: (prev[selectedRuleId] ?? []).filter((c) => c.id !== id),
    }))
  }

  // ========== Schedule sheet state ==========
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<"add" | "edit">("add")
  const [schedulesByRule, setSchedulesByRule] = useState<
    Record<string, ScheduleBlock[]>
  >({})
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [scheduleSheetKey, setScheduleSheetKey] = useState(0)

  const currentSchedules = schedulesByRule[selectedRuleId] ?? []

  const openAddSchedule = () => {
    setScheduleMode("add")
    setEditingScheduleId(null)
    setScheduleSheetKey((k) => k + 1)
    setIsScheduleSheetOpen(true)
  }

  const openEditSchedule = (scheduleId: string) => {
    setScheduleMode("edit")
    setEditingScheduleId(scheduleId)
    setScheduleSheetKey((k) => k + 1)
    setIsScheduleSheetOpen(true)
  }

  const handleSaveSchedules = (blocks: ScheduleBlock[]) => {
    setSchedulesByRule((prev) => ({
      ...prev,
      [selectedRuleId]: blocks,
    }))
  }

  const removeScheduleItem = (scheduleId: string) => {
    setSchedulesByRule((prev) => ({
      ...prev,
      [selectedRuleId]:
        prev[selectedRuleId]?.filter((s) => s.id !== scheduleId) ?? [],
    }))
  }

  const buildRuleFromType = (type: PolicyType, nameHint?: string): RuleItem => {
    const defaults = typeBadgeDefaults[type]
    let name = nameHint ?? ""
    if (!name) {
      if (type === "allow") name = "Whitelist"
      else if (type === "block") name = "Blacklist"
      else if (type === "ytrestricted") name = "YouTube Restricted"
      else name = "SafeSearch on Supported Search Engines"
    }
    return {
      id: nextId("rule"),
      name,
      type,
      typeLabel: defaults.label,
      badgeClass: defaults.className,
    }
  }

  const handleCreateFromGeneral = (type: PolicyType) => {
    const newRule = buildRuleFromType(type)
    setRulesList((prev) => [...prev, newRule])
    setSelectedRuleId(newRule.id)
    setIsCreateRuleOpen(false)
  }

  const handleCreateFromPreset = (preset: PresetRuleOption) => {
    const newRule = buildRuleFromType(preset.type, preset.name)
    setRulesList((prev) => [...prev, newRule])
    setSelectedRuleId(newRule.id)
    setIsCreateRuleOpen(false)
  }

  const filteredPresets = presetRuleOptions.filter((p) => {
    if (!presetSearch.trim()) return true
    const q = presetSearch.trim().toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-brand-text-muted hover:text-brand-text-heading"
          onClick={() => router.push("/content-policies")}
        >
          <ArrowLeft className="size-4" />
          All Policies
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-brand-text-heading md:text-[28px] md:leading-tight">
            Content Policy
          </h1>
        </div>
      </div>

      <div className="grid gap-0 rounded-xl border border-border/60 bg-white lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
        {/* Left sidebar: Rules list */}
        <div className="border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-text-muted">
              Rules
            </span>
            <Dialog
              open={isCreateRuleOpen}
              onOpenChange={setIsCreateRuleOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="default"
                  className="h-9 gap-2 px-4 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
                >
                  <Plus className="size-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent
                showCloseButton
                className="max-w-[560px] p-0 sm:max-w-[560px] shadow-2xl ring-0"
              >
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <DialogTitle className="text-xl font-bold text-brand-text-heading tracking-tight">
                    Create a New Rule
                  </DialogTitle>
                </div>

                {/* 2 Tabs: General / Presets */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
                    {(
                      [
                        { key: "general", label: "General" },
                        { key: "presets", label: "Presets" },
                      ] as { key: CreateRuleTab; label: string }[]
                    ).map((tab) => {
                      const active = createRuleTab === tab.key
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setCreateRuleTab(tab.key)}
                          className={cn(
                            "rounded-md py-2.5 text-sm font-medium transition-all",
                            active
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-brand-text-heading hover:bg-gray-200/60"
                          )}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tab content */}
                <div className="px-6 pb-5">
                  {createRuleTab === "general" ? (
                    <div className="space-y-3">
                      {generalRuleOptions.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleCreateFromGeneral(opt.type)}
                          className="group relative flex w-full items-start justify-between gap-3 rounded-md border border-border/70 bg-white p-4 text-left transition-all hover:border-brand-primary/40 hover:bg-brand-primary/[0.03]"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <Badge
                              className={cn(
                                "rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wider",
                                presetBadgeClass[opt.type]
                              )}
                            >
                              {typeBadgeDefaults[opt.type].label}
                            </Badge>
                            <p className="text-sm leading-relaxed text-brand-text-muted">
                              {opt.description}
                            </p>
                          </div>
                          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-brand-primary transition-colors group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-white">
                            <ArrowUpRight className="size-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-text-muted" />
                        <Input
                          value={presetSearch}
                          onChange={(e) => setPresetSearch(e.target.value)}
                          placeholder="Search presets"
                          className="h-11 border-0 bg-gray-50 pl-10 text-sm focus-visible:ring-0 focus-visible:border-brand-primary/50"
                        />
                      </div>
                      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                        {filteredPresets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-sm text-brand-text-muted">
                            No presets match your search.
                          </div>
                        ) : (
                          filteredPresets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleCreateFromPreset(p)}
                              className="group relative flex w-full items-start justify-between gap-3 rounded-md border border-border/70 bg-white p-3.5 text-left transition-all hover:border-brand-primary/40 hover:bg-brand-primary/[0.03]"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <Badge
                                  className={cn(
                                    "rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                                    presetBadgeClass[p.type]
                                  )}
                                >
                                  {p.badgeText ??
                                    typeBadgeDefaults[p.type].label}
                                </Badge>
                                <p className="truncate text-sm font-semibold text-brand-text-heading">
                                  {p.name}
                                </p>
                                <p className="text-xs leading-relaxed text-brand-text-muted">
                                  {p.description}
                                </p>
                              </div>
                              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 text-brand-primary transition-colors group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-white">
                                <ArrowUpRight className="size-3.5" />
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
            {rulesList.map((rule, idx) => {
              const isSelected = rule.id === selectedRuleId
              return (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={cn(
                    "group relative flex items-start gap-3 px-4 py-3.5 text-left transition-colors w-full",
                    isSelected
                      ? "bg-brand-primary/5"
                      : "hover:bg-muted/40"
                  )}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-brand-primary" />
                  )}
                  {idx === 0 && isSelected && (
                    <span className="hidden lg:block absolute inset-x-0 top-0 h-px bg-brand-primary/20" />
                  )}
                  <div className="flex flex-1 items-start gap-3 min-w-0">
                    <RuleTypeIcon type={rule.type} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "whitespace-normal break-words text-sm font-medium leading-snug",
                          isSelected
                            ? "text-brand-primary font-semibold"
                            : "text-brand-text-heading"
                        )}
                      >
                        {rule.name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 self-start rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                      rule.badgeClass
                    )}
                  >
                    {rule.typeLabel}
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 self-start lg:hidden",
                      isSelected
                        ? "text-brand-primary"
                        : "text-brand-text-muted"
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Right side: Rule detail */}
        <div className="min-w-0">
          {/* Rule header */}
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[11px] font-bold tracking-wider",
                  headerBadge.class
                )}
              >
                {headerBadge.text}
              </Badge>
              <h2 className="text-lg font-semibold text-brand-text-heading">
                {selectedRule.name}
              </h2>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-brand-text-muted hover:text-brand-text-heading"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-medium text-brand-text-heading">
                Active
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  isActive ? "bg-brand-primary" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform",
                    isActive ? "translate-x-5" : "translate-x-0.5"
                  )}
                >
                  {isActive && (
                    <Check className="absolute inset-0 m-auto size-3.5 text-brand-primary" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Rule sections */}
          <div className="space-y-8 px-5 py-6">
            {/* Categories */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Categories
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentCategories.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategoryPickerKey((k) => k + 1)
                    setIsCategoryPickerOpen(true)
                  }}
                  className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                >
                  <Plus className="size-3.5" />
                  Add category
                </Button>
              </div>

              {currentCategories.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-10"
                    >
                      <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
                      <circle cx="18" cy="5" r="2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No categories yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    Select a category to allow
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentCategories.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeCategory(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove category"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Apps */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Apps
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentApps.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAppPickerKey((k) => k + 1)
                    setIsAppPickerOpen(true)
                  }}
                  className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                >
                  <Plus className="size-3.5" />
                  Add app
                </Button>
              </div>

              {currentApps.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-10"
                    >
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No apps yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    Select an app to allow
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentApps.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                  </svg>
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeApp(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove app"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Web addresses */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Web addresses
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({webAddresses.length})
                  </span>
                </div>
                <Dialog open={isAddAddressOpen} onOpenChange={setIsAddAddressOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                    >
                      <Plus className="size-3.5" />
                      Add address
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    showCloseButton
                    className="max-w-[620px] p-0 sm:max-w-[620px] shadow-2xl ring-0"
                  >
                    <div className="flex items-center justify-between px-6 pt-6 pb-4">
                      <DialogTitle className="text-xl font-bold text-brand-text-heading tracking-tight">
                        Add an web address
                      </DialogTitle>
                    </div>

                    <div className="px-6 pb-4 space-y-4">
                      {/* Input + Add button row */}
                      <div className="space-y-2">
                        <div className="flex w-full items-stretch overflow-hidden rounded-md border-2 border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20">
                          <Input
                            value={addressInput}
                            onChange={(e) => {
                              setAddressInput(e.target.value)
                              if (e.target.value.trim()) {
                                setAddressError("")
                              }
                            }}
                            placeholder="e.g. facebook.com, messenger.facebook.com"
                            className="h-12 border-0 bg-white text-base px-4 py-3 text-brand-text-heading placeholder:text-brand-text-placeholder focus-visible:border-0 focus-visible:ring-0"
                          />
                          <Button
                            type="button"
                            onClick={handleDetectAddresses}
                            className="h-auto rounded-none px-6 text-sm font-semibold bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90 shadow-none border-l border-brand-primary/20"
                          >
                            Add
                          </Button>
                        </div>
                        {addressError && (
                          <p className="text-sm font-medium text-red-500 pl-0.5">
                            {addressError}
                          </p>
                        )}
                      </div>

                      {/* Mode tabs */}
                      <div className="flex items-center gap-1 border-b border-border/70">
                        {(
                          [
                            { key: "auto", label: "Auto-Detect" },
                            { key: "address", label: "Address" },
                            { key: "keyword", label: "Keyword" },
                          ] as { key: AddAddressMode; label: string }[]
                        ).map((tab) => {
                          const active = addressMode === tab.key
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setAddressMode(tab.key)}
                              className={cn(
                                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                                active
                                  ? "text-brand-text-heading bg-gray-100 rounded-t-md"
                                  : "text-brand-text-heading hover:bg-gray-50 rounded-t-md"
                              )}
                            >
                              {tab.label}
                              {active && (
                                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand-primary" />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Detected / pending list */}
                      <div className="min-h-[160px] rounded-md">
                        {pendingAddresses.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-10 text-sm text-brand-text-muted">
                            Enter addresses above and click &quot;Add&quot; to
                            preview selections.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {pendingAddresses.map((pa) => (
                              <div
                                key={pa.id}
                                onClick={() => togglePendingSelection(pa.id)}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors",
                                  pa.selected
                                    ? "border-brand-primary/40 bg-brand-primary/5"
                                    : "border-border/70 bg-white hover:border-brand-primary/20 hover:bg-gray-50"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                                    pa.selected
                                      ? "border-brand-primary bg-brand-primary"
                                      : "border-gray-300 bg-white"
                                  )}
                                >
                                  {pa.selected && (
                                    <Check className="size-3.5 text-white" />
                                  )}
                                </div>
                                <span className="font-mono text-sm text-brand-text-heading">
                                  {pa.url}
                                </span>
                                <Badge
                                  className={cn(
                                    "ml-auto rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider",
                                    pa.mode === "keyword"
                                      ? "bg-violet-700 text-white hover:bg-violet-700"
                                      : pa.mode === "address"
                                      ? "bg-blue-700 text-white hover:bg-blue-700"
                                      : "bg-gray-700 text-white hover:bg-gray-700"
                                  )}
                                >
                                  {pa.mode === "keyword"
                                    ? "KEYWORD"
                                    : pa.mode === "address"
                                    ? "ADDRESS"
                                    : "AUTO"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end px-6 py-4 border-t border-border/50 bg-gray-50/40 rounded-b-xl">
                      <Button
                        size="lg"
                        disabled={!hasAnyPendingSelected}
                        onClick={addSelectedAddresses}
                        className={cn(
                          "h-11 gap-2 px-6 text-sm font-semibold shadow-md",
                          hasAnyPendingSelected
                            ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90 shadow-brand-primary/20"
                            : "bg-brand-primary/25 text-white cursor-not-allowed shadow-none hover:bg-brand-primary/25"
                        )}
                      >
                        Add Selections
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                {webAddresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <div className="mb-3 text-brand-text-muted/70">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-10"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-brand-text-heading">
                      No web addresses yet
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-brand-text-muted">
                      Enter a domain or URL to {selectedRule.type === "block" ? "block" : "allow"}
                    </p>
                  </div>
                ) : (
                  webAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded border border-border/60 bg-gray-50 px-2 py-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                            {addr.tag}
                          </span>
                        </div>
                        <span className="truncate font-mono text-sm text-brand-text-heading">
                          {addr.url}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWebAddress(addr.id)}
                        className="shrink-0 rounded-md p-1 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audience */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Audience
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentAudience.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAudiencePickerKey((k) => k + 1)
                    setIsAudiencePickerOpen(true)
                  }}
                  className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                >
                  <Plus className="size-3.5" />
                  Add member
                </Button>
              </div>

              {currentAudience.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <Users2 className="size-10" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No audience yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    <>
                      This rule applies to all members and devices.
                      <br />
                      Select a member to narrow down the scope of this rule.
                    </>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {(() => {
                    const byGroup: Record<string, PickedItem[]> = {}
                    currentAudience.forEach((c) => {
                      const key = c.groupLabel || "OTHERS"
                      if (!byGroup[key]) byGroup[key] = []
                      byGroup[key].push(c)
                    })
                    return Object.keys(byGroup).map((groupLabel) => (
                      <div key={groupLabel} className="px-4 py-3">
                        <div className="mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {groupLabel}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byGroup[groupLabel].map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <Users2 className="size-4" />
                                </div>
                                <p className="text-sm font-semibold text-brand-text-heading truncate">
                                  {c.label}
                                </p>
                              </div>
                              <div className="shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-hover:flex transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => removeAudience(c.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove audience"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Schedules */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-sm font-semibold text-brand-text-heading">
                    Schedules
                  </h3>
                  <span className="text-sm text-brand-text-muted">
                    ({currentSchedules.length})
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddSchedule}
                  className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                >
                  <Plus className="size-3.5" />
                  Add schedule
                </Button>
              </div>

              {currentSchedules.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
                  <div className="mb-3 text-brand-text-muted/70">
                    <CalendarDays className="size-10" />
                  </div>
                  <p className="text-sm font-semibold text-brand-text-heading">
                    No schedule yet
                  </p>
                  <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
                    <>
                      This rule is always active. Add a schedule to
                      <br />
                      scope this rule to a specific day and time
                    </>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-border/70 bg-white divide-y divide-border/50">
                  {/* Group blocks by day */}
                  {(() => {
                    const byDay: Record<number, ScheduleBlock[]> = {}
                    currentSchedules.forEach((s) => {
                      if (!byDay[s.dayIndex]) byDay[s.dayIndex] = []
                      byDay[s.dayIndex].push(s)
                    })
                    const orderedDays = Object.keys(byDay)
                      .map(Number)
                      .sort((a, b) => a - b)

                    return orderedDays.map((dayIdx) => (
                      <div key={dayIdx} className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-text-muted bg-gray-100 px-2.5 py-1 rounded">
                            {DAYS_LABELS[dayIdx]}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {byDay[dayIdx].map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/[0.04] px-3.5 py-2.5 group hover:border-brand-primary/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-primary/15 text-brand-primary">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-4"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-brand-text-heading font-mono">
                                    {formatScheduleRange(s)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => openEditSchedule(s.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                                  aria-label="Edit schedule"
                                  title="Edit"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="size-3.5"
                                  >
                                    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeScheduleItem(s.id)}
                                  className="rounded-md p-1.5 text-brand-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                                  aria-label="Remove schedule"
                                  title="Remove"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            {/* Category Picker */}
            <PickerDialog<CategoryGroupId>
              key={categoryPickerKey}
              open={isCategoryPickerOpen}
              onOpenChange={setIsCategoryPickerOpen}
              searchPlaceholder="Search for a category..."
              groups={CATEGORY_GROUPS}
              selectedIds={currentCategories.map((c) => c.id)}
              onSelect={handleCategorySelected}
            />

            {/* App Picker */}
            <PickerDialog<AppGroupId>
              key={appPickerKey}
              open={isAppPickerOpen}
              onOpenChange={setIsAppPickerOpen}
              searchPlaceholder="Search for a App..."
              groups={APP_GROUPS}
              selectedIds={currentApps.map((c) => c.id)}
              onSelect={handleAppSelected}
            />

            {/* Audience Picker */}
            <PickerDialog<AudienceGroupId>
              key={audiencePickerKey}
              open={isAudiencePickerOpen}
              onOpenChange={setIsAudiencePickerOpen}
              searchPlaceholder="Search for a App..."
              groups={AUDIENCE_GROUPS}
              selectedIds={currentAudience.map((c) => c.id)}
              onSelect={handleAudienceSelected}
            />

            {/* Schedule Sheet (right side) */}
            <ScheduleSheet
              key={scheduleSheetKey}
              open={isScheduleSheetOpen}
              onOpenChange={setIsScheduleSheetOpen}
              mode={scheduleMode}
              initialBlocks={currentSchedules}
              onSave={handleSaveSchedules}
            />

            {/* Save status */}
            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                className="h-11 gap-2 px-5 text-sm font-semibold bg-brand-primary text-brand-primary-foreground shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                All Changes Saved
              </Button>
            </div>
          </div>

          {/* Footer spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

function RuleTypeIcon({ type }: { type: PolicyType }) {
  const classes = "size-5 shrink-0"
  switch (type) {
    case "allow":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
          <ShieldCheck className={classes} />
        </div>
      )
    case "block":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
          <ShieldAlert className={classes} />
        </div>
      )
    case "ytrestricted":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
          <Shield className={classes} />
        </div>
      )
    case "safesearch":
      return (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <ShieldCheck className={classes} />
        </div>
      )
  }
}

const DAYS_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatScheduleRange(s: ScheduleBlock) {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const startTotal = s.startHour * 60 + s.startMinute
  const endTotal = startTotal + s.durationMinutes
  const endH = Math.floor(endTotal / 60) % 24
  const endM = endTotal % 60
  const endHDisplay = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH
  const endSuffix = endH < 12 ? "am" : "pm"
  const startHDisplay = s.startHour === 0 ? 12 : s.startHour > 12 ? s.startHour - 12 : s.startHour
  const startSuffix = s.startHour < 12 ? "am" : "pm"
  return `${startHDisplay}:${pad(s.startMinute)} ${startSuffix} — ${endHDisplay}:${pad(endM)} ${endSuffix}`
}

type SectionBlockProps = {
  title: string
  count: number
  addLabel: string
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptySubtitle: React.ReactNode
}

function SectionBlock({
  title,
  count,
  addLabel,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: SectionBlockProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-sm font-semibold text-brand-text-heading">
            {title}
          </h3>
          <span className="text-sm text-brand-text-muted">({count})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-brand-primary/50 text-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-md border border-border/70 bg-white px-4 py-10 text-center">
        <div className="mb-3 text-brand-text-muted/70">{emptyIcon}</div>
        <p className="text-sm font-semibold text-brand-text-heading">
          {emptyTitle}
        </p>
        <div className="mt-1.5 max-w-md text-sm leading-relaxed text-brand-text-muted">
          {emptySubtitle}
        </div>
      </div>
    </div>
  )
}
